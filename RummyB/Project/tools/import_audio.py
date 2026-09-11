import json,shutil
from recover_b import SOURCE,ASSETS,PROJECT,expand,meta,save

cfg=json.loads((SOURCE/'sound/config.json').read_bytes())
native={p.stem:p for p in (SOURCE/'sound').rglob('*.mp3')}
mapping={}
for key,(name,_) in cfg['paths'].items():
    uid=expand(cfg['uuids'][int(key)])
    path=ASSETS/'audio'/(name+'.mp3');path.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(native[uid],path);meta(path,uid,'audio-clip','1.0.1');mapping[name]=uid
save(PROJECT/'tools/audio-map.json',mapping)
print('Recovered audio:',len(mapping))
