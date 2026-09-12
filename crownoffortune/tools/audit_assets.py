"""Check authored references and report bundle sizes without claiming rendering proof."""
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
assets=ROOT/'assets';ids={};duplicates=[]
def metas(m,p):
    if m.get('uuid'):
        if m['uuid'] in ids:duplicates.append((m['uuid'],str(p)))
        ids[m['uuid']]=p
    for v in m.get('subMetas',{}).values():metas(v,p)
for p in assets.rglob('*.meta'):metas(json.loads(p.read_bytes()),p)
assert not duplicates,duplicates
def refs(v):
    if isinstance(v,dict):
        if '__uuid__' in v:yield v['__uuid__']
        for x in v.values():yield from refs(x)
    elif isinstance(v,list):
        for x in v:yield from refs(x)
report={'prefabs':[]}
for p in [*assets.glob('scenes/*.scene'),*assets.glob('resources/deferred/*.prefab')]:
    doc=json.loads(p.read_bytes());references=set(refs(doc));missing=references-ids.keys();assert not missing,(p,missing)
    if p.suffix=='.prefab':
        root=doc[doc[0]['data']['__id__']]
        ui=next(doc[c['__id__']] for c in root['_components'] if doc[c['__id__']]['__type__']=='cc.UITransform')
        assert (ui['_contentSize']['width'],ui['_contentSize']['height'])==(1136,640),(p,'landscape dimensions')
    for o in doc:
        if o.get('__type__')=='cc.Label':assert o.get('_isSystemFontUsed',True),(p,o)
        if o.get('__type__')=='cc.Sprite':assert o.get('_spriteFrame'),(p,o)
        if o.get('__type__')=='cc.Node':assert o['_layer']==33554432,(p,o['_name'])
    report['prefabs'].append({'path':str(p.relative_to(ROOT)),'objects':len(doc),'assetReferences':len(references),'bytes':p.stat().st_size})
scene=json.loads((assets/'scenes/Crown.scene').read_bytes());assert not any('soundNames'in o for o in scene)
assert len(set(refs(scene)))<=3,'startup scene must remain lightweight'
for p in assets.rglob('*.skel'):
    atlas=p.with_suffix('.atlas');assert atlas.exists(),p
    assert b'\r\r\n' not in atlas.read_bytes(),atlas
    m=json.loads(Path(str(p)+'.meta').read_bytes());imported=ROOT/'library'/m['uuid'][:2]/(m['uuid']+'.json')
    if imported.exists():
        d=json.loads(imported.read_bytes());assert d.get('textures') and all(u in ids for u in refs(d)),p
manifest=json.loads((ROOT/'coderesoures/manifest.json').read_bytes())
for r in manifest:
    assert 'error' not in r,r
    p=ROOT/'coderesoures'/r['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'],p
report['downloadedFiles']=len(manifest)
report['bundles']={}
for d in (ROOT/'build/web-mobile/assets').iterdir():
    if d.is_dir():report['bundles'][d.name]={'bytes':sum(p.stat().st_size for p in d.rglob('*') if p.is_file()),'files':sum(1 for p in d.rglob('*') if p.is_file())}
report['buildBytes']=sum(p.stat().st_size for p in (ROOT/'build/web-mobile').rglob('*') if p.is_file())
(ROOT/'tools/asset-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
