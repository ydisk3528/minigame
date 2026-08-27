export const SHAPES = [
  ["rectangle", "完整"], ["heart", "心形"], ["diamond", "菱形"], ["cross", "十字"],
  ["hourglass", "沙漏"], ["ring", "圆环"], ["butterfly", "蝴蝶"], ["pyramid", "金字塔"],
  ["castle", "城堡"], ["staggered", "错层"]
];

export const DIFFICULTY = {
  easy: { moves: 30, colors: 5, ice: 1, crates: 0 },
  normal: { moves: 25, colors: 6, ice: 2, crates: 1 },
  hard: { moves: 21, colors: 6, ice: 3, crates: 2 },
  expert: { moves: 18, colors: 6, ice: 4, crates: 3 }
};

export function buildMask(shape, rows = 8, columns = 8) {
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    const x = columns === 1 ? 0 : column / (columns - 1) * 2 - 1;
    const y = rows === 1 ? 0 : row / (rows - 1) * 2 - 1;
    const ax = Math.abs(x), ay = Math.abs(y), radius = Math.sqrt(x * x + y * y);
    switch (shape) {
      case "heart": return ((x * x + (y + .18) * (y + .18) - .72) ** 3 - x * x * (-(y + .18)) ** 3 <= 0) ? 1 : 0;
      case "diamond": return ax + ay <= 1.25 ? 1 : 0;
      case "cross": return ax <= .38 || ay <= .38 ? 1 : 0;
      case "hourglass": return ax <= .26 + ay * .76 ? 1 : 0;
      case "ring": return radius <= 1.12 && radius >= .42 ? 1 : 0;
      case "butterfly": return ((ax >= .12 && ax <= .98 && ay <= .92 - ax * .22) || (ax <= .28 && ay <= .34)) ? 1 : 0;
      case "pyramid": return y >= -.8 && ax <= (y + 1.25) * .48 ? 1 : 0;
      case "castle": return row >= 2 && (row >= 4 || column <= 1 || column >= columns - 2 || (column >= 3 && column <= 4)) ? 1 : 0;
      case "staggered": return column >= row % 3 && column < columns - ((row + 1) % 3) ? 1 : 0;
      default: return 1;
    }
  }));
}

function createRandom(seedText) {
  let hash = 2166136261;
  for (const character of String(seedText)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  let state = hash >>> 0 || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

const count = value => Math.max(0, Math.floor(Number(value) || 0));

export function difficultyForLevel(level) {
  if (level <= 10) return "easy";
  if (level <= 30) return "normal";
  if (level <= 60) return "hard";
  return "expert";
}

export function campaignSettingsForLevel(level) {
  const difficulty = difficultyForLevel(level);
  const bands = {
    easy: { start: 1, end: 10, moves: [32, 29], ice: [0, 1], crates: [0, 0], chains: [0, 0], stones: [0, 0] },
    normal: { start: 11, end: 30, moves: [29, 26], ice: [1, 3], crates: [0, 1], chains: [0, 1], stones: [0, 0] },
    hard: { start: 31, end: 60, moves: [27, 23], ice: [2, 4], crates: [1, 2], chains: [1, 1], stones: [0, 1] },
    expert: { start: 61, end: 100, moves: [25, 21], ice: [3, 5], crates: [2, 4], chains: [1, 2], stones: [1, 2] },
  };
  const band = bands[difficulty];
  const progress = Math.max(0, Math.min(1, (level - band.start) / Math.max(1, band.end - band.start)));
  const interpolate = values => Math.round(values[0] + (values[1] - values[0]) * progress);
  return {
    difficulty,
    moveLimit: interpolate(band.moves),
    gemTypes: difficulty === "easy" || (difficulty === "normal" && level < 18) ? 5 : 6,
    ice: interpolate(band.ice), crates: interpolate(band.crates),
    chains: interpolate(band.chains), stones: interpolate(band.stones),
  };
}

function randomGoals(level, difficulty, gemTypes, obstacles, moveLimit, random) {
  const rank = ["easy", "normal", "hard", "expert"].indexOf(difficulty);
  const band = difficulty === "easy" ? [1, 10] : difficulty === "normal" ? [11, 30]
    : difficulty === "hard" ? [31, 60] : [61, 100];
  const progress = Math.max(0, Math.min(1, (level - band[0]) / (band[1] - band[0])));
  const ice = obstacles.filter(item => item.type === 1).length;
  const crates = obstacles.filter(item => item.type === 3).length;
  const collect = () => ({ type: "collectGem", gemType: Math.floor(random() * gemTypes),
    count: level <= 10 ? 15 + Math.round(progress * 4) + Math.floor(random() * 3)
      : 10 + rank * 2 + Math.round(progress * 4) + Math.floor(random() * 4) });
  const score = () => ({ type: "score", count: Math.round((moveLimit * (280 + rank * 35)
    + Math.floor(random() * 4) * 250) / 250) * 250 });
  const candidates = [collect, score];
  if (ice) candidates.push(() => ({ type: "breakIce", count: Math.max(1, Math.min(ice, Math.ceil(ice * (.55 + progress * .35)))) }));
  if (crates) candidates.push(() => ({ type: "breakCrate", count: Math.max(1, Math.min(crates, Math.ceil(crates * (.6 + progress * .3)))) }));
  if (level <= 10) {
    const goals = [collect()];
    if (level >= 6 && ice) goals.push({ type: "breakIce", count: ice });
    return goals;
  }
  shuffle(candidates, random);
  const targetCount = Math.min(candidates.length, rank === 0 ? 1 : rank === 1 ? (level >= 20 ? 2 : 1) : rank === 2 ? 2 : (level >= 80 ? 3 : 2));
  const goals = candidates.slice(0, targetCount).map(create => create());
  const needsSupport = goals.some(goal => ["breakIce", "breakCrate"].includes(goal.type) && goal.count === 1)
    && !goals.some(goal => goal.type === "collectGem" || goal.type === "score");
  if (needsSupport) goals.push(collect());
  return goals;
}

function makeLayout(mask, colors, matchLength, random) {
  const rows = mask.length, columns = mask[0].length;
  for (let attempt = 0; attempt < 100; attempt++) {
    const layout = Array.from({ length: rows }, () => Array(columns).fill(-1));
    const componentSize = (startRow, startColumn, type) => {
      const seen = new Set([`${startRow}:${startColumn}`]), pending = [[startRow, startColumn]];
      while (pending.length) {
        const [row, column] = pending.pop();
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
          if (!rowOffset && !columnOffset) continue;
          const nextRow = row + rowOffset, nextColumn = column + columnOffset, key = `${nextRow}:${nextColumn}`;
          if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns
            && !seen.has(key) && layout[nextRow][nextColumn] === type) {
            seen.add(key); pending.push([nextRow, nextColumn]);
          }
        }
      }
      return seen.size;
    };
    let complete = true;
    for (let row = 0; row < rows && complete; row++) for (let column = 0; column < columns; column++) {
      if (!mask[row][column]) continue;
      const candidates = shuffle(Array.from({ length: colors }, (_, type) => type), random);
      const type = candidates.find(candidate => {
        layout[row][column] = candidate;
        const valid = componentSize(row, column, candidate) < matchLength;
        layout[row][column] = -1;
        return valid;
      });
      if (type === undefined) complete = false;
      else layout[row][column] = type;
    }
    if (complete) return layout.map(row => row.map(type => type < 0 ? 0 : type));
  }
  const layout = Array.from({ length: rows }, () => Array(columns).fill(-1));
  const positions = layout.flatMap((row, rowIndex) => row.flatMap((_, column) => mask[rowIndex][column] ? [{ row: rowIndex, column }] : []));
  const componentSize = (startRow, startColumn, type) => {
    const seen = new Set([`${startRow}:${startColumn}`]), pending = [[startRow, startColumn]];
    while (pending.length) {
      const [row, column] = pending.pop();
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
        if (!rowOffset && !columnOffset) continue;
        const nextRow = row + rowOffset, nextColumn = column + columnOffset, key = `${nextRow}:${nextColumn}`;
        if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns
          && !seen.has(key) && layout[nextRow][nextColumn] === type) { seen.add(key); pending.push([nextRow, nextColumn]); }
      }
    }
    return seen.size;
  };
  const fill = index => {
    if (index === positions.length) return true;
    const { row, column } = positions[index];
    for (let type = 0; type < colors; type++) {
      layout[row][column] = type;
      if (componentSize(row, column, type) < matchLength && fill(index + 1)) return true;
    }
    layout[row][column] = -1;
    return false;
  };
  if (!fill(0)) throw new Error("Unable to generate an eight-direction match-free layout.");
  return layout.map(row => row.map(type => type < 0 ? 0 : type));
}

export function createLevel(config) {
  const rows = Number(config.rows ?? 8), columns = Number(config.columns ?? 8);
  const level = Number(config.level ?? 1);
  const matchLength = Math.max(3, Math.min(5, Number(config.matchLength ?? 3)));
  const random = createRandom(`${config.seed ?? "crystal-match"}-${level}`);
  const allowedShapes = (config.shapePool?.length ? config.shapePool : SHAPES.map(item => item[0]))
    .filter(name => SHAPES.some(item => item[0] === name));
  const shape = config.shape === "random" ? allowedShapes[Math.floor(random() * allowedShapes.length)] : config.shape;
  const preset = DIFFICULTY[config.difficulty] ?? DIFFICULTY.normal;
  const mask = config.mask && config.shape !== "random" ? config.mask.map(row => [...row]) : buildMask(shape, rows, columns);
  const active = shuffle(mask.flatMap((row, r) => row.flatMap((value, c) => value ? [{ row: r, column: c }] : [])), random);
  const specialCounts = [config.horizontalRockets ?? 1, config.verticalRockets ?? 1, config.bombs ?? 1, config.rainbows ?? 0].map(count);
  const initialSpecials = [];
  for (let type = 1; type <= 4; type++) for (let count = 0; count < specialCounts[type - 1] && active.length; count++) {
    initialSpecials.push({ ...active.pop(), specialType: type });
  }
  const obstacles = [];
  let obstacleBudget = Math.min(Math.floor(active.length * .35), Math.max(0, active.length - matchLength * 2));
  const addObstacle = (type, count, hitPoints = 1) => {
    for (let i = 0; i < count && active.length && obstacleBudget > 0; i++, obstacleBudget--) {
      obstacles.push({ ...active.pop(), type, hitPoints });
    }
  };
  addObstacle(1, count(config.ice ?? preset.ice), 2);
  addObstacle(2, count(config.chains ?? 0));
  addObstacle(3, count(config.crates ?? preset.crates));
  addObstacle(4, count(config.stones ?? 0), 2);
  const gemTypes = Number(config.gemTypes ?? preset.colors);
  const moveLimit = Number(config.moveLimit ?? preset.moves);
  const configuredGoals = config.autoGoals ? randomGoals(level, config.difficulty, gemTypes, obstacles, moveLimit, random)
    : (config.goals?.length ? config.goals : [{ type: "collectGem", gemType: level % gemTypes, count: 10 + level * 2 }]);
  const goals = configuredGoals
    .map(goal => ({
      type: goal.type,
      ...(goal.type === "collectGem" ? { gemType: Math.max(0, Math.min(gemTypes - 1, count(goal.gemType))) } : {}),
      count: Math.max(1, count(goal.count))
    }));
  const rank = Math.max(0, ["easy", "normal", "hard", "expert"].indexOf(config.difficulty));
  const scoreBase = moveLimit * (300 + rank * 45);
  const result = {
    level, rows, columns, difficulty: config.difficulty, shape, matchLength,
    moveLimit, gemTypes,
    starScores: [.65, 1, 1.35].map(multiplier => Math.round(scoreBase * multiplier / 100) * 100),
    props: [
      { type: "hammer", count: count(config.hammerCount ?? 3) },
      { type: "magic", count: count(config.magicCount ?? 1) },
      { type: "refresh", count: count(config.refreshCount ?? 1) },
      { type: "infinite", count: Math.min(1, count(config.infiniteCount ?? 0)) }
    ],
    goals,
    obstacles, initialSpecials, mask, initialLayout: [],
  };
  for (let attempt = 0; attempt < 60; attempt++) {
    result.initialLayout = makeLayout(mask, gemTypes, matchLength, random);
    if (countPossibleMoves(result) > 0) return result;
  }
  throw new Error(`Unable to generate a playable layout for level ${level}.`);
}

export function createBatch(config, count) {
  return Array.from({ length: count }, (_, index) => createLevel({ ...config, level: Number(config.level) + index }));
}
import { countPossibleMoves } from "./levelChecks.js";
