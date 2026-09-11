"""Expand CCON curve bytes into Creator's editable JSON keyframes.

Matches cocos/core/curves/{curve,quat-curve}.ts. Plain .anim JSON does
not enter the engine's fromCCON deserializer, so bytes alone lose all keys.
"""
import json, struct
from pathlib import Path


def expand_curves(document):
    total = 0
    for curve in document:
        if curve.get('__type__') not in ('cc.RealCurve', 'cc.QuatCurve') or 'bytes' not in curve:
            continue
        data = bytes(curve['bytes']['array'])
        offset = 0
        def read(fmt):
            nonlocal offset
            result = struct.unpack_from('<' + fmt, data, offset)
            offset += struct.calcsize('<' + fmt)
            return result[0] if len(result) == 1 else list(result)
        real = curve['__type__'] == 'cc.RealCurve'
        if real:
            curve['preExtrapolation'], curve['postExtrapolation'] = read('B'), read('B')
        else:
            flags = read('B')
        count = read('I')
        times = [read('f') for _ in range(count)]
        values = []
        if real:
            for _ in times:
                flags = read('I')
                value = {'__type__': 'cc.RealKeyframeValue', 'value': read('f'), 'easingMethod': (flags >> 8) & 255}
                for bit, name, fmt in [(1,'interpolationMode','B'), (2,'tangentWeightMode','B'),
                        (3,'leftTangent','f'), (4,'leftTangentWeight','f'),
                        (5,'rightTangent','f'), (6,'rightTangentWeight','f')]:
                    value[name] = read(fmt) if flags & (1 << bit) else 0
                values.append(value)
        else:
            quats = [read('ffff') for _ in times]
            for quat in quats:
                easing = read('B')
                values.append({'__type__': 'cc.QuatKeyframeValue',
                    'value': dict(__type__='cc.Quat', **dict(zip('xyzw', quat))),
                    'easingMethod': read('ffff') if easing == 255 else easing})
            modes = [read('B')] * count if flags & 1 else [read('B') for _ in times]
            for value, mode in zip(values, modes): value['interpolationMode'] = mode
        assert offset == len(data), (curve['__type__'], offset, len(data))
        assert times == sorted(times)
        del curve['bytes']
        curve['_times'], curve['_values'] = times, values
        total += count
    return total


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    total = 0
    for path in (root / 'assets/animations').glob('*.anim'):
        document = json.loads(path.read_bytes())
        count = expand_curves(document)
        if count:
            path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(path.name, count)
        total += count
    print('Restored keyframes:', total)
