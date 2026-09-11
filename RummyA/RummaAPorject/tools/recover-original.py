"""One-time asset import. Output is editable Creator assets, not runtime UI code."""
import copy, json, re, uuid
from pathlib import Path
from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parent
ASSETS = PROJECT / 'assets'
BASE = ROOT / 'raw/casino-wbgame.jiligames.com/rummy/assets/game'
config = json.loads(next(BASE.glob('config.*.json')).read_bytes())
pack = json.loads(next((BASE/'import').rglob('0a5a*.json')).read_bytes())
ids = next(iter(config['packs'].values()))
alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

def expand(s):
    head, *suffix = s.split('@')
    if len(head) == 22:
        out = head[:2]
        for i in range(2,22,2):
            a,b=alphabet.index(head[i]),alphabet.index(head[i+1])
            out += f'{a>>2:x}{((a&3)<<2)|(b>>4):x}{b&15:x}'
        head=f'{out[:8]}-{out[8:12]}-{out[12:16]}-{out[16:20]}-{out[20:]}'
    return head + ('@'+suffix[0] if suffix else '')

def save(path, value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

def meta(path,uid,importer):
    save(Path(str(path)+'.meta'),{'ver':{'prefab':'1.1.50','scene':'1.1.50','typescript':'4.0.24'}.get(importer,'1.0.0'),'importer':importer,'imported':True,'uuid':uid,'files':['.json'],'subMetas':{},'userData':{}})

source=(ROOT/'analysis/decode-layout.py').read_text(encoding='utf-8')
decoder=source[source.index('def put('):source.index("(ROOT/'analysis/original-gameview.json')")]
def decode(entry):
    scope={'data':pack,'entry':entry,'instances':[None]*len(entry[0]),'pending':{},'owners':list(entry[3])}
    exec(decoder,scope)
    return scope['instances']

assetmap=json.loads((ROOT/'asset-map.json').read_bytes())
if isinstance(assetmap,dict):
    print('asset map keys',assetmap.keys())
# URL paths in the acquisition manifest are mapped explicitly to raw/.
native={expand(a['uuid']).split('@')[0]:ROOT/'raw'/a['url'].split('://',1)[1].split('?',1)[0] for a in assetmap if a['url'].split('?',1)[0].endswith('.png')}
sprites={}; uuidmap={}; prefabs={}; report={'prefabs':[],'sprites':[],'omittedComponents':{},'missingAssets':[]}
for i,entry in enumerate(pack[5]):
    first=entry[0][0]
    uid=expand(config['uuids'][ids[i]])
    if isinstance(first,dict) and 'rect' in first and 'name' in first:
        ref=entry[5][0]; tex=expand(pack[1][ref] if isinstance(ref,int) else ref).split('@')[0]
        if tex not in native:continue
        name=re.sub(r'[^a-zA-Z0-9_-]','_',first['name'])
        path=ASSETS/'art'/f'{name}_{uid[:8]}.png'
        r=first['rect']; x,y,w,h=[int(r[k]) for k in ('x','y','width','height')]
        im=Image.open(native[tex]).convert('RGBA')
        crop=im.crop((x,y,x+(h if first.get('rotated') else w),y+(w if first.get('rotated') else h)))
        if first.get('rotated'):crop=crop.transpose(Image.Transpose.ROTATE_90)
        size=first['originalSize']; ow,oh=int(size['width']),int(size['height']); off=first.get('offset',{'x':0,'y':0})
        canvas=Image.new('RGBA',(ow,oh));canvas.paste(crop,(round((ow-w)/2+off['x']),round((oh-h)/2-off['y'])))
        path.parent.mkdir(parents=True,exist_ok=True);canvas.save(path)
        imageuid=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy/sprite/'+uid))
        sfuid=imageuid+'@f9941';uuidmap[uid]=sfuid
        sub={'6c48a':{'ver':'1.0.22','importer':'texture','imported':True,'uuid':imageuid+'@6c48a','displayName':name,'id':'6c48a','name':'texture','files':['.json'],'subMetas':{},'userData':{'wrapModeS':'clamp-to-edge','wrapModeT':'clamp-to-edge','minfilter':'linear','magfilter':'linear','mipfilter':'none','anisotropy':0,'isUuid':True,'imageUuidOrDatabaseUri':imageuid,'visible':False}},'f9941':{'ver':'1.0.12','importer':'sprite-frame','imported':True,'uuid':sfuid,'displayName':name,'id':'f9941','name':'spriteFrame','files':['.json'],'subMetas':{},'userData':{'trimType':'none','trimThreshold':1,'rotated':False,'offsetX':0,'offsetY':0,'trimX':0,'trimY':0,'width':ow,'height':oh,'rawWidth':ow,'rawHeight':oh,'borderTop':first.get('capInsets',[0]*4)[1],'borderBottom':first.get('capInsets',[0]*4)[3],'borderLeft':first.get('capInsets',[0]*4)[0],'borderRight':first.get('capInsets',[0]*4)[2],'packable':True,'pixelsToUnit':100,'pivotX':0.5,'pivotY':0.5,'meshType':0,'isUuid':True,'imageUuidOrDatabaseUri':imageuid+'@6c48a','atlasUuid':''}}}
        save(Path(str(path)+'.meta'),{'ver':'1.0.27','importer':'image','imported':True,'uuid':imageuid,'files':['.json','.png'],'subMetas':sub,'userData':{'type':'sprite-frame','hasAlpha':True,'fixAlphaTransparencyArtifacts':False,'redirect':sfuid}})
        sprites[first['name']]={'uuid':sfuid,'path':str(path.relative_to(PROJECT)),'size':[ow,oh]}
        report['sprites'].append({'name':first['name'],'sourceUuid':uid,'uuid':sfuid})
    elif isinstance(first,list) and pack[3][pack[4][first[0]][0]][0]=='cc.Prefab':
        prefabs[uid]=decode(entry)

animations={json.loads(p.read_bytes())['uuid'] for p in (ASSETS/'animations').glob('*.meta')}
allowed={'cc.Animation','cc.Prefab','cc.Node','cc.UITransform','cc.UIOpacity','cc.Sprite','cc.Label','cc.Layout','cc.Widget','cc.Button','cc.Mask','cc.Graphics','cc.BlockInputEvents','cc.ProgressBar','cc.Camera','cc.PrefabInfo','cc.CompPrefabInfo','cc.PrefabInstance','cc.TargetInfo','CCPropertyOverrideInfo','CCMountedChildrenInfo','CCMountedComponentsInfo','cc.PrefabLink'}
def convert(v):
    if isinstance(v,list):return [convert(x) for x in v]
    if not isinstance(v,dict):return v
    if '__ref' in v:return {'__id__':v['__ref']}
    if '__uuid' in v:
        uid=expand(v['__uuid'])
        if uid in uuidmap:return {'__uuid__':uuidmap[uid],'__expectedType__':'cc.SpriteFrame'}
        if uid in prefabs:return {'__uuid__':uid,'__expectedType__':'cc.Prefab'}
        if uid in animations:return {'__uuid__':uid,'__expectedType__':'cc.AnimationClip'}
        return None
    if '__value_type' in v:
        kind=v['__value_type'];val=v['value'];types=[('Vec2','xy'),('Vec3','xyz'),('Vec4','xyzw'),('Quat','xyzw'),('Color','rgba'),('Size',['width','height']),('Rect',['x','y','width','height'])]
        if kind>=len(types):return None
        typ,keys=types[kind]
        if kind==4:val=[(int(val[0])>>(8*i))&255 for i in range(4)]
        return {'__type__':'cc.'+typ,**dict(zip(keys,val))}
    typ=v.get('__type')
    if typ and typ not in allowed:
        report['omittedComponents'][typ]=report['omittedComponents'].get(typ,0)+1
        return None
    out={('__type__' if k=='__type' else k):convert(x) for k,x in v.items() if k not in ('_customMaterial','_font','_fontFamily','clickEvents','_clickEvents')}
    if typ=='cc.Node':
        out['_layer']=33554432;out.setdefault('_name','Node');out.setdefault('_active',True);out.setdefault('_children',[]);out.setdefault('_components',[])
        out.setdefault('_lpos',{'__type__':'cc.Vec3','x':0,'y':0,'z':0});out.setdefault('_lscale',{'__type__':'cc.Vec3','x':1,'y':1,'z':1});out.setdefault('_lrot',{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1});out.setdefault('_euler',{'__type__':'cc.Vec3','x':0,'y':0,'z':0})
    if typ=='cc.Sprite':out['_sizeMode']=0;out['_customMaterial']=None
    if typ=='cc.Label':out['_useSystemFont']=True;out['_fontFamily']='Arial';out['_font']=None
    return out

lang=json.loads((ROOT/'raw/casino-wbgame.jiligames.com/lang/0094/en-us.json').read_bytes())
for uid,objects in prefabs.items():
    for n in objects:
        comps=[objects[c['__ref']] if '__ref' in c else c for c in n.get('_components',[])]
        key=next((c['key'] for c in comps if c and 'key' in c),None)
        if key is not None:
            for c in comps:
                if c and c.get('__type')=='cc.Label':c['_string']=str(lang.get(key,c.get('_string','')))
    result=convert(objects)
    for obj in result:
        if isinstance(obj,dict) and '_components' in obj:
            obj['_components']=[c for c in obj['_components'] if c and ('__id__' not in c or result[c['__id__']] is not None)]
    name=objects[0].get('_name') or objects[1].get('_name') or uid
    name=re.sub(r'[^a-zA-Z0-9_-]','_',name)
    path=ASSETS/'prefabs/original'/f'{name}.prefab'
    if path.exists() and json.loads(Path(str(path)+'.meta').read_bytes())['uuid']!=uid:path=path.with_name(name+'_'+uid[:8]+'.prefab')
    save(path,result);meta(path,uid,'prefab')
    report['prefabs'].append({'name':name,'uuid':uid,'path':str(path.relative_to(PROJECT)),'objects':len(objects)})
save(PROJECT/'tools/recovered-assets.json',{'sprites':sprites,'prefabs':report['prefabs']})
save(PROJECT/'tools/recovery-report.json',report)
print('Recovered',len(report['sprites']),'sprites and',len(prefabs),'prefabs')
for p in report['prefabs']:print(p['name'],p['objects'])
