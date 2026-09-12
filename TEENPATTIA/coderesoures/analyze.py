import json,re
from pathlib import Path
R=Path(__file__).resolve().parent
s=(R/'assets/main/index.599d1.js').read_text(encoding='utf8')
out=R/'analysis/classes';out.mkdir(parents=True,exist_ok=True)
hits=list(re.finditer(r'cclegacy\._RF\.push\(\{\},"([^"]+)","([^"]+)"',s))
index=[]
for m in hits:
 name=m[2]+('-'+m[1][:5] if sum(x[2]==m[2] for x in hits)>1 else '')
 end=s.find('cclegacy._RF.pop()',m.end())
 (out/(name+'.js')).write_text(s[m.start():end],encoding='utf8')
 index.append({'name':m[2],'classId':m[1],'file':'classes/'+name+'.js','source':'assets/main/index.599d1.js','startOffset':m.start(),'endOffset':end})
(R/'analysis/class-index.json').write_text(json.dumps(index,indent=2),encoding='utf8')
print([m[2] for m in hits])
print('remote URLs', sorted(set(re.findall(r'https?[^\s"\x27<>]+',s)))[:60])
for name in ['game','main']:
 c=json.loads(next((R/'assets'/name).glob('config.*.json')).read_bytes())
 for p in (R/'assets'/name/'import').rglob('*.json'):
  d=json.loads(p.read_bytes())
  if isinstance(d,list) and len(d)==6 and isinstance(d[5],list):
   print(name,p.name,'pack entries',len(d[5]))
   print('native records',[e[0][0] for e in d[5] if isinstance(e[0][0],dict) and ('_native'in e[0][0] or 'fmt'in e[0][0])][:5])
