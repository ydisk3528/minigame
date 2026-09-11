import json,re
from pathlib import Path
m=json.loads(Path('tools/reference/strings.json').read_bytes())
for name in ['HandSettingView','TableView','ResultView','Menu','Card','RummyUtil','HandCardState']:
 s=Path('tools/reference/client-modules/'+name+'.ts.js').read_text(encoding='utf-8');props={}
 for obj,body in re.findall(r'(_0160_0x\w+)\s*=\s*\{([^{}]+)\}',s):
  for key,val in re.findall(r'(_0x\w+):(0x[0-9a-f]+)',body):props[obj+'.'+key]=val
 s=re.sub(r'_0160_0x\w+\._0x\w+',lambda x:props.get(x[0],x[0]),s)
 aliases={'_0160_0x4970','_0160_0x2ac8b7'}
 for _ in range(10):
  for a,b in re.findall(r'(_0x\w+)\s*=\s*(_(?:0160_)?0x\w+)\b',s):
   if b in aliases:aliases.add(a)
 pattern=r'('+ '|'.join(aliases)+r')\((0x[0-9a-f]+)\)'
 s=re.sub(pattern,lambda x:json.dumps(m.get(x[2],x[0]),ensure_ascii=True),s)
 lit=r'("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')'
 import ast
 for _ in range(30):
  s,n=re.subn(lit+r'\s*\+\s*'+lit,lambda x:json.dumps(ast.literal_eval(x[1])+ast.literal_eval(x[2])),s)
  if not n:break
 s=re.sub(r'\["([A-Za-z_$][\w$]*)"\]',r'.\1',s)
 s=s.replace(';',';\n').replace('},','},\n')
 Path('tools/reference/'+name+'.decoded.js').write_text(s,encoding='utf-8')
 print(name,len(s))
