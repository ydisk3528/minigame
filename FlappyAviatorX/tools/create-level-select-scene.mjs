import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'assets/scenes/LevelSelect.scene');
if (existsSync(target) && !process.argv.includes('--force')) {
  console.log('LevelSelect.scene already exists; use --force only when intentionally rebuilding this scene.');
  process.exit(0);
}

const previous = JSON.parse(readFileSync(target, 'utf8'));
const backgroundPrefab = JSON.parse(readFileSync(resolve(root, 'assets/prefabs/environment/Background.prefab'), 'utf8'));
const uiPrefab = JSON.parse(readFileSync(resolve(root, 'assets/prefabs/ui/LevelSelect.prefab'), 'utf8'));
const copy = value => structuredClone(value);
const records = [copy(previous[0]), copy(previous[1])];
records[0]._name = 'LevelSelect';
records[1]._name = 'LevelSelect';
records[1]._id = 'b2222222-2222-4222-8222-222222222222';
records[1]._children = [];

function baseNode(name, parent, layer = 33554432) {
  return {
    __type__: 'cc.Node', _name: name, _objFlags: 0, __editorExtras__: {}, _parent: parent === null ? null : { __id__: parent }, _children: [], _active: true, _components: [], _prefab: null,
    _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
    _mobility: 0, _layer: layer, _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '',
  };
}

const canvasId = records.push(baseNode('Canvas', 1)) - 1;
records[1]._children = [{ __id__: canvasId }];
records[canvasId]._lpos.x = 360; records[canvasId]._lpos.y = 640;
const cameraId = records.push(baseNode('Camera', canvasId, 1073741824)) - 1;
records[cameraId]._lpos.z = 1000;
const cameraComponentId = records.push({
  __type__: 'cc.Camera', _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: cameraId }, _enabled: true, __prefab: null,
  _projection: 0, _priority: 1073741824, _fov: 45, _fovAxis: 0, _orthoHeight: 640, _near: 1, _far: 2000,
  _color: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 }, _depth: 1, _stencil: 0, _clearFlags: 6,
  _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 }, _aperture: 19, _shutter: 7, _iso: 0, _screenScale: 1,
  _visibility: 33554432, _targetTexture: null, _postProcess: null, _usePostProcess: false, _cameraType: -1, _trackingType: 0, _id: '',
}) - 1;
records[cameraId]._components = [{ __id__: cameraComponentId }];
const canvasTransformId = records.push({
  __type__: 'cc.UITransform', _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: canvasId }, _enabled: true, __prefab: null,
  _contentSize: { __type__: 'cc.Size', width: 720, height: 1280 }, _anchorPoint: { __type__: 'cc.Vec2', x: .5, y: .5 }, _id: '',
}) - 1;
const canvasComponentId = records.push({
  __type__: 'cc.Canvas', _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: canvasId }, _enabled: true, __prefab: null,
  _cameraComponent: { __id__: cameraComponentId }, _alignCanvasWithScreen: true, _id: '',
}) - 1;
records[canvasId]._components = [{ __id__: canvasTransformId }, { __id__: canvasComponentId }];
records[canvasId]._children = [{ __id__: cameraId }];

function appendPrefab(source, parentId) {
  const kept = source.map((record, id) => ({ record, id })).filter(({ record, id }) => id > 0 && !['cc.PrefabInfo', 'cc.CompPrefabInfo'].includes(record.__type__));
  const map = new Map(kept.map(({ id }, index) => [id, records.length + index]));
  const remap = (value, key = '') => {
    if (key === '_prefab' || key === '__prefab') return null;
    if (Array.isArray(value)) return value.map(item => remap(item));
    if (!value || typeof value !== 'object') return value;
    if (Object.keys(value).length === 1 && Number.isInteger(value.__id__)) return map.has(value.__id__) ? { __id__: map.get(value.__id__) } : null;
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, remap(child, childKey)]));
  };
  for (const { record } of kept) records.push(remap(copy(record)));
  const rootId = map.get(1);
  records[rootId]._parent = { __id__: parentId };
  return rootId;
}

const backgroundId = appendPrefab(backgroundPrefab, canvasId);
const uiId = appendPrefab(uiPrefab, canvasId);
records[canvasId]._children.push({ __id__: backgroundId }, { __id__: uiId });

const findNode = name => records.findIndex(record => record.__type__ === 'cc.Node' && record._name === name);
function cloneNode(sourceId, parentId, name) {
  const source = records[sourceId];
  const nodeId = records.push(copy(source)) - 1;
  const node = records[nodeId]; node._name = name; node._parent = { __id__: parentId }; node._prefab = null; node._components = []; node._children = [];
  for (const ref of source._components) {
    const componentId = records.push(copy(records[ref.__id__])) - 1;
    records[componentId].node = { __id__: nodeId }; records[componentId].__prefab = null; node._components.push({ __id__: componentId });
  }
  for (const ref of source._children) node._children.push({ __id__: cloneNode(ref.__id__, nodeId, records[ref.__id__]._name) });
  return nodeId;
}
function setButton(buttonId, x, text) {
  records[buttonId]._lpos.x = x; records[buttonId]._lpos.y = -305;
  const transform = records[records[buttonId]._components[0].__id__]; transform._contentSize.width = 150; transform._contentSize.height = 70;
  const labelNode = records[buttonId]._children[0].__id__; records[records[labelNode]._components[1].__id__]._string = text;
}

const backId = findNode('BackButton');
const prevId = cloneNode(backId, uiId, 'PrevButton'); setButton(prevId, -205, 'PREV');
const nextId = cloneNode(backId, uiId, 'NextButton'); setButton(nextId, 205, 'NEXT');
const pageId = cloneNode(findNode('Hint'), uiId, 'PageLabel'); records[pageId]._lpos.y = -305;
records[records[pageId]._components[1].__id__]._string = '1 / 1';
records[uiId]._children.push({ __id__: prevId }, { __id__: nextId }, { __id__: pageId });

const view = records.find(record => record.__type__ === 'be267UT9X9JF7YWLT9MIk2Q');
view.prevButton = { __id__: prevId }; view.nextButton = { __id__: nextId }; view.pageLabel = { __id__: pageId };
const controllerId = records.push({
  __type__: '8f017nQb31Bpo9uEPHypMgB', _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: canvasId }, _enabled: true, __prefab: null,
  cloudLayer: { __id__: findNode('CloudLayer') }, distantTreeLayer: { __id__: findNode('DistantTreeLayer') }, grassLayer: { __id__: findNode('GrassLayer') }, _id: '',
}) - 1;
records[canvasId]._components.push({ __id__: controllerId });

const oldGlobalsStart = previous[1]._globals.__id__;
const oldGlobals = previous.slice(oldGlobalsStart);
const globalsMap = new Map(oldGlobals.map((_, index) => [index + oldGlobalsStart, records.length + index]));
const remapGlobals = value => {
  if (Array.isArray(value)) return value.map(remapGlobals);
  if (!value || typeof value !== 'object') return value;
  if (Object.keys(value).length === 1 && Number.isInteger(value.__id__)) return { __id__: globalsMap.get(value.__id__) };
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, remapGlobals(child)]));
};
for (const record of oldGlobals) records.push(remapGlobals(copy(record)));
records[1]._globals = { __id__: globalsMap.get(oldGlobalsStart) };

writeFileSync(target, `${JSON.stringify(records, null, 2)}\n`);
console.log('Rebuilt LevelSelect.scene with editor-visible Canvas, layered background, UI, and paging nodes.');
