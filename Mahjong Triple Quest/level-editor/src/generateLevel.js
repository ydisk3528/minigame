export const allTypes = [
  "wan_1","tong_1","tiao_1","wan_2","tong_2","tiao_2","wan_3","tong_3","tiao_3",
  "wan_4","tong_4","tiao_4","wan_5","tong_5","tiao_5","wan_6","tong_6","tiao_6",
  "wan_7","tong_7","tiao_7","wan_8","tong_8","tiao_8","wan_9","tong_9","tiao_9",
  "honor_dong","honor_nan","honor_xi","honor_bei","honor_zhong","honor_fa","honor_bai"
];

export const SHAPES = [
  ["rectangle", "完整方阵"], ["heart", "心形"], ["diamond", "菱形"], ["cross", "十字"],
  ["ring", "圆环"], ["hourglass", "沙漏"], ["butterfly", "蝴蝶"], ["pyramid", "金字塔"],
  ["staggered", "错层"]
];
const DRAGONS = ["honor_zhong", "honor_fa", "honor_bai"];

export function randomFor(seed) {
  let state = Number(seed) >>> 0 || 1;
  return () => ((state = Math.imul(1664525, state) + 1013904223 >>> 0) / 4294967296);
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function acceptsShape(shape, row, column) {
  const x = column / 3, y = row / 2, ax = Math.abs(x), ay = Math.abs(y), radius = Math.sqrt(x * x + y * y);
  switch (shape) {
    case "heart": return ((x * x + (y + .2) ** 2 - .78) ** 3 - x * x * (-(y + .2)) ** 3) <= 0;
    case "diamond": return ax + ay <= 1.35;
    case "cross": return ax <= .35 || ay <= .38;
    case "ring": return radius <= 1.12 && radius >= .48;
    case "hourglass": return ax <= .24 + ay * .82;
    case "butterfly": return (ax >= .12 && ax <= 1 && ay <= .95 - ax * .2) || (ax <= .3 && ay <= .35);
    case "pyramid": return ax <= (row + 3.2) * .25;
    case "staggered": return column >= -3 + ((row + 2) % 2) && column <= 3 - ((row + 3) % 2);
    default: return true;
  }
}

function shapePositions(shape, count, layer, seed, density) {
  const random = randomFor(seed + layer * 7919), candidates = [];
  for (let row = -2; row <= 2; row++) for (let column = -3; column <= 3; column++) {
    if (acceptsShape(shape, row, column)) candidates.push({ column, row, rank: Math.abs(column) + Math.abs(row) * 1.2 + random() * .22 });
  }
  candidates.sort((a, b) => a.rank - b.rank);
  if (count > candidates.length) throw new Error(`${SHAPES.find(item => item[0] === shape)?.[1] ?? shape} 每层最多容纳 ${candidates.length} 张，请增加层数或减少牌组。`);
  const gapX = Math.round(82 * density), gapY = Math.round(105 * density);
  const offsets = [{ x: 0, y: 0 }, { x: 34, y: 18 }, { x: -28, y: 12 }, { x: 24, y: 28 }, { x: -34, y: 22 }, { x: 10, y: 34 }];
  const offset = offsets[layer % offsets.length];
  return candidates.slice(0, count).map(({ column, row }) => ({ x: 329 + column * gapX + offset.x, y: 430 + row * gapY + offset.y, layer }));
}

function configuredTypes(value) {
  const types = allTypes.slice(0, clamp(integer(value.typeCount, 4), 3, allTypes.length)).filter(type => !value.enableSpecialCombo || !DRAGONS.includes(type)), required = [];
  if (value.enableSequence) required.push("wan_1", "wan_2", "wan_3");
  for (const type of required) if (!types.includes(type)) types.push(type);
  return { types, required };
}

export function generateLevel(input) {
  const value = { ...input }, level = Math.max(1, integer(value.level, 1)), seed = integer(value.seed, 3197);
  const layerCount = clamp(integer(value.layers, 2), 1, 8), groupCount = Math.max(3, integer(value.groupCount, 5));
  const density = clamp(Number(value.density) || 1, .82, 1.08), random = randomFor(seed + level * 97);
  const { types, required } = configuredTypes(value);
  const groups = Array.from({ length: groupCount }, (_, index) => required[index] ?? types[index % types.length]);
  shuffle(groups, random);
  const shapePool = value.shapePool?.length ? value.shapePool : SHAPES.map(item => item[0]);
  const shape = value.shape === "random" ? shapePool[Math.floor(random() * shapePool.length)] : value.shape || "rectangle";
  const baseGroups = Math.floor(groups.length / layerCount), remainder = groups.length % layerCount;
  let groupIndex = 0, id = level * 10000 + 1; const layout = [];
  for (let layer = 0; layer < layerCount; layer++) {
    const count = baseGroups + (layer < remainder ? 1 : 0);
    const layerTypes = groups.slice(groupIndex, groupIndex + count).flatMap(type => [type, type, type]);
    if (value.enableSpecialCombo && layer === layerCount - 1) layerTypes.push(...DRAGONS);
    groupIndex += count; shuffle(layerTypes, random);
    shapePositions(shape, layerTypes.length, layer, seed, density).forEach((position, index) => layout.push({ id: id++, type: layerTypes[index], ...position }));
  }
  const props = value.props ?? {}, star2 = Math.max(200, integer(value.star2Score, groupCount * 150));
  const star3 = Math.max(star2 + 100, integer(value.star3Score, groupCount * 190));
  const result = {
    level, difficulty: value.difficulty || "normal", shape,
    limitType: value.limitType === "moves" ? "moves" : "time",
    timeLimit: Math.max(10, integer(value.timeLimit, 180)), moveLimit: Math.max(3, integer(value.moveLimit, Math.ceil(layout.length * 1.5))),
    slotCount: clamp(integer(value.slotCount, 7), 5, 9),
    enableSequence: Boolean(value.enableSequence), enableSpecialCombo: Boolean(value.enableSpecialCombo),
    seed, rewardCoins: Math.max(0, integer(value.rewardCoins, 100)), starScores: [0, star2, star3],
    props: {
      undo: Math.max(0, integer(props.undo ?? value.undoCount, 3)), shuffle: Math.max(0, integer(props.shuffle ?? value.shuffleCount, 3)),
      move: Math.max(0, integer(props.move ?? value.moveCount, 3)), hint: Math.max(0, integer(props.hint ?? value.hintCount, 3)), freeze: Math.max(0, integer(props.freeze ?? value.freezeCount, 1))
    }, layout
  };
  validateLevel(result); return result;
}

export function batchSettingsForLevel(input, level, index, count) {
  const progress = count <= 1 ? 0 : index / (count - 1), between = (min, max) => Math.round(Number(min) + (Number(max) - Number(min)) * progress);
  const seed = integer(input.batchSeed, 3197) + level * 104729, random = randomFor(seed), pool = input.shapePool?.length ? input.shapePool : ["rectangle"];
  const limitType = input.limitMode === "moves" || (input.limitMode === "alternate" && index % 2 === 1) ? "moves" : "time";
  return { ...input, level, seed, limitType, timeLimit: between(input.minTime, input.maxTime), moveLimit: between(input.minMoves, input.maxMoves), groupCount: between(input.minGroups, input.maxGroups), typeCount: between(input.minTypes, input.maxTypes), layers: between(input.minLayers, input.maxLayers), rewardCoins: between(input.minReward, input.maxReward), shape: pool[Math.floor(random() * pool.length)], enableSequence: level >= integer(input.sequenceFrom, Number.MAX_SAFE_INTEGER), enableSpecialCombo: level >= integer(input.specialFrom, Number.MAX_SAFE_INTEGER), difficulty: progress < .34 ? "easy" : progress < .67 ? "normal" : progress < .9 ? "hard" : "expert" };
}

export function generateBatch(input) {
  const start = Math.max(1, integer(input.batchStart, 1)), maxLevel = Math.max(start, integer(input.maxLevel, start + integer(input.batchCount, 20) - 1)), count = clamp(maxLevel - start + 1, 1, 500);
  return Array.from({ length: count }, (_, index) => generateLevel(batchSettingsForLevel(input, start + index, index, count)));
}

export function levelFilename(level) { return `level_${String(level).padStart(2, "0")}.json`; }
export function makeCatalog(levels) {
  const maxLevel = Math.max(...levels.map(level => level.level));
  const generated = new Map(levels.map(level => [level.level, level]));
  return {
    maxLevel,
    levels: Array.from({ length: maxLevel }, (_, index) => {
      const level = generated.get(index + 1);
      return {
        level: index + 1,
        file: levelFilename(index + 1),
        ...(level ? { difficulty: level.difficulty, shape: level.shape } : {})
      };
    })
  };
}

function canClearTypes(types, sequenceEnabled, specialEnabled) {
  const counts = allTypes.map(type => types.filter(item => item === type).length), memo = new Map();
  const solve = () => {
    const key = counts.join(","); if (memo.has(key)) return memo.get(key);
    const index = counts.findIndex(count => count > 0); if (index < 0) return true;
    const tryRemove = (indices) => {
      if (indices.some(target => counts[target] <= 0)) return false;
      indices.forEach(target => counts[target]--); const solved = solve(); indices.forEach(target => counts[target]++); return solved;
    };
    if (counts[index] >= 3 && tryRemove([index, index, index])) return true;
    const type = allTypes[index], match = /^(wan|tong|tiao)_(\d)$/.exec(type);
    if (sequenceEnabled && match) {
      const rank = Number(match[2]);
      for (let start = Math.max(1, rank - 2); start <= Math.min(rank, 7); start++) {
        const indices = [start, start + 1, start + 2].map(value => allTypes.indexOf(`${match[1]}_${value}`));
        if (tryRemove(indices)) return true;
      }
    }
    if (specialEnabled && DRAGONS.includes(type) && tryRemove(DRAGONS.map(item => allTypes.indexOf(item)))) return true;
    memo.set(key, false); return false;
  };
  return solve();
}

export function isGuaranteedSolvable(level) {
  const layers = [...new Set((level.layout ?? []).map(tile => tile.layer))];
  return layers.every(layer => canClearTypes(level.layout.filter(tile => tile.layer === layer).map(tile => tile.type), level.enableSequence, level.enableSpecialCombo));
}

export function validateLevel(level) {
  if (!Number.isInteger(level.level) || level.level < 1) throw new Error("关卡编号必须是大于 0 的整数。");
  if (!Array.isArray(level.layout) || !level.layout.length || level.layout.length % 3 !== 0) throw new Error(`第 ${level.level} 关牌数必须是 3 的倍数。`);
  if (!["time", "moves"].includes(level.limitType)) throw new Error(`第 ${level.level} 关必须选择倒计时或步数限制。`);
  if (level.limitType === "time" && (!Number.isInteger(level.timeLimit) || level.timeLimit < 10)) throw new Error(`第 ${level.level} 关倒计时不能少于 10 秒。`);
  if (level.limitType === "moves" && (!Number.isInteger(level.moveLimit) || level.moveLimit < 3)) throw new Error(`第 ${level.level} 关步数不能少于 3 步。`);
  const ids = new Set(level.layout.map(tile => tile.id)); if (ids.size !== level.layout.length) throw new Error(`第 ${level.level} 关存在重复麻将 ID。`);
  for (const tile of level.layout) {
    if (!allTypes.includes(tile.type)) throw new Error(`第 ${level.level} 关存在未知牌型 ${tile.type}。`);
    if (tile.x < 50 || tile.x > 610 || tile.y < 140 || tile.y > 728) throw new Error(`第 ${level.level} 关有麻将超出游戏区域。`);
  }
  if (!isGuaranteedSolvable(level)) throw new Error(`第 ${level.level} 关不存在可靠的逐层消除路径。`);
  if (!Array.isArray(level.starScores) || level.starScores.length !== 3 || level.starScores[1] >= level.starScores[2]) throw new Error(`第 ${level.level} 关星级分数配置不正确。`);
  for (const value of Object.values(level.props ?? {})) if (!Number.isInteger(value) || value < 0) throw new Error(`第 ${level.level} 关道具数量不正确。`);
  return true;
}
