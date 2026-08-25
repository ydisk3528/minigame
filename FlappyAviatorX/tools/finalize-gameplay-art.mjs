import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const assets = [
  ['plane-1', 720, 420, '9b3a672c-4a5b-4ebf-a88f-c43aa20d9a5e'],
  ['plane-2', 720, 420, 'b67ca7ab-1577-42d8-b0b9-6325f32bdb12'],
  ['plane-3', 720, 420, '05048b8c-b43f-4e33-a117-6ddde62ef701'],
  ['pipe-body', 480, 1536, 'dce39728-8000-435f-a90d-ce175780d4da'],
  ['smoke', 768, 512, 'b33d691c-6186-4298-ab89-bbf445bb129b'],
  ['speed-lines', 768, 512, 'c405e026-d302-480c-b217-38b571d16647'],
  ['pipe-debris', 768, 512, 'a25cf9fb-d95a-4233-9719-6b305925f300'],
  ['dash', 768, 512, 'ebd2bae8-b956-426c-81b7-b6b3933c48b1'],
];

function imageMeta(uuid, name, width, height) {
  return {
    ver: '1.0.27', importer: 'image', imported: true, uuid, files: ['.json', '.png'],
    subMetas: {
      '6c48a': {
        importer: 'texture', uuid: `${uuid}@6c48a`, displayName: name, id: '6c48a', name: 'texture',
        userData: { wrapModeS: 'clamp-to-edge', wrapModeT: 'clamp-to-edge', minfilter: 'nearest', magfilter: 'nearest', mipfilter: 'none', anisotropy: 0, isUuid: true, imageUuidOrDatabaseUri: uuid, visible: false },
        ver: '1.0.22', imported: true, files: ['.json'], subMetas: {},
      },
      f9941: {
        importer: 'sprite-frame', uuid: `${uuid}@f9941`, displayName: name, id: 'f9941', name: 'spriteFrame',
        userData: {
          trimThreshold: 1, rotated: false, offsetX: 0, offsetY: 0, trimX: 0, trimY: 0, width, height, rawWidth: width, rawHeight: height,
          borderTop: 0, borderBottom: 0, borderLeft: 0, borderRight: 0, packable: true, pixelsToUnit: 100, pivotX: .5, pivotY: .5, meshType: 0,
          isUuid: true, imageUuidOrDatabaseUri: `${uuid}@6c48a`, atlasUuid: '', trimType: 'none',
          vertices: {
            rawPosition: [-width / 2, -height / 2, 0, width / 2, -height / 2, 0, -width / 2, height / 2, 0, width / 2, height / 2, 0],
            indexes: [0, 1, 2, 2, 1, 3], uv: [0, height, width, height, 0, 0, width, 0], nuv: [0, 0, 1, 0, 0, 1, 1, 1],
            minPos: [-width / 2, -height / 2, 0], maxPos: [width / 2, height / 2, 0],
          },
        },
        ver: '1.0.12', imported: true, files: ['.json'], subMetas: {},
      },
    },
    userData: { type: 'sprite-frame', hasAlpha: true, fixAlphaTransparencyArtifacts: false, redirect: `${uuid}@6c48a` },
  };
}

let finalized = 0;
for (const [name, width, height, fallbackUuid] of assets) {
  const png = resolve(root, `assets/resources/art/gameplay/${name}.png`);
  const metaPath = `${png}.meta`;
  if (!existsSync(png)) throw new Error(`Missing ${png}`);
  const current = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;
  if (current?.imported) continue;
  writeFileSync(metaPath, `${JSON.stringify(imageMeta(current?.uuid ?? fallbackUuid, name, width, height), null, 2)}\n`);
  finalized++;
}
console.log(`Gameplay art metadata: ${finalized} finalized, ${assets.length - finalized} preserved.`);
