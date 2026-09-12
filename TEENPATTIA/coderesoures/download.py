"""Download public build files, recording URLs, hashes and failures; rerunnable."""
import concurrent.futures, hashlib, json, re, urllib.request, urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parent
BASE='https://casino-wbgame.jiligames.com/teenpatti/'
ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
records={}
def expand(s):
    h,*tail=s.split('@')
    if len(h)==22:
        out=h[:2]
        for i in range(2,22,2):
            a,b=ABC.index(h[i]),ABC.index(h[i+1]);out+=f'{a>>2:x}{((a&3)<<2)|(b>>4):x}{b&15:x}'
        h=f'{out[:8]}-{out[8:12]}-{out[12:16]}-{out[16:20]}-{out[20:]}'
    return h+('@'+tail[0] if tail else '')
def get(path):
    url=urllib.parse.urljoin(BASE,path); p=ROOT/path
    try:
        if not p.exists():
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=45) as r:data=r.read()
            p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        data=p.read_bytes();records[path]={'url':url,'path':path,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        return p
    except Exception as e:records[path]={'url':url,'path':path,'error':str(e)};return None
def batch(paths):
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:return list(pool.map(get,sorted(set(paths))))
def main():
    paths=['index.html','style.02f4a.css','index.d2849.js','application.fda01.js','src/system.bundle.543e6.js','src/import-map.ce47e.json','src/settings.e7a37.json','cocos-js/cc.1559f.js','src/chunks/bundle.1245f.js','src/annin-framework/utils/fflate.min.5fd4f.js']
    batch(paths)
    settings=json.loads((ROOT/'src/settings.e7a37.json').read_bytes());configs={};imports=[]
    for name,ver in settings['assets']['bundleVers'].items():
        pre=f'assets/{name}/';p=get(pre+f'config.{ver}.json');c=json.loads(p.read_bytes());configs[name]=c
        get(pre+f'index.{ver}.js')
        extensions={i:ext for ext,ids in c.get('extensionMap',{}).items() for i in ids}
        v=c['versions']['import']
        for idx,ver in zip(v[::2],v[1::2]):
            u=expand(c['uuids'][idx]) if isinstance(idx,int) else idx
            imports.append(pre+f'import/{u[:2]}/{u}.{ver}'+extensions.get(idx,'.json'))
    files=batch(imports);native=[]
    for name,c in configs.items():
        image_ext={}
        for packid,ids in c['packs'].items():
            p=next((ROOT/f'assets/{name}/import').rglob(packid+'.*.json'),None)
            if not p:continue
            d=json.loads(p.read_bytes())
            for idx,e in zip(ids,d[5]):
                first=e[0][0]
                if isinstance(first,dict) and 'fmt'in first:
                    formats=[int(x.split('@')[0]) for x in first['fmt'].split('_')]
                    image_ext[idx]=['.png','.jpg','.jpeg','.bmp','.webp','.pvr','.pkm','.astc'][next((x for x in formats if x<5),formats[0])]
        v=c['versions']['native']
        for idx,ver in zip(v[::2],v[1::2]):
            u=expand(c['uuids'][idx]);ext=image_ext.get(idx)
            # Audio paths are typed in the bundle, remaining native assets are image atlases.
            typ=c['paths'].get(str(idx),[])
            if typ and c['types'][typ[1]]=='cc.AudioClip':ext='.mp3'
            if ext is None:
                for p in files:
                    if p and p.suffix=='.json' and p.name.startswith(u+'.'):
                        text=p.read_text();m=re.search(r'"(\.[a-zA-Z0-9]+)"',text)
                        if m:ext=m[1]
            native.append(f'assets/{name}/native/{u[:2]}/{u}.{ver}{ext or ".png"}')
    batch(native)
    # Capture exact static JS dependencies emitted by System.register.
    for _ in range(3):
        extra=[]
        for p in list((ROOT/'cocos-js').glob('*.js')):
            text=p.read_text(encoding='utf-8',errors='replace')
            for dep in re.findall(r'[\"\']((?:\./|\.\./)[^\"\']+\.js)[\"\']',text):
                url=urllib.parse.urljoin(BASE+p.relative_to(ROOT).as_posix(),dep)
                if url.startswith(BASE):
                    rel=url[len(BASE):]
                    if not (ROOT/rel).exists():extra.append(rel)
        if not extra:break
        batch(extra)
    wasm=[]
    for p in (ROOT/'cocos-js').glob('*.js'):
        for asset in re.findall(r'"(assets/[^"\s]+\.(?:wasm|bin))"',p.read_text(encoding='utf8')):
            wasm.append('cocos-js/'+asset)
    batch(wasm)
    for folder in ['assets','src','cocos-js']:
        for p in (ROOT/folder).rglob('*'):
            if p.is_file():get(p.relative_to(ROOT).as_posix())
    (ROOT/'manifest.json').write_text(json.dumps(list(records.values()),indent=2),encoding='utf-8')
    print('files',len(records),'failures',sum('error'in r for r in records.values()),flush=True)
if __name__=='__main__':main()
