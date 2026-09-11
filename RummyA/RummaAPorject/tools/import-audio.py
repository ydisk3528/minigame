import json,shutil
from pathlib import Path
P=Path(__file__).resolve().parents[1];R=P.parent
entries=json.loads((R/'asset-map.json').read_bytes());report=[]
for entry in entries:
    if not entry['url'].endswith('.mp3'):continue
    path=P/'assets/audio'/(entry['asset_path'].replace('/','_')+'.mp3');path.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(R/'raw'/entry['url'].split('://',1)[1],path)
    Path(str(path)+'.meta').write_text(json.dumps({'ver':'1.0.0','importer':'audio-clip','imported':True,'uuid':entry['uuid'],'files':['.json','.mp3'],'subMetas':{},'userData':{'downloadMode':0}},indent=2),encoding='utf-8')
    report.append({'name':entry['asset_path'],'uuid':entry['uuid'],'path':str(path.relative_to(P))})
(P/'tools/audio-map.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Imported',len(report),'original audio clips')
