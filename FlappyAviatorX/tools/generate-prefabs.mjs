import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const UI = 33554432;
const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function scriptClassId(uuid) {
  const hex = uuid.replaceAll('-', '');
  let output = hex.slice(0, 5);
  for (let i = 5; i < 32; i += 3) {
    const value = Number.parseInt(hex.slice(i, i + 3), 16);
    output += base64[value >> 6] + base64[value & 63];
  }
  return output;
}
const art = {
  player: 'e1111111-1111-4111-8111-111111111111@f9941',
  pipe: 'e2222222-2222-4222-8222-222222222222@f9941',
  dash: 'e3333333-3333-4333-8333-333333333333@f9941',
  panel: 'e4444444-4444-4444-8444-444444444444@f9941',
  button: 'e5555555-5555-4555-8555-555555555555@f9941',
  sky: 'f1111111-1111-4111-8111-111111111111@f9941',
  clouds: 'f2222222-2222-4222-8222-222222222222@f9941',
  trees: 'f3333333-3333-4333-8333-333333333333@f9941',
  grass: 'f4444444-4444-4444-8444-444444444444@f9941',
};
const classes = {
  player: scriptClassId('22222222-2222-4222-8222-222222222222'),
  pipe: scriptClassId('33333333-3333-4333-8333-333333333333'),
  dash: scriptClassId('44444444-4444-4444-8444-444444444444'),
  score: scriptClassId('55555555-5555-4555-8555-555555555555'),
  menu: scriptClassId('66666666-6666-4666-8666-666666666666'),
  over: scriptClassId('77777777-7777-4777-8777-777777777777'),
  select: scriptClassId('be267513-f57f-4917-b616-2d3f4c224d90'),
  complete: scriptClassId('5c658f8f-3847-47cf-913c-1f7370aa8b8a'),
};

function builder(name, fileId) {
  const data = [{ __type__: 'cc.Prefab', _name: name, _objFlags: 0, _native: '', data: { __id__: 1 }, optimizationPolicy: 0, asyncLoadAssets: false, persistent: false }];
  const nodes = [];
  const add = value => (data.push(value), data.length - 1);
  function node(nodeName, parent = null, x = 0, y = 0, width = 0, height = 0, sx = 1, sy = 1) {
    const value = { __type__: 'cc.Node', _name: nodeName, _objFlags: 0, _parent: parent ? { __id__: parent.id } : null, _children: [], _active: true, _components: [], _prefab: null,
      _lpos: { __type__: 'cc.Vec3', x, y, z: 0 }, _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: { __type__: 'cc.Vec3', x: sx, y: sy, z: 1 },
      _layer: UI, _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '' };
    const item = { id: add(value), value };
    if (parent) parent.value._children.push({ __id__: item.id });
    nodes.push(item);
    if (width || height) component(item, { __type__: 'cc.UITransform', node: { __id__: item.id }, _enabled: true, __prefab: null,
      _contentSize: { __type__: 'cc.Size', width, height }, _anchorPoint: { __type__: 'cc.Vec2', x: .5, y: .5 }, _id: '' });
    return item;
  }
  function component(owner, value) { const id = add(value); owner.value._components.push({ __id__: id }); return id; }
  function sprite(owner, frame, type = 0, color = [255, 255, 255, 255]) {
    return component(owner, { __type__: 'cc.Sprite', node: { __id__: owner.id }, _enabled: true, __prefab: null, _visFlags: 0, _customMaterial: null,
      _srcBlendFactor: 2, _dstBlendFactor: 4, _color: { __type__: 'cc.Color', r: color[0], g: color[1], b: color[2], a: color[3] },
      _spriteFrame: { __uuid__: frame, __expectedType__: 'cc.SpriteFrame' }, _type: type, _fillType: 0, _sizeMode: 0,
      _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 }, _fillStart: 0, _fillRange: 0, _isTrimmedMode: false, _useGrayscale: false, _atlas: null, _id: '' });
  }
  function label(owner, text, size, color = [255, 255, 255, 255]) {
    return component(owner, { __type__: 'cc.Label', node: { __id__: owner.id }, _enabled: true, __prefab: null, _visFlags: 0, _customMaterial: null,
      _srcBlendFactor: 2, _dstBlendFactor: 4, _color: { __type__: 'cc.Color', r: color[0], g: color[1], b: color[2], a: color[3] },
      _string: text, _horizontalAlign: 1, _verticalAlign: 1, _actualFontSize: size, _fontSize: size, _fontFamily: 'Courier New', _lineHeight: size + 6,
      _overflow: 1, _enableWrapText: false, _font: null, _isSystemFontUsed: true, _isItalic: false, _isBold: true, _isUnderline: false, _underlineHeight: 2, _cacheMode: 0, _id: '' });
  }
  function graphics(owner) { return component(owner, { __type__: 'cc.Graphics', node: { __id__: owner.id }, _enabled: true, __prefab: null, _customMaterial: null, _srcBlendFactor: 2, _dstBlendFactor: 4, _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 }, _id: '' }); }
  function script(owner, type, props = {}) { return component(owner, { __type__: type, node: { __id__: owner.id }, _enabled: true, __prefab: null, ...props, _id: '' }); }
  function text(parent, nodeName, value, y, size, color) { const n = node(nodeName, parent, 0, y, 560, size + 22); return { node: n, label: label(n, value, size, color) }; }
  function button(parent, nodeName, value, x, y, width = 320, height = 92, tint = [255, 255, 255, 255]) {
    const n = node(nodeName, parent, x, y, width, height); sprite(n, art.button, 1, tint);
    const t = node('Label', n, 0, 0, width - 20, height - 12); const labelId = label(t, value, Math.min(30, height - 34), [25, 34, 42, 255]);
    return { node: n, label: labelId };
  }
  function finish(root) {
    for (const n of nodes) n.value._prefab = { __id__: add({ __type__: 'cc.PrefabInfo', root: { __id__: root.id }, asset: { __id__: 0 }, fileId: `${fileId}-${n.id}` }) };
    return JSON.stringify(data, null, 2) + '\n';
  }
  return { node, sprite, label, graphics, script, text, button, finish };
}

let createdPrefabs = 0;
let skippedPrefabs = 0;
function save(path, content) {
  const target = resolve(rootDir, path);
  if (path.endsWith('.prefab') && existsSync(target)) {
    skippedPrefabs++;
    return;
  }
  writeFileSync(target, content);
  if (path.endsWith('.prefab')) createdPrefabs++;
}

function imageMeta(uuid, name, width, height, hasAlpha) {
  return JSON.stringify({ ver: '1.0.27', importer: 'image', imported: true, uuid, files: ['.json', '.png'], subMetas: {
    '6c48a': { importer: 'texture', uuid: `${uuid}@6c48a`, displayName: name, id: '6c48a', name: 'texture', userData: {
      wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge', minfilter: 'nearest', magfilter: 'nearest', mipfilter: 'none', anisotropy: 0,
      isUuid: true, imageUuidOrDatabaseUri: uuid, visible: false }, ver: '1.0.22', imported: true, files: ['.json'], subMetas: {} },
    'f9941': { importer: 'sprite-frame', uuid: `${uuid}@f9941`, displayName: name, id: 'f9941', name: 'spriteFrame', userData: {
      trimThreshold: 1, rotated: false, offsetX: 0, offsetY: 0, trimX: 0, trimY: 0, width, height, rawWidth: width, rawHeight: height,
      borderTop: 0, borderBottom: 0, borderLeft: 0, borderRight: 0, packable: true, pixelsToUnit: 100, pivotX: .5, pivotY: .5, meshType: 0,
      isUuid: true, imageUuidOrDatabaseUri: `${uuid}@6c48a`, atlasUuid: '', trimType: 'none', vertices: {
        rawPosition: [-width / 2, -height / 2, 0, width / 2, -height / 2, 0, -width / 2, height / 2, 0, width / 2, height / 2, 0],
        indexes: [0, 1, 2, 2, 1, 3], uv: [0, height, width, height, 0, 0, width, 0], nuv: [0, 0, 1, 0, 0, 1, 1, 1],
        minPos: [-width / 2, -height / 2, 0], maxPos: [width / 2, height / 2, 0] } }, ver: '1.0.12', imported: true, files: ['.json'], subMetas: {} }
  }, userData: { type: 'sprite-frame', hasAlpha, fixAlphaTransparencyArtifacts: false, redirect: `${uuid}@6c48a` } }, null, 2) + '\n';
}

save('assets/resources/art/background/sky.png.meta', imageMeta('f1111111-1111-4111-8111-111111111111', 'sky', 1024, 1536, false));
save('assets/resources/art/background/clouds.png.meta', imageMeta('f2222222-2222-4222-8222-222222222222', 'clouds', 1536, 340, true));
save('assets/resources/art/background/distant-trees.png.meta', imageMeta('f3333333-3333-4333-8333-333333333333', 'distant-trees', 1536, 461, true));
save('assets/resources/art/background/grass.png.meta', imageMeta('f4444444-4444-4444-8444-444444444444', 'grass', 1536, 400, true));

{
  const b = builder('Background', 'background'); const root = b.node('Background', null, 0, 0, 720, 1280);
  const sky = b.node('Sky', root, 0, 0, 854, 1280); b.sprite(sky, art.sky);
  const layers = [
    ['CloudLayer', art.clouds, 250, 200],
    ['DistantTreeLayer', art.trees, -345, 270],
    ['GrassLayer', art.grass, -597, 234],
  ];
  for (const [layerName, frame, y, height] of layers) {
    const layer = b.node(layerName, root, 0, 0, 720, 1280);
    for (let i = -1; i <= 1; i++) { const tile = b.node(`${layerName}Tile${i + 2}`, layer, i * 900, y, 900, height, i === 0 ? -1 : 1); b.sprite(tile, frame); }
  }
  save('assets/prefabs/environment/Background.prefab', b.finish(root));
}

{
  const b = builder('Player', 'player'); const root = b.node('Player', null, -190, 40, 88, 48); b.graphics(root);
  const plane = b.node('AircraftArtwork', root, 0, 0, 84, 56); const planeSprite = b.sprite(plane, art.player);
  b.node('PropellerAnchor', root, 54, 0, 8, 46); b.node('SmokeAnchor', root, -48, -3, 8, 8);
  b.script(root, classes.player, { artwork: { __id__: planeSprite }, gravity: -1500, flapVelocity: 520, maxFallSpeed: -760 });
  save('assets/prefabs/gameplay/Player.prefab', b.finish(root));
}
{
  const b = builder('PipePair', 'pipe'); const root = b.node('PipePair', null, 430, 0, 112, 1280); b.graphics(root);
  const bottom = b.node('BottomPipeArtwork', root, 0, -432, 132, 544); b.sprite(bottom, art.pipe);
  const top = b.node('TopPipeArtwork', root, 0, 432, 132, 544, 1, -1); b.sprite(top, art.pipe);
  b.script(root, classes.pipe, { width: 112, bottomArt: { __id__: bottom.id }, topArt: { __id__: top.id } });
  save('assets/prefabs/gameplay/PipePair.prefab', b.finish(root));
}
{
  const b = builder('DashItem', 'dash'); const root = b.node('DashItem', null, 0, 0, 54, 54); b.graphics(root);
  const glow = b.node('DashArtwork', root, 0, 0, 56, 56); b.sprite(glow, art.dash);
  b.script(root, classes.dash, { artwork: { __id__: glow.id } });
  save('assets/prefabs/gameplay/DashItem.prefab', b.finish(root));
}
{
  const b = builder('ScoreHUD', 'score'); const root = b.node('ScoreHUD', null, 0, 550, 400, 100);
  const score = b.text(root, 'ScoreLabel', '0', 0, 64, [255, 246, 194, 255]);
  b.script(root, classes.score, { scoreLabel: { __id__: score.label } });
  save('assets/prefabs/ui/ScoreHUD.prefab', b.finish(root));
}
{
  const b = builder('MainMenu', 'menu'); const root = b.node('MainMenu', null, 0, 0, 620, 650); b.sprite(root, art.panel, 1);
  b.text(root, 'Title', 'FLAPPY', 220, 58, [255, 218, 86, 255]); b.text(root, 'Title2', 'AVIATOR X', 150, 54, [239, 91, 58, 255]);
  b.text(root, 'Subtitle', 'PIXEL SKY PATROL', 88, 22, [162, 213, 218, 255]);
  const start = b.button(root, 'StartButton', 'START FLIGHT', 0, 0); const level = b.button(root, 'LevelButton', 'LEVEL SELECT', 0, -105); const quit = b.button(root, 'QuitButton', 'QUIT GAME', 0, -210);
  b.text(root, 'Tip', 'COMPLETE A MISSION TO UNLOCK THE NEXT', -285, 18, [203, 218, 208, 255]);
  b.script(root, classes.menu, { startButton: { __id__: start.node.id }, levelButton: { __id__: level.node.id }, quitButton: { __id__: quit.node.id } });
  save('assets/prefabs/ui/MainMenu.prefab', b.finish(root));
}
{
  const b = builder('GameOverPanel', 'over'); const root = b.node('GameOverPanel', null, 0, 0, 590, 600); b.sprite(root, art.panel, 1);
  b.text(root, 'Title', 'GAME OVER', 205, 52, [239, 91, 58, 255]); const score = b.text(root, 'Score', 'SCORE  0', 95, 32, [255, 240, 184, 255]); const best = b.text(root, 'Best', 'BEST  0', 40, 26, [161, 213, 217, 255]);
  const retry = b.button(root, 'RestartButton', 'RETRY', 0, -75); const menu = b.button(root, 'MenuButton', 'BACK TO MENU', 0, -180);
  b.script(root, classes.over, { scoreLabel: { __id__: score.label }, bestLabel: { __id__: best.label }, restartButton: { __id__: retry.node.id }, menuButton: { __id__: menu.node.id } });
  save('assets/prefabs/ui/GameOverPanel.prefab', b.finish(root));
}
{
  const b = builder('LevelCompletePanel', 'complete'); const root = b.node('LevelCompletePanel', null, 0, 0, 610, 650); b.sprite(root, art.panel, 1);
  const title = b.text(root, 'Title', 'MISSION COMPLETE', 220, 42, [255, 220, 92, 255]); const score = b.text(root, 'Score', 'SCORE 0', 120, 32, [169, 224, 216, 255]);
  const next = b.button(root, 'NextButton', 'NEXT MISSION', 0, 0); const select = b.button(root, 'SelectButton', 'LEVEL SELECT', 0, -105); const menu = b.button(root, 'MenuButton', 'BACK TO MENU', 0, -210);
  b.script(root, classes.complete, { titleLabel: { __id__: title.label }, scoreLabel: { __id__: score.label }, nextButton: { __id__: next.node.id }, selectButton: { __id__: select.node.id }, menuButton: { __id__: menu.node.id } });
  save('assets/prefabs/ui/LevelCompletePanel.prefab', b.finish(root));
}
{
  const b = builder('LevelSelect', 'select'); const root = b.node('LevelSelect', null, 0, 0, 650, 1000); b.sprite(root, art.panel, 1);
  b.text(root, 'Title', 'SELECT MISSION', 410, 44, [255, 220, 92, 255]); b.text(root, 'Hint', 'COMPLETE A MISSION TO UNLOCK THE NEXT', 350, 18, [164, 214, 218, 255]);
  const grid = b.node('LevelGrid', root, 0, 0, 620, 650);
  const template = b.button(grid, 'LevelButtonTemplate', 'MISSION', 0, 250, 260, 82).node;
  template.value._active = false;
  const back = b.button(root, 'BackButton', 'BACK TO MENU', 0, -410);
  b.script(root, classes.select, { levelContainer: { __id__: grid.id }, levelButtonTemplate: { __id__: template.id }, backButton: { __id__: back.node.id } });
  save('assets/prefabs/ui/LevelSelect.prefab', b.finish(root));
}

console.log(`Prefab generation complete: ${createdPrefabs} created, ${skippedPrefabs} existing files preserved.`);
