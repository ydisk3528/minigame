"""Catch orphaned components, broken asset bindings, and runtime asset loading."""
import json,re
from pathlib import Path

root=Path(__file__).resolve().parents[1]
assets=root/'assets'; uuids=set()
for p in assets.rglob('*.meta'):
    def collect(v):
        if isinstance(v,dict):
            if isinstance(v.get('uuid'),str):uuids.add(v['uuid'])
            for x in v.values():collect(x)
        elif isinstance(v,list):
            for x in v:collect(x)
    collect(json.loads(p.read_bytes()))
counts={'files':0,'nodes':0,'spriteBindings':0}
for p in list(assets.rglob('*.prefab'))+list(assets.rglob('*.scene')):
    d=json.loads(p.read_bytes());counts['files']+=1
    if p.suffix=='.prefab':
        fileids=set()
        for n in d:
            if n.get('__type__')!='cc.Node':continue
            assert n.get('_prefab'),f'{p.name}: missing PrefabInfo (editor open fails)'
            info=d[n['_prefab']['__id__']]
            assert info['__type__']=='cc.PrefabInfo'
            assert info['root']==d[0]['data'] and info['asset']=={'__id__':0},p
            for entry in [info]+[d[d[r['__id__']]['__prefab']['__id__']] for r in n.get('_components',[])]:
                assert entry['fileId'] and entry['fileId'] not in fileids,p
                fileids.add(entry['fileId'])
    for i,o in enumerate(d):
        if 'music' in o and 'cardSound' in o:
            overlay=d[o['loadingOverlay']['__id__']]
            assert overlay['_name']=='LoadingOverlay' and not overlay['_active'],p
            assert any(d[r['__id__']].get('__type__')=='cc.BlockInputEvents' for r in overlay['_components']),p
            spinner=next(d[r['__id__']] for r in overlay['_children'] if d[r['__id__']]['_name']=='Spinner')
            assert len(spinner['_children'])==12,p
            audio=json.loads((root/'tools/audio-map.json').read_bytes())
            source=d[o['music']['__id__']]
            if p.suffix=='.scene':
                assert o['backgroundMusic'] is None and o['winMusic'] is None and o['cardSound'] is None,p
                assert source['_clip'] is None and not source['_playOnAwake'],p
                assert not o['cards'] and not o['blackRanks'],p
            else:
                assert o['backgroundMusic']['__uuid__']==audio['Base_BG_01'],p
                assert o['winMusic']['__uuid__']==audio['Base_BG_02'],p
                assert source['_clip']==o['backgroundMusic'] and source['_loop'] and source['_playOnAwake'],p
        if o.get('__type__') in ('cc.Node','cc.Scene'):
            counts['nodes']+=1
            for r in o.get('_components',[]):
                c=d[r['__id__']]
                assert c.get('node')=={'__id__':i},f'{p.name}: component {r} points at a different node'
            for r in o.get('_children',[]):
                assert d[r['__id__']].get('_parent')=={'__id__':i},f'{p.name}: wrong child parent'
        if o.get('__type__')=='cc.Sprite' and o.get('_spriteFrame'):
            counts['spriteBindings']+=1
        def validate(v):
            if isinstance(v,dict):
                if '__id__' in v:assert 0<=v['__id__']<len(d),(p,v)
                if '__uuid__' in v:assert v['__uuid__'] in uuids,(p,v)
                for x in v.values():validate(x)
            elif isinstance(v,list):
                for x in v:validate(x)
        validate(o)
for p in (assets/'scripts').glob('*.ts'):
    s=p.read_text(encoding='utf-8')
    assert not re.search(r'loadRemote|loadBundle|assetManager\.load|new\s+Node\s*\(',s),p
    if 'resources.load' in s:
        assert p.name=='OfflineGame.ts' and "resources.load('deferred/'+name,Prefab," in s,p
print('PASS editor references; runtime loading limited to authored deferred prefabs:',counts)
