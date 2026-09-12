"""Guard the resource split so hidden panels cannot creep back into startup."""
import json, struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
assets = root / 'assets'
scene_path = assets / 'scenes/CloverSlot.scene'
core_path = assets / 'clover/core/CloverMain.prefab'
scene = json.loads(scene_path.read_bytes())
core = json.loads(core_path.read_bytes())
assert [o['_name'] for o in scene if o.get('__type__') == 'cc.Node'] == ['Canvas', 'Camera']
assert any(o.get('spinner') for o in scene)
assert not any('gameRoot' in o for o in scene)
app = next(o for o in core if 'gameRoot' in o)
for prop in ['dialogRoot', 'bonusRoot', 'sounds', 'cardFaces', 'symbolPrefabs', 'linePrefab', 'flyPrefab']:
    assert not app.get(prop), prop
names = {o.get('_name') for o in core if o.get('__type__') == 'cc.Node'}
for name in ['CloverDialog', 'CloverBonus', 'Node_GameIntro', 'Node_BigWin', 'Node_BGDeclare', 'Reel_BG', 'ManualRoot', 'LocalMode']:
    assert name not in names, name
for file in [scene_path, core_path, assets / 'clover/panels/CloverDialog.prefab', assets / 'scripts/CloverApp.ts']:
    assert 'LOCAL DEMO' not in file.read_text(encoding='utf-8').upper(), file
spinner = assets / 'loading/spinner.png'
assert struct.unpack('>II', spinner.read_bytes()[16:24]) == (128, 128)
assert spinner.stat().st_size < 10 * 1024
bundle = json.loads((assets / 'clover.meta').read_bytes())
assert bundle['userData']['isBundle'] and bundle['userData']['bundleName'] == 'clover'
print(f'PASS: thin startup {scene_path.stat().st_size} bytes; core prefab {core_path.stat().st_size} bytes; spinner {spinner.stat().st_size} bytes; no eager panels/audio/effect arrays.')
