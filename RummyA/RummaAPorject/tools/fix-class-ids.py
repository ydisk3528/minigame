import json
from pathlib import Path
p=Path(__file__).resolve().parents[1]
ids={json.loads((p/'assets/scripts'/f'{n}.ts.meta').read_bytes())['uuid']:c for n,c in [('RummyGame','18ce2OsOT5fG5PWesDpBL0P'),('CardView','5c26284W+pce6IY7dZzg9+m')]}
for f in list((p/'assets').rglob('*.prefab'))+list((p/'assets').rglob('*.scene')):
    s=f.read_text(encoding='utf-8');old=s
    for a,b in ids.items():s=s.replace('"__type__": "'+a+'"','"__type__": "'+b+'"')
    if s!=old:f.write_text(s,encoding='utf-8');print(f.name)
