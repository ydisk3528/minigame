"""Recover B's shipped Cocos data into editable, statically bound editor assets."""
import copy, json, re, struct, uuid
from pathlib import Path
from PIL import Image
from editor_curves import expand_curves

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / 'codesoures/GET-cyh1hmna250.bdlqzy99.com/h5/games/18/18032/fa00246/assets'
ASSETS = PROJECT / 'assets'
ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
REPORT = {'sourceEngine': '3.8.2', 'sprites': [], 'prefabs': [], 'animations': [], 'omittedComponents': {}, 'missingReferences': []}

def expand(s):
    h, *tail = s.split('@')
    if len(h) == 22:
        out = h[:2]
        for i in range(2, 22, 2):
            a, b = ABC.index(h[i]), ABC.index(h[i+1])
            out += f'{a>>2:x}{((a&3)<<2)|(b>>4):x}{b&15:x}'
        h = f'{out[:8]}-{out[8:12]}-{out[12:16]}-{out[16:20]}-{out[20:]}'
    return h + ('@' + tail[0] if tail else '')

def save(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def meta(p, uid, importer, ver='1.1.50'):
    save(Path(str(p)+'.meta'), dict(ver=ver, importer=importer, imported=True, uuid=uid, files=['.json'], subMetas={}, userData={}))

def decode(data, entry):
    instances = [None] * len(entry[0]); pending = {}; owners = list(entry[3])
    def assign(obj, key, value, kind):
        if kind in (0, 7): obj[key] = value
        elif kind == 1:
            if value >= 0: obj[key] = {'__id__': value}
            else: pending[~value] = obj
        elif kind in (2, 3, 9):
            out = [None] * len(value)
            for i, v in enumerate(value): assign(out, i, v, {2:1, 3:6, 9:4}[kind])
            obj[key] = out
        elif kind == 4: obj[key] = record(value)
        elif kind in (5, 8):
            types = [('Vec2','xy'), ('Vec3','xyz'), ('Vec4','xyzw'), ('Quat','xyzw'), ('Color','rgba'), ('Size',['width','height']), ('Rect',['x','y','width','height'])]
            typ, keys = types[value[0]]; values = value[1:]
            if value[0] == 4: values = [(int(values[0]) >> (8*i)) & 255 for i in range(4)]
            obj[key] = {'__type__':'cc.'+typ, **dict(zip(keys, values))}
        elif kind == 6: obj[key] = None; owners[value] = obj
        elif kind == 10: obj[key] = {'__type__':data[3][value[0]], 'content':value[1]}
        elif kind == 11:
            out = copy.deepcopy(value[0])
            for i in range(1,len(value),3): assign(out,value[i],value[i+2],value[i+1])
            obj[key] = out
        elif kind == 12:
            out = [None]*len(value[0])
            for i,v in enumerate(value[0]): assign(out,i,v,value[i+1])
            obj[key] = out
        else: raise ValueError(kind)
    def record(values):
        mask = data[4][values[0]]; cl = data[3][mask[0]]; out = {'__type__':cl[0]}
        for i,v in enumerate(values[1:],1):
            prop = mask[i]; assign(out,cl[1][prop],v,0 if i < mask[-1] else cl[prop+cl[2]])
        return out
    for i,v in enumerate(entry[0]):
        if isinstance(v,list): instances[i] = record(v)
        elif isinstance(v,dict): instances[i] = copy.deepcopy(v)
        else: instances[i] = v
    refs = entry[2]
    if refs:
        boundary = refs[-1]*3
        for i in range(0,len(refs)-1,3):
            owner = pending[i//3] if i < boundary else instances[refs[i]]
            key = data[2][refs[i+1]] if refs[i+1]>=0 else ~refs[i+1]
            owner[key] = {'__id__':refs[i+2]}
    for owner,key,u in zip(owners,entry[4],entry[5]):
        if isinstance(owner,int): owner=instances[owner]
        if isinstance(key,int): key=data[2][key] if key>=0 else ~key
        owner[key]={'__uuid__':expand(data[1][u] if isinstance(u,int) else u)}
    return instances

def image_meta(path, uid, width, height, insets):
    sf = uid+'@f9941'; tex = uid+'@6c48a'
    texture=dict(ver='1.0.22',importer='texture',imported=True,uuid=tex,displayName=path.stem,id='6c48a',name='texture',files=['.json'],subMetas={},userData=dict(wrapModeS='clamp-to-edge',wrapModeT='clamp-to-edge',minfilter='linear',magfilter='linear',mipfilter='none',anisotropy=0,isUuid=True,imageUuidOrDatabaseUri=uid,visible=False))
    frame=dict(ver='1.0.12',importer='sprite-frame',imported=True,uuid=sf,displayName=path.stem,id='f9941',name='spriteFrame',files=['.json'],subMetas={},userData=dict(trimType='none',trimThreshold=1,rotated=False,offsetX=0,offsetY=0,trimX=0,trimY=0,width=width,height=height,rawWidth=width,rawHeight=height,borderLeft=insets[0],borderTop=insets[1],borderRight=insets[2],borderBottom=insets[3],packable=True,pixelsToUnit=100,pivotX=.5,pivotY=.5,meshType=0,isUuid=True,imageUuidOrDatabaseUri=tex,atlasUuid=''))
    save(Path(str(path)+'.meta'),dict(ver='1.0.27',importer='image',imported=True,uuid=uid,files=['.json','.png'],subMetas={'6c48a':texture,'f9941':frame},userData=dict(type='sprite-frame',hasAlpha=True,fixAlphaTransparencyArtifacts=False,redirect=sf)))
    return sf

def main():
    mapping={}; prefabs={}; scenes={}; images={p.stem:p for p in SOURCE.rglob('*') if p.suffix in ('.png','.webp','.jpg')}
    packs=[]
    for bundle in SOURCE.iterdir():
        if not (bundle/'config.json').exists(): continue
        cfg=json.loads((bundle/'config.json').read_bytes())
        for packid,ids in cfg['packs'].items():
            file=next((bundle/'import').rglob(packid+'.json'),None)
            if not file: continue
            data=json.loads(file.read_bytes()); packs.append((bundle,cfg,data,ids))
            for i,entry in enumerate(data[5]):
                first=entry[0][0]; uid=expand(cfg['uuids'][ids[i]])
                if isinstance(first,dict) and 'rect' in first and 'name' in first:
                    ref=entry[5][0]; texture=expand(data[1][ref] if isinstance(ref,int) else ref).split('@')[0]
                    if texture not in images: raise ValueError('Missing atlas '+texture)
                    name=re.sub(r'[^\w-]','_',first['name']); path=ASSETS/'art'/bundle.name/(name+'_'+uid[:8]+'.png')
                    r=first['rect']; x,y,w,h=[int(r[k]) for k in ('x','y','width','height')]
                    im=Image.open(images[texture]).convert('RGBA'); crop=im.crop((x,y,x+(h if first.get('rotated') else w),y+(w if first.get('rotated') else h)))
                    if first.get('rotated'): crop=crop.transpose(Image.Transpose.ROTATE_90)
                    size=first['originalSize']; ow,oh=int(size['width']),int(size['height']); off=first.get('offset',{'x':0,'y':0})
                    canvas=Image.new('RGBA',(ow,oh));canvas.paste(crop,(round((ow-w)/2+off['x']),round((oh-h)/2-off['y'])))
                    path.parent.mkdir(parents=True,exist_ok=True);canvas.save(path)
                    imageuid=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/sprite/'+uid))
                    mapping[uid]=image_meta(path,imageuid,ow,oh,first.get('capInsets',[0]*4))
                    REPORT['sprites'].append(dict(name=first['name'],sourceUuid=uid,uuid=mapping[uid],path=str(path.relative_to(PROJECT)),size=[ow,oh]))
                elif isinstance(first,list):
                    typ=data[3][data[4][first[0]][0]][0]
                    if typ=='sp.SkeletonData':
                        obj=decode(data,entry)[0];folder=ASSETS/'spine'/obj['_name']
                        path=folder/(obj['_name']+'.json');save(path,obj['_skeletonJson']);meta(path,uid,'spine-data','1.2.5')
                        # Preserve atlas page separators; Windows text-mode newline conversion can add blank lines.
                        (folder/(obj['_name']+'.atlas')).write_bytes(obj['_atlasText'].encode('utf-8'))
                        for tex,name in zip(obj['textures'],obj['textureNames']):
                            image=images[tex['__uuid__'].split('@')[0]]
                            Image.open(image).save(folder/name)
                        mapping[uid]=uid
                    if typ in ('cc.Prefab','cc.SceneAsset'):
                        objs=decode(data,entry)
                        (prefabs if typ=='cc.Prefab' else scenes)[uid]=objs
                        save(PROJECT/'tools/reference'/bundle.name/(uid+'.json'),objs)
    formats={'Uint8Array':'B','Int8Array':'b','Uint16Array':'H','Int16Array':'h','Uint32Array':'I','Int32Array':'i','Float32Array':'f','Float64Array':'d'}
    animations={}
    for file in SOURCE.rglob('*.cconb'):
        raw=file.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[16:16+length])
        if not isinstance(doc,list) or doc[0].get('__type__')!='cc.AnimationClip': continue
        start=(16+length+7)//8*8;chunk=raw[start+4:start+4+struct.unpack_from('<I',raw,start)[0]] if start<len(raw) else b''
        def unbin(v):
            if isinstance(v,list):return [unbin(x) for x in v]
            if not isinstance(v,dict):return v
            if v.get('__type__')=='TypedArrayRef':return {'__type__':'TypedArray','ctor':v['ctor'],'array':list(struct.unpack_from('<'+str(v['length'])+formats[v['ctor']],chunk,v['offset']))}
            return {k:unbin(x) for k,x in v.items()}
        uid=expand(file.stem);animations[uid]=unbin(doc);mapping[uid]=uid
    mapping.update({u:u for u in prefabs});mapping.update({u:u for u in scenes})
    omitted=REPORT['omittedComponents']; missing=set()
    def convert(v):
        if isinstance(v,list):return [convert(x) for x in v]
        if not isinstance(v,dict):return v
        if '__uuid__' in v:
            u=expand(v['__uuid__'])
            if u in mapping:return {'__uuid__':mapping[u]}
            missing.add(u);return None
        typ=v.get('__type__','')
        if typ and not (typ.startswith('cc.') or typ.startswith('CC') or typ in ('sp.Skeleton','TypedArray')):
            omitted[typ]=omitted.get(typ,0)+1;return None
        out={k:convert(x) for k,x in v.items()}
        if typ=='cc.Sprite':out['_customMaterial']=None;out['_sizeMode']=0
        if typ=='cc.Label':out.update(_useSystemFont=True,_fontFamily='Arial',_font=None)
        if typ=='cc.Button':out['clickEvents']=[]
        return out
    for uid,objects in prefabs.items():
        objects=convert(objects)
        for o in objects:
            if isinstance(o,dict) and o.get('__type__')=='cc.Node':
                o['_components']=[r for r in o.get('_components',[]) if r and (not '__id__' in r or objects[r['__id__']] is not None)]
        name=objects[0].get('_name','Prefab');path=ASSETS/'prefabs'/f'{name}.prefab'
        save(path,objects);meta(path,uid,'prefab')
        REPORT['prefabs'].append(dict(name=name,uuid=uid,path=str(path.relative_to(PROJECT))))
    for uid,doc in animations.items():
        expand_curves(doc)
        path=ASSETS/'animations'/(re.sub(r'[^\w-]','_',doc[0]['_name'])+'_'+uid[:8]+'.anim')
        save(path,convert(doc));meta(path,uid,'animation-clip','2.0.3');REPORT['animations'].append(str(path.relative_to(PROJECT)))
    REPORT['missingReferences']=sorted(missing)
    save(PROJECT/'tools/recovery-report.json',REPORT)
    print({k:len(v) for k,v in REPORT.items() if isinstance(v,(list,dict))})

if __name__=='__main__': main()
