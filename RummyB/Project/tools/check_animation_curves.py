"""Check restored keys, optionally including Creator's imported CCON asset."""
import json, struct, sys
from pathlib import Path
from editor_curves import expand_curves

root = Path(__file__).resolve().parents[1]
total = 0
for path in (root / 'assets/animations').glob('*.anim'):
    doc = json.loads(path.read_bytes())
    for curve in doc:
        if curve.get('__type__') in ('cc.RealCurve', 'cc.QuatCurve'):
            assert 'bytes' not in curve, f'{path}: runtime bytes are not editable JSON'
            assert len(curve['_times']) == len(curve['_values'])
            total += len(curve['_times'])
    if path.name.startswith('Base_GameStart_'):
        start = doc
assert sum(len(c.get('_times', [])) for c in start) == 178
assert total == 2216, total

if '--imported' in sys.argv:
    uid = '1e7e1bcf-de95-4fa4-af6f-9e2875b3cce6'
    raw = (root / 'library' / uid[:2] / (uid + '.cconb')).read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[16:16+length])
    pos = (16 + length + 7) // 8 * 8
    chunk = raw[pos+4:pos+4+struct.unpack_from('<I', raw, pos)[0]]
    for curve in doc:
        data = curve.get('bytes', {})
        if data.get('__type__') == 'TypedArrayRef':
            assert data['ctor'] == 'Uint8Array'
            curve['bytes'] = {'array': list(chunk[data['offset']:data['offset']+data['length']])}
    expand_curves(doc)
    expected = [c for c in start if c.get('__type__') == 'cc.RealCurve']
    actual = [c for c in doc if c.get('__type__') == 'cc.RealCurve']
    assert len(actual) == len(expected)
    for a, b in zip(actual, expected):
        assert a['_times'] == b['_times'], 'Creator lost keyframe times'
        assert a['_values'] == b['_values'], 'Creator changed keyframe values'
    print('PASS Creator import preserves all 178 StartGame keys and values')
print('PASS editable animation keys:', total)
