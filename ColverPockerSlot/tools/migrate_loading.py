"""One-time, UUID-preserving split of the authored scene. Do not regenerate artwork."""
import json, uuid, zipfile
from pathlib import Path
from editor import hydrate, serialize, node, walk
from recover import ASSETS, PROJECT, save, meta

def uid(name): return str(uuid.uuid5(uuid.NAMESPACE_URL, 'clover-lazy/' + name))
def add(parent, child):
    parent['_children'].append(child); child['_parent'] = parent; return child
def find(root, name): return next(n for n in walk(root) if n['_name'] == name)
def detach(root, name):
    n = find(root, name); n['_parent']['_children'].remove(n); n['_parent'] = None; return n
def output_prefab(root, path):
    root['_parent'] = None
    save(path, serialize({'__type__': 'cc.Prefab', '_name': root['_name'], 'data': root}))
    if not Path(str(path) + '.meta').exists(): meta(path, uid(path.stem), 'prefab')
def move_file(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst); Path(str(src) + '.meta').rename(Path(str(dst) + '.meta'))

if __name__ == '__main__':
    bundle = ASSETS / 'clover'
    if (bundle / 'core/CloverMain.prefab').exists():
        raise SystemExit('Already migrated; edit the current prefabs instead of regenerating.')
    backup = PROJECT / 'tools/before-lazy-loading.zip'
    if not backup.exists():
        with zipfile.ZipFile(backup, 'w', zipfile.ZIP_DEFLATED) as z:
            for folder in ['assets/scenes', 'assets/prefabs/playable', 'assets/scripts']:
                for path in (PROJECT / folder).rglob('*'):
                    if path.is_file(): z.write(path, path.relative_to(PROJECT))
            z.write(PROJECT / 'build-config.json', 'build-config.json')

    source = hydrate(json.loads((ASSETS / 'scenes/CloverSlot.scene').read_bytes()))
    scene = source['scene']; canvas = find(scene, 'Canvas')
    app = next(c for c in canvas['_components'] if 'gameRoot' in c)
    game, dialog, bonus = (app[k] for k in ['gameRoot', 'dialogRoot', 'bonusRoot'])
    bundle.mkdir(exist_ok=True)
    meta(bundle, uid('bundle'), 'directory', '1.2.0')
    m = json.loads(Path(str(bundle) + '.meta').read_bytes())
    m['userData'] = {'isBundle': True, 'bundleName': 'clover', 'priority': 1}
    save(Path(str(bundle) + '.meta'), m)

    for name in ['Node_BigWin', 'Node_BGDeclare', 'Fx_Expand']:
        output_prefab(detach(game, name), bundle / 'effects' / (name + '.prefab'))
    # Keep the intro editable but unreachable from startup. No automatic intro entry.
    output_prefab(detach(game, 'Node_GameIntro'), ASSETS / 'prefabs/playable/GameIntro.prefab')
    for name in ['LocalMode', 'Node_Win', 'Node_Bar', 'MG_S', 'Ways', 'ManualRoot', 'Reel_BG', 'AutoTime', 'Logo_S', 'MASK']:
        detach(game, name)
    for n in list(walk(game)):
        if n['_name'] in ['JP_NUM', 'JP_Black']: n['_parent']['_children'].remove(n)
    output_prefab(game, ASSETS / 'prefabs/playable/CloverGame.prefab')
    for root, name in [(dialog, 'CloverDialog'), (bonus, 'CloverBonus')]:
        src = ASSETS / 'prefabs/playable' / (name + '.prefab')
        dst = bundle / 'panels' / src.name
        move_file(src, dst); output_prefab(root, dst)
    symbol_paths = []
    for src in sorted((ASSETS / 'prefabs/playable').glob('Symbol_*.prefab')):
        dst = bundle / 'effects' / src.name; move_file(src, dst)
        symbol_paths.append('effects/' + dst.stem)
    for name in ['WaysRunEffect', 'FXEffect']:
        move_file(ASSETS / 'prefabs/playable' / (name + '.prefab'), bundle / 'effects' / (name + '.prefab'))
    for src in list((ASSETS / 'audio').glob('*.mp3')):
        move_file(src, bundle / 'audio' / src.name)
    card_paths = []
    image_paths = {json.loads(f.read_bytes()).get('uuid'): f for f in (ASSETS / 'art').rglob('*.png.meta')}
    for ref in app['cardFaces']:
        src = Path(str(image_paths[ref['__uuid__'].split('@')[0]])[:-5])
        dst = bundle / 'cards' / src.name; move_file(src, dst)
        card_paths.append('cards/' + dst.stem + '/spriteFrame')
    (ASSETS / 'scripts/LoadingAssets.ts').write_text(
        '// Paths in the clover bundle; no static references from the startup scene.\n'
        + 'export const SYMBOL_PATHS = ' + json.dumps(symbol_paths) + ';\n'
        + 'export const CARD_PATHS = ' + json.dumps(card_paths) + ';\n', encoding='utf-8')

    main = node('CloverMain', 0, 0, 1136, 640); add(main, game)
    main['_components'].append({'__type__': app['__type__'], 'node': main, 'gameRoot': game, 'symbols': app['symbols']})
    output_prefab(main, bundle / 'core/CloverMain.prefab')
    # Reuse camera/canvas settings while removing every game and panel reference.
    canvas['_children'] = [find(canvas, 'Camera')]
    canvas['_components'] = [c for c in canvas['_components'] if c is not app]
    camera = canvas['_children'][0]
    next(c for c in camera['_components'] if c['__type__'] == 'cc.Camera')['_clearColor'] = {'__type__': 'cc.Color', 'r': 0, 'g': 0, 'b': 0, 'a': 255}
    canvas['_components'].append({'__type__': uid('CloverLoading'), 'node': canvas, 'spinner': {'__uuid__': uid('loading-image') + '@f9941', '__expectedType__': 'cc.SpriteFrame'}})
    save(ASSETS / 'scenes/CloverSlot.scene', serialize(source))
    for name in ['CloverLoading', 'LoadingAssets']:
        meta(ASSETS / 'scripts' / (name + '.ts'), uid(name), 'typescript', '4.0.24')
    # Directory metadata makes bundle identity stable across machines.
    for folder in sorted(bundle.rglob('*')):
        if folder.is_dir() and not Path(str(folder) + '.meta').exists(): meta(folder, uid(str(folder.relative_to(ASSETS))), 'directory', '1.2.0')
    print('Migrated scene and lazy bundle. Backup:', backup)
