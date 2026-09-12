"""Use recovered original shared UI assets without importing the whole framework."""
import json,shutil
from pathlib import Path
import editor
from recover import expand
ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'coderesoures/recovered-common'
report=json.loads((STAGE/'tools/recovery-report.json').read_bytes())
frames={x['sourceUuid']:x['uuid'] for x in report['sprites']}
sprite_entries={}
for x in report['sprites']:
    if 'jiliMain' in x['path'] or 'en' in Path(x['path']).parts:sprite_entries.setdefault(x['name'],x)
configs={p.parent.name:json.loads(p.read_bytes()) for p in (ROOT/'coderesoures/remote/assets').glob('*/config.*.json')}
paths={}
for bundle,cfg in configs.items():
    for idx,item in cfg['paths'].items():
        if cfg['types'][item[1]]=='cc.Prefab':paths[item[0]]=expand(cfg['uuids'][int(idx)])
def convert(v):
    if isinstance(v,list):return [convert(x) for x in v]
    if not isinstance(v,dict):return v
    if '__uuid__' in v:return {'__uuid__':frames.get(v['__uuid__'],v['__uuid__'])}
    t=v.get('__type__','')
    if t and not t.startswith('cc.') and t not in ['sp.Skeleton','TypedArray']:return None
    o={k:convert(x) for k,x in v.items()}
    if t=='cc.Label':o.update(_isSystemFontUsed=True,_font=None,_fontFamily='Arial')
    if t=='cc.Sprite':o.update(_customMaterial=None,_sizeMode=0)
    if t=='cc.Button':o['clickEvents']=[]
    return o
for p in (STAGE/'tools/reference').rglob('*.json'):
    d=json.loads(p.read_bytes())
    if d[0].get('__type__')!='cc.Prefab':continue
    d=convert(d)
    for n in d:
        if n and n.get('__type__')=='cc.Node':n['_components']=[r for r in n.get('_components',[]) if r and ('__id__' not in r or d[r['__id__']] is not None)]
    editor.raw[p.stem]=d
def original(path):return editor.prefab(paths[path])
known=set()
for m in (ROOT/'assets').rglob('*.meta'):
    try:
        d=json.loads(m.read_bytes());known.add(d.get('uuid'));known.update(x.get('uuid') for x in d.get('subMetas',{}).values())
    except (ValueError,OSError):pass
def copy_sprite(name):
    x=sprite_entries[name]
    if x['uuid'] in known:return x['uuid']
    known.add(x['uuid']);src=STAGE/x['path'];dst=ROOT/'assets/art/common'/src.name;dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(src,dst);shutil.copyfile(Path(str(src)+'.meta'),Path(str(dst)+'.meta'));return x['uuid']
def import_frames(tree):
    used=set()
    def visit(v):
        if isinstance(v,list):
            for x in v:visit(x)
        elif isinstance(v,dict):
            if '__uuid__' in v:used.add(v['__uuid__'])
            for x in v.values():visit(x)
    visit(editor.serialize({'__type__':'cc.Prefab','_name':'Common','data':tree}))
    for x in report['sprites']:
        if x['uuid'] in used and x['uuid'] not in known:
            known.add(x['uuid'])
            src=STAGE/x['path'];dst=ROOT/'assets/art/common'/src.name;dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(src,dst);shutil.copyfile(Path(str(src)+'.meta'),Path(str(dst)+'.meta'));used.remove(x['uuid'])
