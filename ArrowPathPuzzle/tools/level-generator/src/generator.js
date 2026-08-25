export const SHAPES = [
  { value: 'mixed', label: '混合轮换' },
  { value: 'heart', label: '心形' },
  { value: 'fighter', label: '二战战斗机' },
  { value: 'h', label: 'H 形' },
  { value: 'random', label: '随机轮廓' },
  { value: 'custom', label: '自定义轮廓' },
];

export const DIFFICULTIES = [
  { value: 'auto', label: '自动递进' },
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
];

export function createLevel(id, settings, rules) {
  const rule = [...rules].reverse().find((item) => id >= Math.min(item.start, item.end) && id <= Math.max(item.start, item.end));
  const difficulty = rule?.difficulty && rule.difficulty !== 'auto'
    ? rule.difficulty
    : difficultyForLevel(id, settings.startLevel, settings.count);
  let shape = rule?.shape ?? settings.shape;
  if (shape === 'mixed') {
    const options = ['heart', 'fighter', 'h', 'random'];
    shape = options[Math.floor(random(`${settings.seed}-shape-${id}`)() * options.length)];
  }
  const tools = rule ? { remove: rule.remove, hint: rule.hint, bomb: rule.bomb } : { ...settings.tools };
  const rewardType = rule?.rewardType ?? settings.rewardType;
  const rewardAmount = rule?.rewardAmount ?? settings.rewardAmount;
  const columns = clampInt(settings.columns, 10, 40);
  const rows = clampInt(settings.rows, 10, 50);
  const level = {
    level: id,
    difficulty,
    shape,
    timeLimit: clampInt(rule?.time ?? timeForDifficulty(difficulty), 30, 3600),
    tools: {
      remove: clampInt(tools.remove, 0, 99),
      hint: clampInt(tools.hint, 0, 99),
      bomb: clampInt(tools.bomb, 0, 99),
    },
    ...(rewardType === 'none' ? {} : { rewardTools: { type: rewardType, amount: clampInt(rewardAmount, 1, 99) } }),
    grid: { columns, rows, cellSize: 24 },
    paths: createPaths(columns, rows, shape, difficulty, `${settings.seed}-${id}`, settings.customMask ?? []),
  };
  return level;
}

function createPaths(columns, rows, shape, difficulty, seed, customMask) {
  const rng = random(seed);
  const mask = Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => isFilled(shape, x, y, columns, rows, rng, customMask)));
  const paths = [];
  for (let y = 0; y < rows; y++) {
    let start = -1;
    for (let x = 0; x <= columns; x++) {
      if (x < columns && mask[y][x]) { if (start < 0) start = x; continue; }
      if (start >= 0) {
        for (const [from, to] of splitRun(start, x, difficulty, rng)) {
          const center = (from + to - 1) / 2;
          const points = Array.from({ length: to - from }, (_, index) => [from + index, y]);
          const exitDirection = center < (columns - 1) / 2 ? 'left' : 'right';
          if (exitDirection === 'left') points.reverse();
          paths.push({ id: paths.length, points, exitDirection, color: '#000000' });
        }
      }
      start = -1;
    }
  }
  return paths;
}

function splitRun(start, end, difficulty, rng) {
  const total = end - start;
  if (total < 2) return [];
  const range = difficulty === 'easy' ? [8, 14] : difficulty === 'normal' ? [5, 9] : [3, 6];
  const result = [];
  let cursor = start;
  while (end - cursor > 0) {
    const remaining = end - cursor;
    if (remaining <= range[1] || remaining < range[0] + 2) { result.push([cursor, end]); break; }
    let length = range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
    if (remaining - length === 1) length--;
    result.push([cursor, cursor + length]);
    cursor += length;
  }
  return result.filter(([from, to]) => to - from >= 2);
}

function isFilled(shape, x, y, columns, rows, rng, customMask) {
  if (shape === 'custom') return customMask[y]?.[x] === '1';
  const dx = x - (columns - 1) / 2;
  const nx = dx / Math.max(1, columns * 0.44);
  const ny = (y - (rows - 1) / 2) / Math.max(1, rows * 0.38);
  if (shape === 'heart') return y >= rows * 0.12 && y <= rows * 0.88 && (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3 <= 0;
  if (shape === 'h') {
    const side = Math.abs(dx) >= columns * 0.28 && Math.abs(dx) <= columns * 0.42;
    return side || (Math.abs(y - (rows - 1) / 2) <= Math.max(1, rows * 0.055) && Math.abs(dx) <= columns * 0.42);
  }
  if (shape === 'fighter') {
    const fuselage = Math.abs(dx) <= Math.max(0.6, columns * 0.045);
    const wingsY = rows * 0.43;
    const wings = Math.abs(y - wingsY) <= rows * 0.1 && Math.abs(dx) <= columns * (0.47 - Math.abs(y - wingsY) / rows * 1.7);
    const tailY = rows * 0.77;
    const tail = Math.abs(y - tailY) <= rows * 0.07 && Math.abs(dx) <= columns * (0.18 - Math.abs(y - tailY) / rows);
    const nose = y < rows * 0.16 && Math.abs(dx) <= Math.max(0, (y / rows) * columns * 0.12);
    return fuselage || wings || tail || nose;
  }
  const inside = nx * nx + ny * ny <= 1;
  if (!inside) return false;
  const hash = Math.sin((x + 1) * 91.7 + (y + 1) * 37.3 + rng() * 11) * 43758.5453;
  return Math.abs(ny) < 0.18 || Math.abs(nx) < 0.18 || hash - Math.floor(hash) > 0.17;
}

function difficultyForLevel(id, start, count) {
  const progress = (id - start) / Math.max(1, count);
  return progress < 1 / 3 ? 'easy' : progress < 2 / 3 ? 'normal' : 'hard';
}

function timeForDifficulty(difficulty) {
  return difficulty === 'easy' ? 360 : difficulty === 'normal' ? 300 : 240;
}

function random(seed) {
  let state = 2166136261;
  for (const character of String(seed)) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function clampInt(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || minimum)));
}

export function validateLevel(level) {
  if (!level.paths.length) return '没有生成任何路径';
  const occupied = new Set();
  for (const path of level.paths) {
    if (path.points.length < 2) return `路径 ${path.id} 少于两个格子`;
    for (let i = 0; i < path.points.length; i++) {
      const [x, y] = path.points[i];
      if (x < 0 || x >= level.grid.columns || y < 0 || y >= level.grid.rows) return `路径 ${path.id} 越界`;
      const key = `${x}:${y}`;
      if (occupied.has(key)) return `格子 ${key} 重复`;
      occupied.add(key);
      if (i && Math.abs(x - path.points[i - 1][0]) + Math.abs(y - path.points[i - 1][1]) !== 1) return `路径 ${path.id} 不连续`;
    }
  }
  return '';
}
