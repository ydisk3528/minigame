<script setup lang="ts">
import { computed, ref } from 'vue';
import JSZip from 'jszip';

type Grid = boolean[][];
type GameMode = 'blockPuzzle' | 'match3';
type BatchMode = GameMode | 'mixed';
type Difficulty = 'easy' | 'normal' | 'hard';
type Pacing = 'quick' | 'experience' | 'long';
type MatchLength = 3 | 4 | 5;
type BoardPattern =
  | 'connected'
  | 'presetRandom'
  | 'diamond'
  | 'cross'
  | 'rounded'
  | 'full'
  | 'hourglass'
  | 'hShape'
  | 'stairs'
  | 'doubleIsland'
  | 'doubleDiamond'
  | 'wings'
  | 'mixed';
type BoosterRewardType = 'bomb' | 'hammer' | 'rainbow' | 'random' | 'all';
type GuaranteedMatchFeature = 'rocketHorizontal' | 'rocketVertical' | 'bomb' | 'rainbow' | 'vortex';

interface RangeRule {
  uid: number;
  startLevel: number;
  endLevel: number;
  difficulty: Difficulty;
  pacing: Pacing;
  grantBooster: boolean;
  boosterType: BoosterRewardType;
  boosterAmount: number;
  coinReward: number;
  boardPattern: BoardPattern;
  matchLength: MatchLength;
  guaranteedFeatures: GuaranteedMatchFeature[];
}

interface LevelJson {
  id: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  targetScore: number;
  availableShapes: number[];
  reward: number;
  boardMask: string[];
  match3Config?: {
    moveLimit: number;
    colorCount: number;
    matchLength: MatchLength;
    guaranteedFeatures?: GuaranteedMatchFeature[];
  };
  boosterReward?: {
    type: BoosterRewardType;
    amount: number;
  };
}

const BOARD_ROWS = 8;
const BOARD_COLUMNS = 26;
const MAX_LEVEL_COUNT = 10_000;
const MAX_BATCH_COUNT = 10_000;
const MIN_COIN_REWARD = 100;
const MAX_COIN_REWARD = 500;
const shapeNames = [
  '单格', '横二格', '竖二格', '横三格', '竖三格', '横四格', '竖四格',
  '横五格', '竖五格', '2×2 方块', '3×2 矩形', '2×3 矩形', '小 L',
  '镜像小 L', '大 L', '镜像大 L', '正 T', '倒 T', '横 Z', '横 S',
  '竖 Z', '竖 S', '十字', 'U 形', '上三角', '下三角', '空心菱形',
];

const levelId = ref(1);
const selectedMode = ref<GameMode>('match3');
const targetScore = ref(1000);
const autoBalance = ref(true);
const reward = ref(MAX_COIN_REWARD);
const density = ref(100);
const pacing = ref<Pacing>('experience');
const seed = ref(`${Date.now()}`);
const symmetric = ref(true);
const boardPattern = ref<BoardPattern>('mixed');
const matchLength = ref<MatchLength>(4);
const batchCount = ref(10);
const selectedShapes = ref<number[]>(Array.from({ length: 27 }, (_, index) => index + 1));
const selectedGuaranteedFeatures = ref<GuaranteedMatchFeature[]>(['vortex']);
const guaranteedFeatureOptions: ReadonlyArray<{ value: GuaranteedMatchFeature; label: string; hint: string }> = [
  { value: 'vortex', label: '黑洞吸附', hint: '初始棋盘必有一步可组成同色 2×2' },
  { value: 'rocketHorizontal', label: '横向火箭', hint: '初始棋盘直接出现一个横向火箭' },
  { value: 'rocketVertical', label: '纵向火箭', hint: '初始棋盘直接出现一个纵向火箭' },
  { value: 'bomb', label: '范围炸弹', hint: '初始棋盘直接出现一个范围炸弹' },
  { value: 'rainbow', label: '彩虹宝石', hint: '初始棋盘直接出现一个彩虹宝石' },
];
const notice = ref('点击棋盘格可以手动开关');
const rangeRules = ref<RangeRule[]>([]);
let nextRuleUid = 1;

const modeForLevel = (id: number): GameMode => {
  void id;
  return selectedMode.value;
};
const currentMode = computed(() => modeForLevel(Math.max(1, Math.floor(levelId.value))));

function selectMode(mode: GameMode): void {
  if (selectedMode.value === mode) return;
  selectedMode.value = mode;
  density.value = densityForLevel(levelId.value);
  targetScore.value = targetForLevel(levelId.value);
  grid.value = mode === 'blockPuzzle'
    ? blockBlastGrid()
    : generateGridForLevel(levelId.value, seed.value, density.value);
  notice.value = mode === 'match3'
    ? '已切换到消消乐模式，导出时会包含 match3Config。'
    : '已切换到 Block Blast 模式，导出时只包含方块玩法字段。';
}
const boardColumnsForLevel = (id: number): number => {
  const levelDifficulty = difficultyForLevel(Math.max(1, Math.floor(id)));
  const difficultyColumns = levelDifficulty === 'easy' ? 8 : levelDifficulty === 'normal' ? 10 : 12;
  const progressionColumns = id <= 10 ? 8
    : id <= 50 ? 10
      : id <= 100 ? 12
        : id <= 250 ? 16
          : id <= 500 ? 20
            : id <= 750 ? 24 : 26;
  return Math.max(difficultyColumns, progressionColumns);
};
const effectiveBoardColumns = computed(() => boardColumnsForLevel(levelId.value));
interface DifficultyProfile {
  blockDensity: number;
  matchDensity: number;
  blockTarget: number;
  matchTarget: number;
  blockStep: number;
  matchStep: number;
  moveLimit: number;
  colorCount: number;
  progressCap: number;
}

interface PacingProfile {
  targetMultiplier: number;
  moveMultiplier: number;
}

const pacingProfiles: Record<Pacing, PacingProfile> = {
  quick: { targetMultiplier: 1.5, moveMultiplier: 1 },
  experience: { targetMultiplier: 3, moveMultiplier: 1.25 },
  long: { targetMultiplier: 5, moveMultiplier: 1.55 },
};

const difficultyProfiles: Record<Difficulty, DifficultyProfile> = {
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
  },
};

const EASY_SHAPE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 10]);

function profileForLevel(id: number): DifficultyProfile {
  return difficultyProfiles[difficultyForLevel(id)];
}

function densityForLevel(id: number): number {
  const profile = profileForLevel(id);
  return modeForLevel(id) === 'match3' ? profile.matchDensity : profile.blockDensity;
}

function targetForLevel(id: number): number {
  if (!autoBalance.value && id === Math.floor(levelId.value)) {
    return Math.max(1, Math.floor(targetScore.value));
  }
  const profile = profileForLevel(id);
  const levelDifficulty = difficultyForLevel(id);
  const batchStart = Math.max(1, Math.floor(levelId.value));
  const count = Math.max(1, Math.floor(batchCount.value));
  const inAutoBatch = ruleForLevel(id) === undefined
    && count > 1 && id >= batchStart && id < batchStart + count;
  const difficultyStart = inAutoBatch
    ? levelDifficulty === 'easy' ? batchStart
      : levelDifficulty === 'normal' ? batchStart + Math.ceil(count / 3)
        : batchStart + Math.ceil(count * 2 / 3)
    : levelDifficulty === 'easy' ? 1 : levelDifficulty === 'normal' ? 11 : 51;
  const pairProgress = Math.min(
    profile.progressCap,
    Math.max(0, Math.floor((id - difficultyStart) / 2)),
  );
  const baseTarget = modeForLevel(id) === 'match3'
    ? profile.matchTarget + pairProgress * profile.matchStep
    : profile.blockTarget + pairProgress * profile.blockStep;
  return Math.round(baseTarget * pacingProfiles[pacingForLevel(id)].targetMultiplier / 50) * 50;
}

function shapesForLevel(id: number): number[] {
  const selected = [...selectedShapes.value].sort((a, b) => a - b);
  if (difficultyForLevel(id) !== 'easy' || modeForLevel(id) === 'match3') {
    return selected;
  }
  const easyShapes = selected.filter((shapeId) => EASY_SHAPE_IDS.has(shapeId));
  return easyShapes.length > 0 ? easyShapes : [...EASY_SHAPE_IDS];
}

function matchConfigForLevel(id: number): NonNullable<LevelJson['match3Config']> {
  const profile = profileForLevel(id);
  const guaranteedFeatures = guaranteedFeaturesForLevel(id);
  return {
    moveLimit: Math.min(99, Math.round(
      profile.moveLimit * pacingProfiles[pacingForLevel(id)].moveMultiplier,
    )),
    colorCount: profile.colorCount,
    matchLength: ruleForLevel(id)?.matchLength ?? matchLength.value,
    ...(guaranteedFeatures.length === 0 ? {} : { guaranteedFeatures }),
  };
}

function addRangeRule(): void {
  rangeRules.value.push({
    uid: nextRuleUid++,
    startLevel: 1,
    endLevel: 5,
    difficulty: 'easy',
    pacing: 'experience',
    grantBooster: false,
    boosterType: 'random',
    boosterAmount: 1,
    coinReward: MAX_COIN_REWARD,
    boardPattern: 'mixed',
    matchLength: 4,
    guaranteedFeatures: [],
  });
}

function removeRangeRule(uid: number): void {
  rangeRules.value = rangeRules.value.filter((rule) => rule.uid !== uid);
}

function ruleForLevel(id: number): RangeRule | undefined {
  return [...rangeRules.value].reverse().find((rule) =>
    id >= Math.min(rule.startLevel, rule.endLevel)
    && id <= Math.max(rule.startLevel, rule.endLevel));
}

function difficultyForLevel(id: number): Difficulty {
  const rule = ruleForLevel(id);
  if (rule !== undefined) return rule.difficulty;
  const start = Math.max(1, Math.floor(levelId.value));
  const count = Math.max(1, Math.floor(batchCount.value));
  if (count > 1 && id >= start && id < start + count) {
    const progress = (id - start) / count;
    return progress < 1 / 3 ? 'easy' : progress < 2 / 3 ? 'normal' : 'hard';
  }
  return id <= 100 ? 'easy' : id <= 500 ? 'normal' : 'hard';
}

function pacingForLevel(id: number): Pacing {
  return ruleForLevel(id)?.pacing ?? pacing.value;
}

function selectPacing(value: Pacing): void {
  pacing.value = value;
  targetScore.value = targetForLevel(levelId.value);
  const profile = pacingProfiles[value];
  notice.value = value === 'quick'
    ? '快速：适合测试基础流程，目标约为原来的 1.5 倍'
    : value === 'experience'
      ? '体验：容易消除但不会几秒结束，推荐用于体验特殊元素'
      : '耐玩：目标更高、步数更多，适合正式长关卡';
}

function boosterRewardForLevel(id: number): LevelJson['boosterReward'] {
  const rule = ruleForLevel(id);
  if (rule !== undefined) {
    if (!rule.grantBooster) return undefined;
    return {
      type: rule.boosterType,
      amount: Math.max(1, Math.floor(rule.boosterAmount)),
    };
  }
  const levelDifficulty = difficultyForLevel(id);
  const random = createRandom(`${seed.value}-auto-booster-${id}`);
  const chance = levelDifficulty === 'easy' ? 0.1 : levelDifficulty === 'normal' ? 0.18 : 0.28;
  if (random() >= chance) return undefined;
  if (levelDifficulty === 'easy') {
    return { type: 'hammer', amount: 1 };
  }
  if (levelDifficulty === 'normal') {
    return { type: random() < 0.5 ? 'hammer' : 'bomb', amount: 1 };
  }
  return {
    type: random() < 0.5 ? 'rainbow' : 'bomb',
    amount: random() < 0.12 ? 2 : 1,
  };
}

function coinRewardForLevel(id: number): number {
  const configuredReward = ruleForLevel(id)?.coinReward ?? reward.value;
  const maximum = Math.max(
    MIN_COIN_REWARD,
    Math.min(MAX_COIN_REWARD, Math.floor(configuredReward)),
  );
  const random = createRandom(`${seed.value}-coin-${id}`);
  return MIN_COIN_REWARD + Math.floor(random() * (maximum - MIN_COIN_REWARD + 1));
}

function boardPatternForLevel(id: number): BoardPattern {
  return ruleForLevel(id)?.boardPattern ?? boardPattern.value;
}

function guaranteedFeaturesForLevel(id: number): GuaranteedMatchFeature[] {
  if (modeForLevel(id) !== 'match3') return [];
  const rule = ruleForLevel(id);
  const source = [
    ...selectedGuaranteedFeatures.value,
    ...(rule?.guaranteedFeatures ?? []),
  ];
  return [...new Set(source)];
}

const emptyGrid = (): Grid => Array.from({ length: BOARD_ROWS }, () =>
  Array.from({ length: BOARD_COLUMNS }, () => false));

function playableColumnBounds(id = levelId.value): { first: number; last: number; count: number } {
  const count = boardColumnsForLevel(id);
  const first = Math.floor((BOARD_COLUMNS - count) / 2);
  return { first, last: first + count - 1, count };
}

const fullGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) =>
      column >= bounds.first && column <= bounds.last));
};

const blockBlastGrid = (): Grid => {
  const playableColumns = 8;
  const firstColumn = Math.floor((BOARD_COLUMNS - playableColumns) / 2);
  const lastColumn = firstColumn + playableColumns - 1;
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) =>
      column >= firstColumn && column <= lastColumn));
};

const diamondGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  const centerColumn = (bounds.first + bounds.last) / 2;
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) =>
      column >= bounds.first && column <= bounds.last
      && Math.abs(row - 3.5) + Math.abs(column - centerColumn) * (8 / bounds.count) <= 4));
};

const roundedGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      if (column < bounds.first || column > bounds.last) return false;
      const outerRow = row === 0 || row === BOARD_ROWS - 1;
      const outerColumn = column === bounds.first || column === bounds.last;
      return !(outerRow && outerColumn);
    }));
};

const crossGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  const centerColumn = (bounds.first + bounds.last) / 2;
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) =>
      column >= bounds.first && column <= bounds.last
      && ((row >= 2 && row <= 5) || Math.abs(column - centerColumn) <= 1.5)));
};

const hourglassGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  const centerColumn = (bounds.first + bounds.last) / 2;
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      if (column < bounds.first || column > bounds.last) return false;
      const halfWidth = Math.max(2, Math.floor(
        bounds.count * (0.18 + Math.abs(row - 3.5) * 0.035),
      ));
      return Math.abs(column - centerColumn) <= halfWidth;
    }));
};

const hShapeGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      if (column < bounds.first || column > bounds.last) return false;
      const sideWidth = Math.max(2, Math.floor(bounds.count * 0.16));
      const side = column < bounds.first + sideWidth || column > bounds.last - sideWidth;
      return side || row === 3 || row === 4;
    }));
};

const stairsGrid = (id = levelId.value): Grid => {
  const bounds = playableColumnBounds(id);
  const width = Math.max(6, Math.round(bounds.count * 0.62));
  const maxShift = Math.max(0, bounds.count - width);
  return Array.from({ length: BOARD_ROWS }, (_, row) => {
    const shift = Math.round(maxShift * row / (BOARD_ROWS - 1));
    return Array.from({ length: BOARD_COLUMNS }, (_, column) =>
      column >= bounds.first + shift && column < bounds.first + shift + width);
  });
};

// This preset deliberately uses the whole landscape board so both islands stay
// large enough for legal 4-gem matches, even when the level difficulty is easy.
const doubleIslandGrid = (): Grid => {
  const leftFirst = 0;
  const leftLast = 7;
  const rightCenterColumn = 20;
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      const leftSquare = row >= 2 && row <= 5
        && column >= leftFirst && column <= leftLast;
      const rightDiamond = Math.abs(row - 3.5)
        + Math.abs(column - rightCenterColumn) * 0.48 <= 3.6;
      return leftSquare || rightDiamond;
    }));
};

const doubleDiamondGrid = (): Grid => {
  const centers = [6, 19];
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) =>
      centers.some((center) => Math.abs(row - 3.5) + Math.abs(column - center) * 0.62 <= 3.2)));
};

const wingsGrid = (): Grid => {
  return Array.from({ length: BOARD_ROWS }, (_, row) =>
    Array.from({ length: BOARD_COLUMNS }, (_, column) => {
      const inset = Math.floor(Math.abs(row - 3.5) / 2);
      const leftWing = column >= inset && column <= 8;
      const rightWing = column >= 17 && column <= 25 - inset;
      return leftWing || rightWing;
    }));
};

function presetGrid(pattern: BoardPattern, id = levelId.value): Grid | null {
  if (pattern === 'full') return fullGrid(id);
  if (pattern === 'diamond') return diamondGrid(id);
  if (pattern === 'rounded') return roundedGrid(id);
  if (pattern === 'cross') return crossGrid(id);
  if (pattern === 'hourglass') return hourglassGrid(id);
  if (pattern === 'hShape') return hShapeGrid(id);
  if (pattern === 'stairs') return stairsGrid(id);
  if (pattern === 'doubleIsland') return doubleIslandGrid();
  if (pattern === 'doubleDiamond') return doubleDiamondGrid();
  if (pattern === 'wings') return wingsGrid();
  return null;
}

const PRESET_PATTERNS: readonly BoardPattern[] = [
  'full', 'diamond', 'rounded', 'cross', 'hourglass',
  'hShape', 'stairs', 'doubleIsland', 'doubleDiamond', 'wings',
];

const grid = ref<Grid>(generateGridForLevel(levelId.value, seed.value, density.value));

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seedText: string): () => number {
  let state = hashSeed(seedText) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function generateConnectedGrid(
  seedText: string,
  densityPercent = density.value,
  id = levelId.value,
): Grid {
  const random = createRandom(seedText);
  const result = emptyGrid();
  const bounds = playableColumnBounds(id);
  const playableCellCount = BOARD_ROWS * bounds.count;
  const target = Math.min(
    playableCellCount,
    Math.max(Math.min(12, playableCellCount), Math.round(playableCellCount * densityPercent / 100)),
  );
  const active = new Set<string>();
  const isInsidePlayableArea = (row: number, column: number): boolean =>
    row >= 0 && row < BOARD_ROWS && column >= bounds.first && column <= bounds.last;
  const add = (row: number, column: number): void => {
    if (!isInsidePlayableArea(row, column)) return;
    result[row][column] = true;
    active.add(`${row}:${column}`);
    if (symmetric.value) {
      const mirrorColumn = bounds.first + bounds.last - column;
      result[row][mirrorColumn] = true;
      active.add(`${row}:${mirrorColumn}`);
    }
  };

  const centerColumn = Math.floor((bounds.first + bounds.last) / 2);
  add(3, centerColumn);
  add(4, centerColumn);
  while (active.size < target) {
    const frontier = new Map<string, [number, number]>();
    for (const key of active) {
      const [row, column] = key.split(':').map(Number);
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nextRow = row + dr;
        const nextColumn = column + dc;
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
  return result;
}

function generateGridForLevel(
  id: number,
  seedText: string,
  densityPercent = densityForLevel(id),
): Grid {
  let pattern = boardPatternForLevel(id);
  const presetOffset = hashSeed(`${seed.value}-preset-order`) % PRESET_PATTERNS.length;
  const rotatingPreset = PRESET_PATTERNS[
    (presetOffset + Math.max(0, id - 1)) % PRESET_PATTERNS.length
  ];
  if (pattern === 'presetRandom') {
    // Seeded rotation prevents a late batch from degenerating into repeated
    // rectangles while remaining reproducible for the same seed.
    pattern = rotatingPreset;
  } else if (pattern === 'mixed') {
    pattern = id % 11 === 0 ? 'connected' : rotatingPreset;
  }
  const preset = presetGrid(pattern, id);
  if (preset !== null) return preset;
  return generateConnectedGrid(seedText, densityPercent, id);
}

function applyPreset(type: BoardPattern): void {
  grid.value = presetGrid(type) ?? generateConnectedGrid(seed.value);
  notice.value = '预设已应用，可以继续点击微调';
}

function randomize(): void {
  grid.value = generateGridForLevel(levelId.value, seed.value, density.value);
  notice.value = `已按种子 ${seed.value} 生成`;
}

function newSeedAndRandomize(): void {
  seed.value = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  randomize();
}

function generateCurrentLevel(): void {
  density.value = densityForLevel(levelId.value);
  targetScore.value = targetForLevel(levelId.value);
  newSeedAndRandomize();
  if (currentMode.value === 'blockPuzzle') grid.value = blockBlastGrid();
  const modeName = currentMode.value === 'match3' ? '消消乐' : 'Block Blast';
  notice.value = `已生成第 ${levelId.value} 关 · ${modeName} · ${difficultyForLevel(levelId.value)}`;
}

function toggleCell(row: number, column: number): void {
  grid.value[row][column] = !grid.value[row][column];
  grid.value = grid.value.map((line) => [...line]);
}

const boardMask = computed(() => grid.value.map((row) =>
  row.map((active) => active ? '1' : '0').join('')));

const activeCount = computed(() => grid.value.flat().filter(Boolean).length);

function previewColor(row: number, column: number): string | undefined {
  if (currentMode.value !== 'match3' || !grid.value[row][column]) return undefined;
  const palette = ['#44b9ff', '#4ce39d', '#ffda46', '#ff8747', '#b566ff', '#ff67ba'];
  const count = matchConfigForLevel(levelId.value).colorCount || palette.length;
  return palette[(hashSeed(seed.value) + row * 11 + column * 17) % count];
}

const regionCount = computed(() => {
  const visited = new Set<string>();
  let regions = 0;
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const startKey = `${row}:${column}`;
      if (!grid.value[row][column] || visited.has(startKey)) continue;
      regions += 1;
      const queue: [number, number][] = [[row, column]];
      visited.add(startKey);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [currentRow, currentColumn] = queue[cursor];
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nextRow = currentRow + dr;
          const nextColumn = currentColumn + dc;
          const key = `${nextRow}:${nextColumn}`;
          if (nextRow >= 0 && nextRow < BOARD_ROWS
            && nextColumn >= 0 && nextColumn < BOARD_COLUMNS
            && grid.value[nextRow][nextColumn] && !visited.has(key)) {
            visited.add(key);
            queue.push([nextRow, nextColumn]);
          }
        }
      }
    }
  }
  return regions;
});

const isConnected = computed(() => regionCount.value === 1);

const levelJson = computed<LevelJson>(() => ({
  id: Math.max(1, Math.min(MAX_LEVEL_COUNT, Math.floor(levelId.value))),
  gameMode: currentMode.value,
  difficulty: difficultyForLevel(levelId.value),
  targetScore: targetForLevel(levelId.value),
  availableShapes: shapesForLevel(levelId.value),
  reward: coinRewardForLevel(levelId.value),
  boardMask: boardMask.value,
  ...(boosterRewardForLevel(levelId.value) === undefined
    ? {}
    : { boosterReward: boosterRewardForLevel(levelId.value) }),
  ...(currentMode.value === 'match3' ? {
    match3Config: matchConfigForLevel(levelId.value),
  } : {}),
}));

const jsonText = computed(() => JSON.stringify(levelJson.value, null, 2));

const shortLines = computed(() => {
  const rows = grid.value
    .map((row, index) => ({ axis: `第 ${index + 1} 行`, count: row.filter(Boolean).length }))
    .filter((line) => line.count > 0 && line.count < 3);
  const columns = Array.from({ length: BOARD_COLUMNS }, (_, column) => ({
    axis: `第 ${column + 1} 列`,
    count: grid.value.reduce((sum, row) => sum + (row[column] ? 1 : 0), 0),
  })).filter((line) => line.count > 0 && line.count < 3);
  return [...rows, ...columns];
});
const fileName = (id: number): string => `level_${String(id).padStart(3, '0')}.json`;

function downloadBlob(name: string, blob: Blob): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadCurrent(): void {
  downloadBlob(fileName(levelJson.value.id), new Blob([jsonText.value], { type: 'application/json' }));
  notice.value = `${fileName(levelJson.value.id)} 已下载`;
}

async function copyJson(): Promise<void> {
  await navigator.clipboard.writeText(jsonText.value);
  notice.value = 'JSON 已复制到剪贴板';
}

async function downloadBatch(mode: BatchMode): Promise<void> {
  const originalMode = selectedMode.value;
  if (mode !== 'mixed') selectedMode.value = mode;
  const zip = new JSZip();
  const requestedCount = Math.max(1, Math.floor(batchCount.value));
  const startId = Math.max(1, Math.min(MAX_LEVEL_COUNT, levelJson.value.id));
  const count = Math.min(MAX_BATCH_COUNT, requestedCount, MAX_LEVEL_COUNT - startId + 1);
  for (let index = 0; index < count; index += 1) {
    const id = startId + index;
    const levelMode: GameMode = mode === 'mixed'
      ? id % 2 === 0 ? 'blockPuzzle' : 'match3'
      : mode;
    selectedMode.value = levelMode;
    const levelDifficulty = difficultyForLevel(id);
    const generatedGrid = levelMode === 'blockPuzzle'
      ? blockBlastGrid()
      : generateGridForLevel(id, `${seed.value}-${id}`, densityForLevel(id));
    const mask = generatedGrid.map((row) =>
      row.map((active) => active ? '1' : '0').join(''));
    const data: LevelJson = {
      ...levelJson.value,
      id,
      gameMode: modeForLevel(id),
      difficulty: levelDifficulty,
      targetScore: targetForLevel(id),
      availableShapes: shapesForLevel(id),
      reward: coinRewardForLevel(id),
      boardMask: mask,
    };
    const boosterReward = boosterRewardForLevel(id);
    if (boosterReward === undefined) {
      delete data.boosterReward;
    } else {
      data.boosterReward = boosterReward;
    }
    if (data.gameMode === 'match3') {
      data.match3Config = matchConfigForLevel(id);
    } else {
      delete data.match3Config;
    }
    zip.file(fileName(id), JSON.stringify(data, null, 2));
  }
  selectedMode.value = mode === 'mixed' ? originalMode : mode;
  const zipName = mode === 'mixed' ? 'blockblast-levels-mixed.zip' : 'blockblast-levels.zip';
  downloadBlob(zipName, await zip.generateAsync({ type: 'blob' }));
  const modeName = mode === 'mixed' ? '奇偶混合模式' : mode === 'match3' ? '消消乐' : 'Block Blast';
  notice.value = `${count} 个${modeName}关卡已打包下载（${startId} - ${startId + count - 1}）`;
}

function toggleAllShapes(): void {
  selectedShapes.value = selectedShapes.value.length === shapeNames.length
    ? []
    : Array.from({ length: shapeNames.length }, (_, index) => index + 1);
}
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">BLOCKBLAST · LEVEL LAB</p>
        <h1>不规则棋盘关卡工坊</h1>
        <p class="subtitle">Block Blast 模式与消消乐模式 · 不规则棋盘 · 批量生成与难度配置。</p>
      </div>
      <div class="status-pill"><span></span>{{ activeCount }} 格 · 当前 {{ effectiveBoardColumns }}×8 · 最大 26×8</div>
    </header>

    <section class="workspace">
      <article class="panel board-panel">
        <div class="panel-title">
          <div><small>BOARD MASK</small><h2>棋盘预览</h2></div>
          <div class="health">{{ isConnected ? '单一区域' : `${regionCount} 个独立区域` }}</div>
        </div>

        <div class="board-wrap">
          <div class="board" role="grid" aria-label="12乘8棋盘编辑器">
            <button
              v-for="(_, index) in BOARD_ROWS * BOARD_COLUMNS"
              :key="index"
              class="cell"
              :class="{ active: grid[Math.floor(index / BOARD_COLUMNS)][index % BOARD_COLUMNS] }"
              :style="{ background: previewColor(Math.floor(index / BOARD_COLUMNS), index % BOARD_COLUMNS) }"
              :aria-label="`第 ${Math.floor(index / BOARD_COLUMNS) + 1} 行第 ${index % BOARD_COLUMNS + 1} 列`"
              @click="toggleCell(Math.floor(index / BOARD_COLUMNS), index % BOARD_COLUMNS)"
            ><i></i></button>
          </div>
        </div>

        <div class="preset-row">
          <button @click="applyPreset('full')">完整</button>
          <button @click="applyPreset('diamond')">菱形</button>
          <button @click="applyPreset('rounded')">圆角</button>
          <button @click="applyPreset('cross')">十字</button>
          <button @click="applyPreset('hourglass')">沙漏</button>
          <button @click="applyPreset('hShape')">H 形</button>
          <button @click="applyPreset('stairs')">阶梯</button>
          <button @click="applyPreset('doubleIsland')">方形＋菱形</button>
          <button @click="applyPreset('doubleDiamond')">双菱形</button>
          <button @click="applyPreset('wings')">双翼</button>
        </div>
        <p class="notice">{{ notice }}</p>
        <p v-if="shortLines.length" class="warning">
          注意：{{ shortLines.map(line => `${line.axis}仅${line.count}格`).join('、') }}，可能很容易完成。
        </p>
      </article>

      <aside class="panel controls-panel">
        <div class="panel-title"><div><small>GENERATOR</small><h2>生成参数</h2></div></div>
        <div class="mode-selector" role="group" aria-label="关卡模式">
          <button
            :class="{ selected: currentMode === 'blockPuzzle' }"
            @click="selectMode('blockPuzzle')"
          >Block Blast 模式</button>
          <button
            :class="{ selected: currentMode === 'match3' }"
            @click="selectMode('match3')"
          >消消乐模式</button>
        </div>
        <div class="mode-card" :class="currentMode">
          <span>第 {{ levelId }} 关</span>
          <strong>{{ currentMode === 'match3' ? '消消乐模式' : 'Block Blast 模式' }}</strong>
          <small>{{ currentMode === 'match3' ? '交换相邻宝石 · 连色消除' : '拖放方块 · 填满整行或整列消除' }}</small>
        </div>
        <div v-if="currentMode === 'match3'" class="match-summary">
          <span><b>{{ matchConfigForLevel(levelId).colorCount || '全部' }}</b> 种图标</span>
          <span><b>{{ matchConfigForLevel(levelId).moveLimit }}</b> 步</span>
          <span><b>{{ matchConfigForLevel(levelId).matchLength }}+</b> 连色消除</span>
        </div>
        <div v-if="currentMode === 'match3'" class="feature-section">
          <div class="feature-heading">
            <strong>必出玩法 / 特殊元素</strong>
            <small>可以同时选择多个；黑洞会生成一步可触发的局面</small>
          </div>
          <label
            v-for="option in guaranteedFeatureOptions"
            :key="option.value"
            class="feature-option"
            :class="{ selected: selectedGuaranteedFeatures.includes(option.value) }"
          >
            <input v-model="selectedGuaranteedFeatures" type="checkbox" :value="option.value">
            <span><b>{{ option.label }}</b><small>{{ option.hint }}</small></span>
          </label>
        </div>
        <div class="difficulty-block pacing-block">
          <span class="control-caption">1. 选择游玩时长</span>
          <div class="difficulty-buttons">
            <button :class="{ selected: pacing === 'quick' }" @click="selectPacing('quick')">快速</button>
            <button :class="{ selected: pacing === 'experience' }" @click="selectPacing('experience')">体验（推荐）</button>
            <button :class="{ selected: pacing === 'long' }" @click="selectPacing('long')">耐玩</button>
          </div>
          <small class="pacing-hint">
            当前目标倍率 ×{{ pacingProfiles[pacing].targetMultiplier }}<template v-if="currentMode === 'match3'">；消消乐步数 ×{{ pacingProfiles[pacing].moveMultiplier }}</template>
          </small>
        </div>
        <div class="range-section">
          <div class="range-heading">
            <div><strong>自定义关卡范围</strong><small>范围规则优先于默认难度，后添加的规则优先。</small></div>
            <button @click="addRangeRule">＋ 添加规则</button>
          </div>
          <div v-if="rangeRules.length === 0" class="empty-rules">
            未填写规则：本批关卡自动平均分为简单 / 中等 / 困难，并按难度自动配置道具赠送。
          </div>
          <div v-for="rule in rangeRules" :key="rule.uid" class="range-rule">
            <div class="range-line">
              <label>从<input v-model.number="rule.startLevel" type="number" min="1" :max="MAX_LEVEL_COUNT"></label>
              <span>到</span>
              <label><input v-model.number="rule.endLevel" type="number" min="1" :max="MAX_LEVEL_COUNT"></label>
              <select v-model="rule.difficulty" aria-label="范围难度">
                <option value="easy">简单</option>
                <option value="normal">中等</option>
                <option value="hard">困难</option>
              </select>
              <select v-model="rule.pacing" aria-label="范围时长">
                <option value="quick">快速</option>
                <option value="experience">体验</option>
                <option value="long">耐玩</option>
              </select>
              <button class="delete-rule" @click="removeRangeRule(rule.uid)">删除</button>
            </div>
            <div class="reward-line">
              <label>金币上限（随机100–上限）<input v-model.number="rule.coinReward" type="number" min="100" max="500" step="10"></label>
              <label class="reward-check"><input v-model="rule.grantBooster" type="checkbox"> 通关赠送道具</label>
              <template v-if="rule.grantBooster">
                <select v-model="rule.boosterType" aria-label="奖励道具">
                  <option value="random">随机一种</option>
                  <option value="all">三种都送</option>
                  <option value="bomb">Bomb</option>
                  <option value="hammer">Hammer</option>
                  <option value="rainbow">Rainbow</option>
                </select>
                <label>数量<input v-model.number="rule.boosterAmount" type="number" min="1" max="9"></label>
              </template>
            </div>
            <div class="range-features">
              <span>棋盘：</span>
              <select v-model="rule.boardPattern" aria-label="范围棋盘类型">
                <option value="mixed">混合轮换（防重复）</option>
                <option value="connected">随机不规则</option>
                <option value="presetRandom">10 种预设轮换</option>
                <option value="diamond">固定菱形</option>
                <option value="cross">固定十字</option>
                <option value="rounded">固定圆角</option>
                <option value="hourglass">固定沙漏</option>
                <option value="hShape">固定 H 形</option>
                <option value="stairs">固定阶梯</option>
                <option value="doubleIsland">左方形＋右菱形</option>
                <option value="doubleDiamond">固定双菱形</option>
                <option value="wings">固定双翼</option>
                <option value="full">完整棋盘</option>
              </select>
              <span v-if="currentMode === 'match3'">基础连消：</span>
              <select v-if="currentMode === 'match3'" v-model.number="rule.matchLength" aria-label="范围基础连消数量">
                <option :value="3">3 连</option>
                <option :value="4">4 连</option>
                <option :value="5">5 连</option>
              </select>
              <span v-if="currentMode === 'match3'">消消乐关必出：</span>
              <label v-for="option in guaranteedFeatureOptions" v-if="currentMode === 'match3'" :key="option.value">
                <input v-model="rule.guaranteedFeatures" type="checkbox" :value="option.value">
                {{ option.label }}
              </label>
            </div>
          </div>
        </div>
        <div class="field-grid">
          <label>关卡 ID<input v-model.number="levelId" type="number" min="1" :max="MAX_LEVEL_COUNT"></label>
          <label>目标分数<input v-model.number="targetScore" type="number" min="1" step="50" :disabled="autoBalance"></label>
          <label>奖励金币上限（随机100–上限）<input v-model.number="reward" type="number" min="100" max="500" step="10"></label>
          <label>批量数量<input v-model.number="batchCount" type="number" min="1" :max="MAX_BATCH_COUNT"></label>
        </div>
        <label class="reward-check auto-balance"><input v-model="autoBalance" type="checkbox"> 自动平衡目标分数（推荐）</label>
        <label class="wide-field">随机种子<input v-model="seed" type="text"></label>
        <label class="wide-field">棋盘生成类型
          <select v-model="boardPattern">
            <option value="mixed">混合轮换（推荐·防重复）</option>
            <option value="connected">随机不规则</option>
            <option value="presetRandom">10 种预设轮换</option>
            <option value="diamond">固定菱形</option>
            <option value="cross">固定十字</option>
            <option value="rounded">固定圆角</option>
            <option value="hourglass">固定沙漏</option>
            <option value="hShape">固定 H 形</option>
            <option value="stairs">固定阶梯</option>
            <option value="doubleIsland">左方形＋右菱形</option>
            <option value="doubleDiamond">固定双菱形</option>
            <option value="wings">固定双翼</option>
            <option value="full">完整棋盘</option>
          </select>
        </label>
        <label v-if="currentMode === 'match3'" class="wide-field">基础连消规则
          <select v-model.number="matchLength">
            <option :value="3">3 个同色</option>
            <option :value="4">4 个同色</option>
            <option :value="5">5 个同色</option>
          </select>
          <small>不规则棋盘的 2～3 格短边会自动按整段消除，避免永久死格。</small>
        </label>
        <label class="slider-label"><span>可用格密度 <b>{{ density }}%</b></span><input v-model.number="density" type="range" min="25" max="100"></label>
        <label class="switch-row"><span>左右对称</span><input v-model="symmetric" type="checkbox"><i></i></label>
        <div v-if="currentMode === 'blockPuzzle'" class="shape-section">
          <div class="shape-head">
            <h3>可用方块（{{ selectedShapes.length }}/{{ shapeNames.length }}）</h3>
            <button @click="toggleAllShapes">{{ selectedShapes.length === shapeNames.length ? '清空' : '全选' }}</button>
          </div>
          <div class="shape-list">
            <label
              v-for="(name, index) in shapeNames"
              :key="index"
              :class="{ checked: selectedShapes.includes(index + 1) }"
            >
              <input v-model="selectedShapes" type="checkbox" :value="index + 1">
              <span>{{ index + 1 }}</span>{{ name }}
            </label>
          </div>
          <p v-if="selectedShapes.length === 0" class="warning">请至少选择一个可用方块。</p>
        </div>
        <span class="control-caption">2. 点击下面的大按钮</span>
        <button class="generate-main" @click="generateCurrentLevel">
          <b>🎲 生成当前关卡</b>
          <small>自动更换种子并生成棋盘</small>
        </button>
        <button class="seed-replay" @click="randomize">按当前种子重新生成</button>

      </aside>
    </section>

    <section class="panel export-panel">
      <div class="panel-title"><div><small>EXPORT</small><h2>关卡 JSON</h2></div>
        <div class="export-actions">
          <button @click="copyJson">复制 JSON</button>
          <button class="primary" :disabled="activeCount < 3 || selectedShapes.length === 0" @click="downloadCurrent">下载当前关卡</button>
          <button class="block-batch" :disabled="selectedShapes.length === 0" @click="downloadBatch('blockPuzzle')">批量生成 Block Blast 关卡 ZIP</button>
          <button class="gold" :disabled="selectedShapes.length === 0" @click="downloadBatch('match3')">批量生成消消乐关卡 ZIP</button>
          <button class="mixed-batch" :disabled="selectedShapes.length === 0" @click="downloadBatch('mixed')">按关卡奇偶混合模式 ZIP</button>
        </div>
      </div>
      <pre>{{ jsonText }}</pre>
      <p class="path-hint">下载后放入：<code>assets/resources/levels/</code></p>
    </section>
  </main>
</template>
