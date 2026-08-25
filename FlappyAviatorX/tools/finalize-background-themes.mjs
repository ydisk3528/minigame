import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const base = resolve(root, 'assets/resources/art/background/themes');
const template = JSON.parse(readFileSync(resolve(root, 'assets/resources/art/background/sky.png.meta'), 'utf8'));
const assets = ['sunset/sky', 'sunset/clouds', 'sunset/distant-trees', 'sunset/grass', 'night/sky', 'night/clouds', 'night/distant-trees', 'night/grass'];

function uuid(key) {
  const hex = createHash('sha256').update(`flappy-background:${key}`).digest('hex').slice(0, 32).split('');
  hex[12] = '4'; hex[16] = '8';
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20).join('')}`;
}

function writeIfMissing(path, data) {
  if (!existsSync(path)) writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

for (const directory of ['themes', 'themes/sunset', 'themes/night']) {
  writeIfMissing(resolve(root, `assets/resources/art/background/${directory}.meta`), {
    ver: '1.2.0', importer: 'directory', imported: true, uuid: uuid(directory), files: [], subMetas: {}, userData: {}
  });
}

for (const asset of assets) {
  const id = uuid(asset);
  const name = basename(asset);
  const meta = structuredClone(template);
  meta.uuid = id;
  meta.subMetas['6c48a'].uuid = `${id}@6c48a`;
  meta.subMetas['6c48a'].displayName = name;
  meta.subMetas['6c48a'].userData.imageUuidOrDatabaseUri = id;
  const frame = meta.subMetas.f9941;
  frame.uuid = `${id}@f9941`;
  frame.displayName = name;
  Object.assign(frame.userData, { width: 1536, height: 256, rawWidth: 1536, rawHeight: 256, imageUuidOrDatabaseUri: `${id}@6c48a` });
  Object.assign(frame.userData.vertices, {
    rawPosition: [-768, -128, 0, 768, -128, 0, -768, 128, 0, 768, 128, 0],
    uv: [0, 256, 1536, 256, 0, 0, 1536, 0], minPos: [-768, -128, 0], maxPos: [768, 128, 0]
  });
  meta.userData.redirect = `${id}@6c48a`;
  writeIfMissing(resolve(base, `${asset}.png.meta`), meta);
}

console.log('Background theme metadata is ready. Existing imported metadata was preserved.');
