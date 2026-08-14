import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BOARD_ROWS = 8;
const BOARD_COLUMNS = 26;
const MAX_LEVEL_COUNT = 10_000;
const requestedLevelCount = Number.parseInt(process.argv[2] ?? '1000', 10);
const levelCount = Math.min(
  MAX_LEVEL_COUNT,
  Math.max(1, Number.isFinite(requestedLevelCount) ? requestedLevelCount : 1000),
);
const EASY_SHAPES = [1, 2, 3, 4, 5, 6, 7, 10];
const NORMAL_SHAPES = Array.from({ length: 24 }, (_, index) => index + 1);
const HARD_SHAPES = Array.from({ length: 27 }, (_, index) => index + 1);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, '../../../assets/resources/levels');
const DEFAULT_TARGET_MULTIPLIER = 3;
const DEFAULT_MOVE_MULTIPLIER = 1.25;
const MIN_COIN_REWARD = 100;
const MAX_COIN_REWARD = 500;

const profiles = {
  easy: {
    blockDensity: 100,
    matchDensity: 100,
    blockTarget: 400,
    matchTarget: 500,
    blockStep: 50,
    matchStep: 30,
    moveLimit: 42,
    colorCount: 0,
    progressCap: 4,
    shapes: EASY_SHAPES,
  },
  normal: {
    blockDensity: 90,
    matchDensity: 96,
    blockTarget: 1400,
    matchTarget: 950,
    blockStep: 80,
    matchStep: 50,
    moveLimit: 32,
    colorCount: 0,
    progressCap: 19,
    shapes: NORMAL_SHAPES,
  },
  hard: {
    blockDensity: 74,
    matchDensity: 88,
    blockTarget: 2600,
    matchTarget: 1600,
    blockStep: 120,
    matchStep: 80,
    moveLimit: 25,
    colorCount: 0,
    progressCap: 24,
    shapes: HARD_SHAPES,
  },
};

function difficultyForLevel(id) {
  const progress = (id - 1) / Math.max(1, levelCount);
  return progress < 1 / 3 ? 'easy' : progress < 2 / 3 ? 'normal' : 'hard';
}

function modeForLevel(id) {
  void id;
  return 'match3';
}

function createRandom(seed) {
  let state = (seed * 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function createMask(id, density) {
  const difficulty = difficultyForLevel(id);
  const difficultyColumns = difficulty === 'easy' ? 8 : difficulty === 'normal' ? 10 : 12;
  const progressionColumns = id <= 10 ? 8
    : id <= 50 ? 10
      : id <= 100 ? 12
        : id <= 250 ? 16
          : id <= 500 ? 20
            : id <= 750 ? 24 : 26;
  const playableColumns = Math.max(difficultyColumns, progressionColumns);
  const firstColumn = Math.floor((BOARD_COLUMNS - playableColumns) / 2);
  const lastColumn = firstColumn + playableColumns - 1;
  // Deterministic rotation guarantees that late levels cannot collapse into a
  // long run of identical full rectangles. Every 11th level stays organic.
  const patternRoll = id % 11 === 0 ? 0 : 2 + ((id - 1) % 10);
  if (patternRoll >= 2) {
    return createPresetMask(patternRoll, firstColumn, lastColumn);
  }
  const random = createRandom(id * 97 + density);
  const grid = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLUMNS).fill(false));
  const active = new Set();
  const playableCellCount = BOARD_ROWS * playableColumns;
  const target = Math.min(
    playableCellCount,
    Math.max(Math.min(12, playableCellCount), Math.round(playableCellCount * density / 100)),
  );
  const isInsidePlayableArea = (row, column) => row >= 0 && row < BOARD_ROWS
    && column >= firstColumn && column <= lastColumn;
  const add = (row, column) => {
    if (!isInsidePlayableArea(row, column)) return;
    grid[row][column] = true;
    active.add(`${row}:${column}`);
    const mirrorColumn = firstColumn + lastColumn - column;
    grid[row][mirrorColumn] = true;
    active.add(`${row}:${mirrorColumn}`);
  };
  const centerColumn = Math.floor((firstColumn + lastColumn) / 2);
  add(3, centerColumn);
  add(4, centerColumn);
  while (active.size < target) {
    const frontier = new Map();
    for (const key of active) {
      const [row, column] = key.split(':').map(Number);
      for (const [rowOffset, columnOffset] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nextRow = row + rowOffset;
        const nextColumn = column + columnOffset;
        const nextKey = `${nextRow}:${nextColumn}`;
        if (isInsidePlayableArea(nextRow, nextColumn) && !active.has(nextKey)) {
          frontier.set(nextKey, [nextRow, nextColumn]);
        }
      }
    }
    const candidates = [...frontier.values()];
    if (candidates.length === 0) break;
    const [row, column] = candidates[Math.floor(random() * candidates.length)];
    add(row, column);
  }
  return grid.map((row) => row.map((activeCell) => activeCell ? '1' : '0').join(''));
}

function createBlockBlastMask() {
  const playableColumns = 8;
  const firstColumn = Math.floor((BOARD_COLUMNS - playableColumns) / 2);
  const row = `${'0'.repeat(firstColumn)}${'1'.repeat(playableColumns)}${'0'.repeat(
    BOARD_COLUMNS - firstColumn - playableColumns,
  )}`;
  return Array.from({ length: BOARD_ROWS }, () => row);
}

function createPresetMask(patternRoll, firstColumn, lastColumn) {
  const centerColumn = (firstColumn + lastColumn) / 2;
  const playableColumns = lastColumn - firstColumn + 1;
  const columnWeight = 8 / playableColumns;
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      if (patternRoll === 2) {
        if (column < firstColumn || column > lastColumn) return '0';
        return Math.abs(row - 3.5) + Math.abs(column - centerColumn) * columnWeight <= 4 ? '1' : '0';
      }
      if (patternRoll === 3) {
        if (column < firstColumn || column > lastColumn) return '0';
        return (row >= 2 && row <= 5) || Math.abs(column - centerColumn) <= 1.5 ? '1' : '0';
      }
      if (patternRoll === 4) {
        if (column < firstColumn || column > lastColumn) return '0';
        const corner = (row === 0 || row === BOARD_ROWS - 1)
          && (column === firstColumn || column === lastColumn);
        return corner ? '0' : '1';
      }
      if (patternRoll === 5) {
        return column >= firstColumn && column <= lastColumn ? '1' : '0';
      }
      if (patternRoll === 6) {
        if (column < firstColumn || column > lastColumn) return '0';
        const halfWidth = Math.max(2, Math.floor(
          playableColumns * (0.18 + Math.abs(row - 3.5) * 0.035),
        ));
        return Math.abs(column - centerColumn) <= halfWidth ? '1' : '0';
      }
      if (patternRoll === 7) {
        if (column < firstColumn || column > lastColumn) return '0';
        const sideWidth = Math.max(2, Math.floor(playableColumns * 0.16));
        const side = column < firstColumn + sideWidth || column > lastColumn - sideWidth;
        return side || row === 3 || row === 4 ? '1' : '0';
      }
      if (patternRoll === 8) {
        const width = Math.max(6, Math.round(playableColumns * 0.62));
        const shift = Math.round(Math.max(0, playableColumns - width) * row / (BOARD_ROWS - 1));
        return column >= firstColumn + shift && column < firstColumn + shift + width ? '1' : '0';
      }
      if (patternRoll === 9) {
        const leftWidth = Math.max(4, Math.floor(playableColumns * 0.32));
        const leftSquare = row >= 2 && row <= 5
          && column >= firstColumn && column < firstColumn + leftWidth;
        const rightCenter = firstColumn + playableColumns * 0.78;
        const rightDiamond = Math.abs(row - 3.5)
          + Math.abs(column - rightCenter) * columnWeight * 1.55 <= 3.6;
        return leftSquare || rightDiamond ? '1' : '0';
      }
      if (patternRoll === 10) {
        const centers = [
          firstColumn + playableColumns * 0.24,
          firstColumn + playableColumns * 0.76,
        ];
        const inDiamond = centers.some((center) =>
          Math.abs(row - 3.5) + Math.abs(column - center) * columnWeight * 1.8 <= 3.2);
        return inDiamond ? '1' : '0';
      }
      const inset = Math.floor(Math.abs(row - 3.5) / 2);
      const wingWidth = Math.max(4, Math.floor(playableColumns * 0.34));
      const leftWing = column >= firstColumn + inset && column < firstColumn + wingWidth;
      const rightWing = column > lastColumn - wingWidth && column <= lastColumn - inset;
      return leftWing || rightWing ? '1' : '0';
    }).join(''));
}

function targetForLevel(id, mode, profile) {
  const difficulty = difficultyForLevel(id);
  const difficultyStart = difficulty === 'easy' ? 1
    : difficulty === 'normal' ? Math.ceil(levelCount / 3) + 1
      : Math.ceil(levelCount * 2 / 3) + 1;
  const pairProgress = Math.min(
    profile.progressCap,
    Math.max(0, Math.floor((id - difficultyStart) / 2)),
  );
  const baseTarget = mode === 'match3'
    ? profile.matchTarget + pairProgress * profile.matchStep
    : profile.blockTarget + pairProgress * profile.blockStep;
  return Math.round(baseTarget * DEFAULT_TARGET_MULTIPLIER / 50) * 50;
}

function createLevel(id) {
  const difficulty = difficultyForLevel(id);
  const mode = modeForLevel(id);
  const profile = profiles[difficulty];
  const density = mode === 'match3' ? profile.matchDensity : profile.blockDensity;
  return {
    id,
    gameMode: mode,
    difficulty,
    targetScore: targetForLevel(id, mode, profile),
    availableShapes: [...profile.shapes],
    reward: MIN_COIN_REWARD + Math.floor(
      createRandom(id * 3571)() * (MAX_COIN_REWARD - MIN_COIN_REWARD + 1),
    ),
    boardMask: mode === 'blockPuzzle' ? createBlockBlastMask() : createMask(id, density),
    ...(mode === 'match3'
      ? {
          match3Config: {
            moveLimit: Math.min(99, Math.round(profile.moveLimit * DEFAULT_MOVE_MULTIPLIER)),
            colorCount: profile.colorCount,
            matchLength: 3,
          },
        }
      : {}),
  };
}

await mkdir(outputDirectory, { recursive: true });
for (let id = 1; id <= levelCount; id += 1) {
  const name = `level_${String(id).padStart(3, '0')}.json`;
  await writeFile(resolve(outputDirectory, name), `${JSON.stringify(createLevel(id), null, 2)}\n`, 'utf8');
}

console.log(`Generated ${levelCount} balanced levels in ${outputDirectory}`);
