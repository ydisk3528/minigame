"""Assert first-screen isolation and report referenced source native assets."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets'
index={}
for meta in ASSETS.rglob('*.meta'):
    data=json.loads(meta.read_bytes());path=Path(str(meta)[:-5])
    def register(v):
        if isinstance(v,dict):
            if 'uuid' in v:index[v['uuid']]=path
            for x in v.values():register(x)
        elif isinstance(v,list):
            for x in v:register(x)
    register(data)

def references(v):
    if isinstance(v,str):return {v} if v in index else set()
    if isinstance(v,dict):return set().union(*(references(x) for x in v.values()))
    if isinstance(v,list):return set().union(*(references(x) for x in v))
    return set()

def dependencies(path):
    todo=[path];seen=set()
    while todo:
        p=todo.pop()
        if p in seen:continue
        seen.add(p)
        for q in [p,Path(str(p)+'.meta')]:
            if not q.is_file():continue
            try:doc=json.loads(q.read_bytes())
            except (ValueError,UnicodeDecodeError):continue
            todo.extend(index[u] for u in references(doc) if index[u] not in seen)
        if p.suffix=='.atlas':
            todo.extend(p.parent.glob('*.png'))
    return seen

def main():
    scene=ASSETS/'scenes/Rummy.scene'
    data=json.loads(scene.read_bytes())
    names={o.get('_name') for o in data if o.get('__type__')=='cc.Node'}
    assert not names.intersection({'RummyTable'})
    first=dependencies(scene)
    assert not any(p.suffix in {'.mp3','.ogg','.wav'} or 'resources/deferred' in p.as_posix() for p in first)
    full=dependencies(ROOT/'temp/Rummy-before-loading.scene')
    native=lambda paths:{p for p in paths if p.is_file() and p.suffix in {'.png','.mp3','.ogg','.wav'}}
    first_native=native(first);full_native=native(full)
    table=native(dependencies(ASSETS/'resources/deferred/RummyTable.prefab'))
    report={
        'firstSceneNativeFiles':len(first_native),
        'firstSceneNativeMiB':round(sum(p.stat().st_size for p in first_native)/1024**2,2),
        'previousSceneNativeFiles':len(full_native),
        'previousSceneNativeMiB':round(sum(p.stat().st_size for p in full_native)/1024**2,2),
        'tableOnlyNativeUuids':sorted(json.loads(Path(str(p)+'.meta').read_bytes())['uuid'] for p in table-first_native),
    }
    (ROOT/'tools/loading-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print('PASS first scene has no deferred panels/audio:',{k:v for k,v in report.items() if not isinstance(v,list)})

if __name__=='__main__':main()
