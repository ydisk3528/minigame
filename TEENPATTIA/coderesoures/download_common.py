"""Archive the public shared runtime referenced by Entry.loadLoadingBundle."""
import concurrent.futures,hashlib,json,urllib.request,zipfile
from pathlib import Path
R=Path(__file__).resolve().parent
BASE='https://casino-wbgame.jiligames.com/annin/3.8/web-mobile/'
versions=json.loads((R/'common/versions.json').read_bytes())
items=['src/chunks/bundle.'+versions['bundle.js']+'.js']
for name in ['annin','annin_loading','annin_simple']:
    v=versions[name]
    items.extend([f'assets/{name}/config.{v}.json',f'assets/{name}/index.{v}.js',f'assets/{name}/{name}.{v}.zip'])
def fetch(path):
    p=R/'common'/path;record={'url':BASE+path,'path':str(p.relative_to(R))}
    try:
        if not p.exists():
            with urllib.request.urlopen(record['url'],timeout=45) as response:data=response.read()
            p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        data=p.read_bytes();record.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        if p.suffix=='.zip':
            with zipfile.ZipFile(p) as z:
                bad=z.testzip()
                if bad:raise ValueError('ZIP CRC failed: '+bad)
                root=(p.parent/'extracted').resolve();root.mkdir(exist_ok=True)
                for info in z.infolist():
                    target=(root/info.filename).resolve()
                    if not target.is_relative_to(root):raise ValueError('ZIP path escapes output')
                z.extractall(root)
                record['entries']=len(z.infolist())
    except Exception as e:record['error']=str(e)
    return record
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:records=list(pool.map(fetch,items))
(R/'common-manifest.json').write_text(json.dumps(records,indent=2),encoding='utf8')
print([(r['path'],r.get('entries',r.get('bytes',r.get('error')))) for r in records])
