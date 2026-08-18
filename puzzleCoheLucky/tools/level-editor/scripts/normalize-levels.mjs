import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(import.meta.dirname, '../../../assets/resources/datas/level.csv');
const lines = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const oldColumns = lines[2].split(',');
const columns = [...oldColumns.filter((column) => column !== 'boardMask' && column !== 'propReward'), 'boardMask', 'propReward'];
const cakeOptions = Array.from({ length: 10 }, (_, index) => `cake${String(index + 1).padStart(2, '0')}`);
const patterns = ['rounded', 'diamond', 'cross', 'ring', 'hourglass', 'h', 'stairs', 'islands'];

function createMask(pattern) {
  return Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const column = index % 8;
    const x = Math.abs(column - 3.5);
    const y = Math.abs(row - 3.5);
    if (pattern === 'rounded') return !((row === 0 || row === 7) && (column === 0 || column === 7));
    if (pattern === 'diamond') return x + y <= 4;
    if (pattern === 'cross') return (row >= 2 && row <= 5) || (column >= 2 && column <= 5);
    if (pattern === 'ring') return x + y >= 2 && x + y <= 5;
    if (pattern === 'hourglass') return x <= Math.max(1, Math.floor(y));
    if (pattern === 'h') return column <= 1 || column >= 6 || row === 3 || row === 4;
    if (pattern === 'stairs') return column >= row - 1 && column <= row + 4;
    if (pattern === 'islands') return (row <= 2 && column <= 3) || (row >= 5 && column >= 4);
    return true;
  }).map((cell) => cell ? '1' : '0').join('');
}

const output = [
  [...lines[0].split(',').slice(0, columns.length - 2), '棋盘形状64位掩码', '首次通关道具奖励'].join(','),
  [...lines[1].split(',').slice(0, columns.length - 2), 'string', 'string'].join(','),
  columns.join(','),
];

for (const line of lines.slice(3)) {
  const values = line.split(',');
  const level = Object.fromEntries(oldColumns.map((column, index) => [column, values[index] ?? '']));
  const cakes = [...new Set(level.cakes.split('|').filter(Boolean))];
  for (const cake of cakeOptions) {
    if (cakes.length >= 3) break;
    if (!cakes.includes(cake)) cakes.push(cake);
  }
  level.cakes = cakes.join('|');
  const id = Number(level.ID);
  level.boardMask = /^[01]{64}$/.test(level.boardMask || '')
    ? level.boardMask
    : createMask(patterns[(id - 1) % patterns.length]);
  level.propReward = level.propReward || 'none';
  output.push(columns.map((column) => level[column] ?? '').join(','));
}

await writeFile(path, output.join('\n') + '\n', 'utf8');
console.log(`Normalized ${output.length - 3} levels in ${path}`);
