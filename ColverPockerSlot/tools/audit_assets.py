"""Check all scene/playable prefab references against actual imported asset UUIDs."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
uuids=set()
def refs(v):
 if isinstance(v,dict):
  if '__uuid__' in v:yield v['__uuid__']
  for x in v.values():yield from refs(x)
 elif isinstance(v,list):
  for x in v:yield from refs(x)
def metas(v):
 if isinstance(v,dict):
  if 'uuid'in v:uuids.add(v['uuid'])
  for x in v.values():metas(x)
for p in (ROOT/'assets').rglob('*.meta'):metas(json.loads(p.read_bytes()))
files=list((ROOT/'assets/prefabs/playable').glob('*.prefab'))+list((ROOT/'assets/clover').rglob('*.prefab'))+list((ROOT/'assets/scenes').glob('*.scene'))
counts={}
for p in files:
 d=json.loads(p.read_bytes());missing=set(refs(d))-uuids
 assert not missing,(p,missing)
 count=sum(1 for o in d if o.get('__type__')=='cc.Sprite' and o.get('_spriteFrame'))
 assert count>0 or any(o.get('__type__')=='sp.Skeleton' and o.get('_skeletonData') for o in d) or any(o.get('spinner') for o in d),p
 for o in d:
  if o.get('__type__')=='cc.Node':
   for r in o.get('_components',[]):assert 0<=r['__id__']<len(d)
 counts[p.name]=count
print('PASS: all referenced assets exist; bound sprite counts:',counts)
