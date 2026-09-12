import concurrent.futures,hashlib,json,urllib.request,shutil,struct,re
from pathlib import Path
from download import expand
R=Path(__file__).resolve().parent
BASE='https://casino-wbgame.jiligames.com/annin/3.8/web-mobile/'
records=[]
def fetch(path):
 p=R/'common'/path;r={'url':BASE+path,'path':str(p.relative_to(R))}
 try:
  if not p.exists():
   with urllib.request.urlopen(r['url'],timeout=30) as response:data=response.read()
   p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
  data=p.read_bytes();r.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
 except Exception as e:r['error']=str(e)
 records.append(r);return p if p.exists() else None
def batch(paths):
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:return list(pool.map(fetch,paths))
for conf in (R/'common/assets').glob('*/config.*.json'):
 c=json.loads(conf.read_bytes());name=conf.parent.name;paths=[];native_ext={}
 for p in (conf.parent/'extracted').rglob('*'):
  if p.is_file():
   dst=conf.parent/p.relative_to(conf.parent/'extracted');dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dst)
   if '/native/' in dst.as_posix():native_ext[p.name.split('.')[0]]=p.suffix
 extensions={i:ext for ext,ids in c.get('extensionMap',{}).items() for i in ids}
 versions=c['versions']['import']
 for i,v in zip(versions[::2],versions[1::2]):
  u=expand(c['uuids'][i]) if isinstance(i,int) else i
  paths.append(f'assets/{name}/import/{u[:2]}/{u}.{v}'+extensions.get(i,'.json'))
 batch(paths)
 for packid,ids in c['packs'].items():
  p=next((conf.parent/'import').rglob(packid+'.*.json'),None)
  if not p:continue
  d=json.loads(p.read_bytes())
  if not isinstance(d,list) or len(d)!=6:continue
  for i,e in zip(ids,d[5]):
   first=e[0][0];u=expand(c['uuids'][i])
   if isinstance(first,dict) and 'fmt'in first:
    formats=[int(x.split('@')[0]) for x in first['fmt'].split('_')]
    chosen=next((x for x in formats if x<5),formats[0])
    native_ext[u]=['.png','.jpg','.jpeg','.bmp','.webp','.pvr','.pkm','.astc'][chosen]
   else:
    match=re.search(r'"(\.(?:mp3|ogg|wav|bin|plist|skel|atlas|und))"',json.dumps(e))
    if match:native_ext[u]=match[1]
 versions=c['versions']['native'];paths=[]
 for i,v in zip(versions[::2],versions[1::2]):
  u=expand(c['uuids'][i]);path=c['paths'].get(str(i));typ=c['types'][path[1]] if path else ''
  ext=native_ext.get(u,{'cc.AudioClip':'.mp3','sp.SkeletonData':'.bin','cc.Asset':'.bin','cc.ParticleAsset':'.plist'}.get(typ,'.png'))
  paths.append(f'assets/{name}/native/{u[:2]}/{u}.{v}{ext}')
 batch(paths);print(name,'downloaded',len(paths),flush=True)
(R/'common-assets-manifest.json').write_text(json.dumps(records,indent=2),encoding='utf8')
print('records',len(records),'failed',sum('error'in r for r in records))
