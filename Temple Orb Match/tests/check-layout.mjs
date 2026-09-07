import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const config = readFileSync(resolve(root, 'src/game/GameConfig.ts'), 'utf8');
const number = name => Number(config.match(new RegExp(`${name}:\\s*(\\d+)`))[1]);
const [cell, tile, inset] = ['cellSize', 'tileSize', 'tileInset'].map(number);
assert.equal(tile + inset * 2, cell, 'Token and hit area must remain centered in the cell');
const scene = json('assets/Scene.ls');
const node = name => scene._$child.find(item => item.name === name);
const board = node('GemLayer');
assert.equal(board.width, 8 * cell);
assert.equal(board.x * 2 + board.width, scene.width);
for (const name of ['BoardSlotLayer', 'EffectLayer']) {
    for (const key of ['x', 'y', 'width', 'height']) assert.equal(node(name)[key], board[key]);
}
assert.ok(node('GoalRoot').width >= 3 * 310 + 2 * 12, 'Three targets must fit without scrolling');
assert.ok(node('GoalRoot').y + node('GoalRoot').height < board.y);
assert.ok(board.y + board.height < node('StatusText').y);
assert.ok(node('PropBar').y + node('PropBar').height <= scene.height);
const prefabs = ['gems/Gem.lh', 'obstacles/Obstacle.lh',
    ...readdirSync(resolve(root, 'assets/resources/prefabs/special')).filter(f => f.endsWith('.lh')).map(f => `special/${f}`)];
for (const path of prefabs) {
    const prefab = json(`assets/resources/prefabs/${path}`);
    assert.equal(prefab.width, tile, path);
    assert.equal(prefab.height, tile, path);
}
console.log(`Layout passed: ${tile}px tokens, ${cell}px cells, aligned layers, three visible targets, no section overlap.`);
