import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const path = resolve(import.meta.dirname, '../../../assets/resources/datas/level.csv');
const lines = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const columns = lines[2].split(',');
const failures = [];

function hasChain(mask) {
  for (let index = 0; index < 64; index++) {
    if (mask[index] !== '1') continue;
    const row = Math.floor(index / 8);
    const column = index % 8;
    let neighbors = 0;
    for (let y = row - 1; y <= row + 1; y++) {
      for (let x = column - 1; x <= column + 1; x++) {
        if (x < 0 || y < 0 || x >= 8 || y >= 8 || (x === column && y === row)) continue;
        if (mask[y * 8 + x] === '1') neighbors++;
      }
    }
    if (neighbors >= 2) return true;
  }
  return false;
}

for (const line of lines.slice(3)) {
  const values = line.split(',');
  const level = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']));
  const colors = new Set(level.cakes.split('|').filter(Boolean));
  if (colors.size < 3) failures.push(`level ${level.ID}: fewer than 3 colors`);
  if (!/^[01]{64}$/.test(level.boardMask)) failures.push(`level ${level.ID}: invalid boardMask`);
  else if (!hasChain(level.boardMask)) failures.push(`level ${level.ID}: no legal 3-cell chain`);
  if (!/^(none|random:[1-9]\d*|[1-4]:[1-9]\d*)$/.test(level.propReward)) failures.push(`level ${level.ID}: invalid propReward`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Validated ${lines.length - 3} levels: masks playable, colors >= 3, prop rewards valid.`);
