"""Embed the reusable image-bound tutorial in the deferred table."""
import json
from assemble_b import hydrate, serialize
from recover_b import ASSETS, save

def main():
    path = ASSETS/'resources/deferred/TableView.prefab'
    prefab = hydrate(json.loads(path.read_bytes()))
    table = prefab['data']
    if any(n['_name'] == 'FirstPlayGuide' for n in table['_children']):
        return
    guide = hydrate(json.loads((ASSETS/'tutorial/FirstPlayGuide.prefab').read_bytes()))['data']
    guide['_active'] = False
    guide['_parent'] = table
    guide['_lpos']['y'] = 0
    next(n for n in guide['_children'] if n['_name'] == 'Instruction')['_lpos']['y'] = 305
    table['_children'].append(guide)
    save(path, serialize(prefab))

if __name__ == '__main__':
    main()
