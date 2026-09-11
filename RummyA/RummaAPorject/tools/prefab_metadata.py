"""Restore Creator editing metadata on materialized (non-nested) prefabs."""
import json, uuid
from pathlib import Path


def attach_prefab_info(objects):
    asset = objects[0]
    assert asset['__type__'] == 'cc.Prefab'
    root = asset['data']
    changed = False
    for index, node in enumerate(list(objects)):
        if node.get('__type__') != 'cc.Node':
            continue
        seed = 'rummy-a/prefab/' + asset['_name'] + '/' + str(index)
        if not node.get('_prefab'):
            node['_prefab'] = {'__id__': len(objects)}
            objects.append({'__type__': 'cc.PrefabInfo', 'root': dict(root),
                'asset': {'__id__': 0}, 'fileId': str(uuid.uuid5(uuid.NAMESPACE_URL, seed)),
                'instance': None, 'targetOverrides': None, 'nestedPrefabInstanceRoots': None})
            changed = True
        for ref in node.get('_components', []):
            component = objects[ref['__id__']]
            if not component.get('__prefab'):
                component['__prefab'] = {'__id__': len(objects)}
                objects.append({'__type__': 'cc.CompPrefabInfo',
                    'fileId': str(uuid.uuid5(uuid.NAMESPACE_URL, seed + '/component/' + str(ref['__id__'])))})
                changed = True
    return changed


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    for path in (root / 'assets/prefabs').glob('*.prefab'):
        objects = json.loads(path.read_bytes())
        if attach_prefab_info(objects):
            path.write_text(json.dumps(objects, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(path.name)
