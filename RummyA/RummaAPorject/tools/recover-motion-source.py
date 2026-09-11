"""Recover native Cocos animation assets including CCON binary curve data."""
import json,re,struct
from pathlib import Path
P=Path(__file__).resolve().parents[1];R=P.parent
raw=R/'raw/casino-wbgame.jiligames.com/rummy'
sprites=json.loads((P/'tools/recovery-report.json').read_bytes())['sprites']
mapping={x['sourceUuid']:x['uuid'] for x in sprites}
def expand(value):
    h,*suffix=value.split('@');alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    if len(h)==22:
        out=h[:2]
        for i in range(2,22,2):
            a,b=alphabet.index(h[i]),alphabet.index(h[i+1]);out+=f'{a>>2:x}{((a&3)<<2)|(b>>4):x}{b&15:x}'
        h=f'{out[:8]}-{out[8:12]}-{out[12:16]}-{out[16:20]}-{out[20:]}'
    return h+('@'+suffix[0] if suffix else '')
def save(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
formats={'Uint8Array':'B','Int8Array':'b','Uint16Array':'H','Int16Array':'h','Uint32Array':'I','Int32Array':'i','Float32Array':'f','Float64Array':'d'}
animations=[]
for file in raw.rglob('*.cconb'):
    binary=file.read_bytes();length=struct.unpack_from('<I',binary,12)[0];doc=json.loads(binary[16:16+length])
    if not isinstance(doc,list) or doc[0].get('__type__')!='cc.AnimationClip':continue
    start=(16+length+7)//8*8
    chunk=binary[start+4:start+4+struct.unpack_from('<I',binary,start)[0]] if start<len(binary) else b''
    def convert(v):
        if isinstance(v,list):return [convert(x) for x in v]
        if not isinstance(v,dict):return v
        if v.get('__type__')=='TypedArrayRef':
            return {'__type__':'TypedArray','ctor':v['ctor'],'array':list(struct.unpack_from('<'+str(v['length'])+formats[v['ctor']],chunk,v['offset']))}
        if '__uuid__' in v and expand(v['__uuid__']) in mapping:return {'__uuid__':mapping[expand(v['__uuid__'])]}
        return {k:convert(x) for k,x in v.items()}
    name=re.sub(r'[^\w-]','_',doc[0]['_name']);u=file.name.split('.')[0]
    converted=convert(doc)
    omitted=[]
    if name.startswith('Compliment_Wait'):
        # The captured ribbon emitter/material is not yet imported. Keep its raw CCONB
        # intact, but do not bind a runtime curve to a missing component.
        tracks=[]
        for track in converted[0]['_tracks']:
            path=converted[converted[track['__id__']]['_binding']['path']['__id__']]
            if any(isinstance(s,dict) and converted[s['__id__']].get('component')=='cc.ParticleSystem' for s in path['_paths']):
                omitted.append('Sports_Ribbon/cc.ParticleSystem')
            else:tracks.append(track)
        converted[0]['_tracks']=tracks
    out=P/'assets/animations'/f'{name}_{u[:8]}.anim';save(out,converted)
    save(Path(str(out)+'.meta'),{'ver':'2.0.3','importer':'animation-clip','imported':True,'uuid':u,'files':['.json'],'subMetas':{},'userData':{}})
    animations.append({'uuid':u,'name':doc[0]['_name'],'path':str(out.relative_to(P)),'duration':doc[0].get('_duration'),'tracks':len(converted[0].get('_tracks',[])),'omittedTracks':omitted})
source=(raw/'assets/main/index.fa7ac.js').read_text(encoding='utf-8')
matches=list(re.finditer(r'cclegacy\._RF\.push\(\{\},"([^"]+)","([^"]+)"',source));scripts=[]
for i,m in enumerate(matches):
    name=m.group(2);out=R/'analysis/source/classes'/f'{name}.js';out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(source[m.start():matches[i+1].start() if i+1<len(matches) else len(source)],encoding='utf-8')
    scripts.append({'name':name,'id':m.group(1),'sourceOffset':m.start(),'file':str(out)})
save(P/'tools/original-motion-source.json',{'animations':animations,'scripts':scripts})
print('Recovered',len(animations),'animation clips and indexed',len(scripts),'original scripts')
