"""Verify every newly wired animation can resolve its serialized node/component targets."""
import json
from pathlib import Path

P = Path(__file__).resolve().parents[1]
clips = {json.loads(Path(str(f)+'.meta').read_bytes())['uuid']: f for f in (P/'assets/animations').glob('*.anim')}
checked = 0
missing = set()
for filename in ['RummyTable', 'PlayingCard']:
    folder = 'resources/deferred' if filename == 'RummyTable' else 'prefabs/playable'
    data = json.loads((P/f'assets/{folder}/{filename}.prefab').read_bytes())
    controllers = [x for x in data if 'startAnimation' in x]
    animations = []
    if controllers:
        c = controllers[0]
        animations = [c['startAnimation'],c['shuffleAnimation'],c['pickHint']] + c['drawHints'] + c['groupSweeps'] + c['opponentAnimations'] + c['turnAnimations']
        result = data[c['resultPanel']['__id__']]
        animations += [r for r in result['_components'] if data[r['__id__']]['__type__']=='cc.Animation']
    else:
        animations = [r for r in data[1]['_components'] if data[r['__id__']]['__type__']=='cc.Animation']
    for ref in animations:
        animation = data[ref['__id__']]
        for clip_ref in animation['_clips']:
            if not clip_ref:
                continue
            file = clips[clip_ref['__uuid__']]
            # Only CardSort is used on PlayingCard; other original card clips remain as references.
            if filename == 'PlayingCard' and not file.name.startswith('Clip_CardSort_'):
                continue
            clip = json.loads(file.read_bytes())
            for track in (clip[clip[r['__id__']]['_binding']['path']['__id__']] for r in clip[0]['_tracks']):
                node = data[animation['node']['__id__']]
                for segment in track['_paths']:
                    if not isinstance(segment, dict):
                        continue
                    value = clip[segment['__id__']]
                    if value['__type__']=='cc.animation.HierarchyPath':
                        for part in filter(None, value['path'].split('/')):
                            children = [data[r['__id__']] for r in node['_children']]
                            match = next((n for n in children if n['_name']==part), None)
                            if match is None:
                                missing.add((file.name, value['path'], part))
                                break
                            node = match
                    elif value['__type__']=='cc.animation.ComponentPath':
                        if not any(data[r['__id__']]['__type__']==value['component'] for r in node['_components']):
                            missing.add((file.name, node['_name'], value['component']))
            checked += 1
assert not missing, sorted(missing)
print(f'PASS: {checked} animation bindings resolve to prefab nodes and components')
