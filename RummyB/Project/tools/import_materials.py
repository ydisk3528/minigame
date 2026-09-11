"""Restore the shipped additive materials and their sprite bindings."""
import json
from pathlib import Path
from recover_b import SOURCE,PROJECT,ASSETS,decode,expand,save,meta
wanted={'7dc10283-8653-4380-be49-a3d0ecb85b28','de54e3d6-470f-4193-a290-19541426b438'}
for b in SOURCE.iterdir():
 if not (b/'config.json').exists():continue
 cfg=json.loads((b/'config.json').read_bytes())
 for pack,ids in cfg.get('packs',{}).items():
  matches=[(i,expand(cfg['uuids'][uid])) for i,uid in enumerate(ids) if expand(cfg['uuids'][uid]) in wanted]
  if not matches:continue
  d=json.loads(next((b/'import').rglob(pack+'.json')).read_bytes())
  for i,uid in matches:
   doc=decode(d,d[5][i])[0];doc.update(_techIdx=0,_objFlags=0,_native='');p=ASSETS/'materials'/(doc['_name']+'.mtl');save(p,doc);meta(p,uid,'material','1.0.21')
images={s['sourceUuid']:s['uuid'] for s in json.loads((PROJECT/'tools/recovery-report.json').read_bytes())['sprites']};bindings={}
for p in (PROJECT/'tools/reference').glob('*/*.json'):
 d=json.loads(p.read_bytes())
 def visit(v):
  if isinstance(v,list):
   for x in v:visit(x)
  elif isinstance(v,dict):
   mat=(v.get('_customMaterial') or {}).get('__uuid__')
   if v.get('__type__')=='cc.Sprite' and mat in wanted:
    frame=(v.get('_spriteFrame') or {}).get('__uuid__');n=d[v['node']['__id__']]
    if frame in images:bindings[n['_name']+'|'+images[frame]]=mat
   for x in v.values():visit(x)
 visit(d)
save(PROJECT/'tools/material-bindings.json',bindings);print('Restored additive bindings',len(bindings))
