import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const required = [
  'assets/scenes/Game.scene',
  'assets/scenes/LevelSelect.scene',
  'assets/prefabs/gameplay/Player.prefab',
  'assets/prefabs/gameplay/PipePair.prefab',
  'assets/prefabs/gameplay/DashItem.prefab',
  'assets/prefabs/ui/ScoreHUD.prefab',
  'assets/prefabs/ui/MainMenu.prefab',
  'assets/prefabs/ui/GameOverPanel.prefab',
  'assets/resources/art/player.png',
  'assets/resources/art/pipe.png',
  'assets/resources/art/dash-item.png',
  'assets/resources/art/ui-panel.png',
  'assets/resources/art/ui-button.png',
  'assets/resources/art/background-day.png',
  'assets/resources/music/fly.wav',
  'assets/prefabs/ui/LevelSelect.prefab',
  'assets/prefabs/ui/LevelCompletePanel.prefab',
  'assets/prefabs/environment/Background.prefab',
  'assets/resources/art/background/sky.png',
  'assets/resources/art/background/clouds.png',
  'assets/resources/art/background/distant-trees.png',
  'assets/resources/art/background/grass.png',
  'assets/resources/art/background/themes/sunset/sky.png',
  'assets/resources/art/background/themes/sunset/clouds.png',
  'assets/resources/art/background/themes/sunset/distant-trees.png',
  'assets/resources/art/background/themes/sunset/grass.png',
  'assets/resources/art/background/themes/night/sky.png',
  'assets/resources/art/background/themes/night/clouds.png',
  'assets/resources/art/background/themes/night/distant-trees.png',
  'assets/resources/art/background/themes/night/grass.png',
  'assets/resources/art/gameplay/plane-1.png',
  'assets/resources/art/gameplay/plane-2.png',
  'assets/resources/art/gameplay/plane-3.png',
  'assets/resources/art/gameplay/pipe-body.png',
  'assets/resources/art/gameplay/smoke.png',
  'assets/resources/art/gameplay/speed-lines.png',
  'assets/resources/art/gameplay/pipe-debris.png',
  'assets/resources/art/gameplay/dash.png',
  'tools/level-editor/start.cmd',
];
for (const file of required) {
  assert(existsSync(resolve(root, file)), `missing ${file}`);
  if (file.endsWith('.scene') || file.endsWith('.prefab')) JSON.parse(readFileSync(resolve(root, file), 'utf8'));
}

const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function compressUuid(uuid) {
  const hex = uuid.replaceAll('-', '');
  let output = hex.slice(0, 5);
  for (let i = 5; i < 32; i += 3) {
    const value = Number.parseInt(hex.slice(i, i + 3), 16);
    output += base64[value >> 6] + base64[value & 63];
  }
  return output;
}
function filesBelow(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesBelow(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
}
const scriptClassIds = new Set(filesBelow(resolve(root, 'assets/scripts')).filter(file => file.endsWith('.ts.meta')).map(file => {
  const meta = JSON.parse(readFileSync(file, 'utf8'));
  return compressUuid(meta.uuid);
}));
for (const file of required.filter(file => file.endsWith('.scene') || file.endsWith('.prefab'))) {
  const records = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  for (const record of records) {
    if (record.__type__ && !record.__type__.startsWith('cc.')) assert(scriptClassIds.has(record.__type__), `${file}: invalid script class ${record.__type__}`);
  }
}

const prefabChildren = {
  'assets/prefabs/gameplay/Player.prefab': 3,
  'assets/prefabs/gameplay/PipePair.prefab': 2,
  'assets/prefabs/gameplay/DashItem.prefab': 1,
  'assets/prefabs/ui/ScoreHUD.prefab': 1,
  'assets/prefabs/ui/MainMenu.prefab': 7,
  'assets/prefabs/ui/GameOverPanel.prefab': 5,
  'assets/prefabs/ui/LevelSelect.prefab': 4,
  'assets/prefabs/ui/LevelCompletePanel.prefab': 5,
  'assets/prefabs/environment/Background.prefab': 4,
};
for (const [file, minimum] of Object.entries(prefabChildren)) {
  const prefab = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  const rootNode = prefab[prefab[0].data.__id__];
  assert(rootNode._children.length >= minimum, `${file}: expected editor-visible child nodes`);
}
const pipePrefab = JSON.parse(readFileSync(resolve(root, 'assets/prefabs/gameplay/PipePair.prefab'), 'utf8'));
for (const [name, edge] of [['BottomPipeArtwork', -640], ['TopPipeArtwork', 640]]) {
  const node = pipePrefab.find(record => record.__type__ === 'cc.Node' && record._name === name);
  const transform = pipePrefab[node._components[0].__id__];
  const outsideEdge = node._lpos.y + Math.sign(edge) * transform._contentSize.height * 0.5;
  assert(Math.abs(outsideEdge) >= Math.abs(edge), `${name} must reach beyond the screen edge`);
}
const levelSelectPrefab = JSON.parse(readFileSync(resolve(root, 'assets/prefabs/ui/LevelSelect.prefab'), 'utf8'));
const levelSelectNodes = levelSelectPrefab.filter(record => record.__type__ === 'cc.Node');
const levelTemplate = levelSelectNodes.find(node => node._name === 'LevelButtonTemplate');
assert(levelTemplate && !levelTemplate._active, 'LevelSelect requires an inactive dynamic button template');
assert(!levelSelectNodes.some(node => /^Level\d+$/.test(node._name)), 'LevelSelect must not contain hard-coded level buttons');
const levelScene = JSON.parse(readFileSync(resolve(root, 'assets/scenes/LevelSelect.scene'), 'utf8'));
assert(levelScene.some(record => record.__type__ === '8f017nQb31Bpo9uEPHypMgB'), 'LevelSelect scene controller is missing');
const levelSceneNodeNames = new Set(levelScene.filter(record => record.__type__ === 'cc.Node').map(record => record._name));
for (const name of ['Canvas', 'Camera', 'Sky', 'CloudLayer', 'DistantTreeLayer', 'GrassLayer', 'LevelSelect', 'LevelGrid', 'LevelButtonTemplate', 'BackButton', 'PrevButton', 'NextButton', 'PageLabel']) {
  assert(levelSceneNodeNames.has(name), `LevelSelect scene requires editor-visible ${name}`);
}
assert(!levelScene.some(record => record.__type__ === 'cc.AudioSource'), 'LevelSelect must not play the airplane propeller sound');
const mainMenu = JSON.parse(readFileSync(resolve(root, 'assets/prefabs/ui/MainMenu.prefab'), 'utf8'));
assert(mainMenu.some(record => record.__type__ === 'cc.Node' && record._name === 'LevelButton' && record._active), 'Main menu level button must be visible');
const playerPrefab = JSON.parse(readFileSync(resolve(root, 'assets/prefabs/gameplay/Player.prefab'), 'utf8'));
const playerController = playerPrefab.find(record => record.__type__ === '22222IiIiJCIoIiIiIiIiIi');
assert(playerController?.smokeAnchor?.__id__, 'PlayerController must use the prefab SmokeAnchor');
const tailExhaust = playerPrefab.find(record => record.__type__ === 'cc.Node' && record._name === 'TailExhaust');
assert(tailExhaust, 'Player prefab requires an editor-visible TailExhaust node');
const tailSprite = playerPrefab[tailExhaust._components[1].__id__];
assert(tailSprite.__type__ === 'cc.Sprite' && tailSprite._spriteFrame?.__uuid__ === 'b33d691c-6186-4298-ab89-bbf445bb129b@f9941', 'TailExhaust must use the smoke image SpriteFrame');

const { levels } = JSON.parse(readFileSync(resolve(root, 'assets/resources/config/levels.json'), 'utf8'));
assert(levels.length >= 1, 'at least one level is required');
for (const level of levels) {
  assert(level.pipeSpeed > 0 && level.spawnInterval > 0, `level ${level.id}: speeds must be positive`);
  assert(['day', 'sunset', 'night'].includes(level.theme), `level ${level.id}: invalid background theme`);
  assert(['random', 'alternating', 'wave'].includes(level.pipePattern), `level ${level.id}: invalid pipe pattern`);
  assert(level.patternAmplitude >= 0 && level.patternStep > 0, `level ${level.id}: invalid pipe pattern parameters`);
  assert(level.gravity < 0 && level.flapVelocity > 0 && level.maxFallSpeed < 0, `level ${level.id}: invalid plane physics`);
  assert(level.gapSize >= 180, `level ${level.id}: gap is too small`);
  assert(level.itemSpawnChance >= 0 && level.itemSpawnChance <= 1, `level ${level.id}: invalid item probability`);
  assert(level.dashDuration > 0, `level ${level.id}: dash duration must be positive`);
}
assert.equal(new Set(levels.map(level => level.id)).size, levels.length, 'level ids must be unique');
assert(levels.every((level, index) => index === 0 || level.id > levels[index - 1].id), 'level ids must be ascending for unlock order');
console.log(`Flappy AviatorX validated: ${required.length} scene/prefab assets, ${levels.length} levels.`);
