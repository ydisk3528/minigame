import json
from pathlib import Path
P=Path(__file__).resolve().parents[1];A=P/'assets'
known=set();duplicates=[]
for p in A.rglob('*.meta'):
 d=json.loads(p.read_bytes())
 def collect(v):
  if isinstance(v,dict):
   if 'uuid'in v:
    if v['uuid'] in known:duplicates.append(v['uuid'])
    known.add(v['uuid'])
   for x in v.values():collect(x)
  elif isinstance(v,list):
   for x in v:collect(x)
 collect(d)
assert not duplicates,duplicates[:5]
missing=[];count=0
for p in list((A/'prefabs/playable').glob('*.prefab'))+list((A/'resources/deferred').glob('*.prefab'))+list((A/'scenes').glob('*.scene')):
 d=json.loads(p.read_bytes());count+=1
 def check(v):
  if isinstance(v,dict):
   if '__id__'in v:assert 0<=v['__id__']<len(d),(p,v)
   if '__uuid__'in v and v['__uuid__'] not in known:missing.append((str(p),v['__uuid__']))
   for x in v.values():check(x)
  elif isinstance(v,list):
   for x in v:check(x)
 check(d)
assert not missing,missing[:10]
scene=json.loads((A/'scenes/TeenPatti.scene').read_bytes());app=next(o for o in scene if 'lobbyRoot'in o)
assert all(not app[k] for k in ['faces','portraits','sounds','soundNames','lobbyRoot','tableRoot','winnerRoot','loseRoot'])
assert sum(o.get('__type__')=='cc.Node' for o in scene)<100
for root in ['dialogRoot','quickSettingRoot']:
 node=scene[app[root]['__id__']];info=scene[node['_prefab']['__id__']]
 assert info['asset']['__uuid__'] in known
for name in ['TeenPattiTable','TeenPattiLobby']:
 data=json.loads((A/'resources/deferred'/(name+'.prefab')).read_bytes());carrier=next(o for o in data if 'portraits'in o)
 assert len(carrier['portraits'])==8
 if name=='TeenPattiTable':assert len(carrier['faces'])==52 and len(carrier['sounds'])==16
print(f'PASS: {count} asset files; lightweight startup scene, deferred bindings, unique UUIDs and valid references')
