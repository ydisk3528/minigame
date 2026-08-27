function gridFor(level) {
  const blockers = new Set((level.obstacles ?? [])
    .filter(item => item.type === 3 || item.type === 4)
    .map(item => `${item.row}:${item.column}`));
  return Array.from({ length: level.rows }, (_, row) => Array.from({ length: level.columns }, (_, column) =>
    level.mask?.[row]?.[column] && !blockers.has(`${row}:${column}`)
      ? level.initialLayout?.[row]?.[column] ?? -1 : -1));
}

function hasMatch(grid, matchLength) {
  const rows = grid.length, columns = grid[0]?.length ?? 0;
  for (let row = 0; row < rows; row++) for (let start = 0; start < columns;) {
    const type = grid[row][start];
    let end = start + 1;
    while (end < columns && grid[row][end] === type) end++;
    if (type >= 0 && end - start >= matchLength) return true;
    start = end;
  }
  for (let column = 0; column < columns; column++) for (let start = 0; start < rows;) {
    const type = grid[start][column];
    let end = start + 1;
    while (end < rows && grid[end][column] === type) end++;
    if (type >= 0 && end - start >= matchLength) return true;
    start = end;
  }
  return false;
}

export function countPossibleMoves(level) {
  const grid = gridFor(level);
  const locked = new Set((level.obstacles ?? []).filter(item => item.type === 2)
    .map(item => `${item.row}:${item.column}`));
  const specials = new Set((level.initialSpecials ?? []).map(item => `${item.row}:${item.column}`));
  let count = 0;
  for (let row = 0; row < level.rows; row++) for (let column = 0; column < level.columns; column++) {
    for (const [rowOffset, columnOffset] of [[0, 1], [1, 0]]) {
      const otherRow = row + rowOffset, otherColumn = column + columnOffset;
      const firstKey = `${row}:${column}`, secondKey = `${otherRow}:${otherColumn}`;
      if (otherRow >= level.rows || otherColumn >= level.columns || grid[row][column] < 0
        || grid[otherRow][otherColumn] < 0 || locked.has(firstKey) || locked.has(secondKey)) continue;
      if (specials.has(firstKey) || specials.has(secondKey)) { count++; continue; }
      if (grid[row][column] === grid[otherRow][otherColumn]) continue;
      [grid[row][column], grid[otherRow][otherColumn]] = [grid[otherRow][otherColumn], grid[row][column]];
      if (hasMatch(grid, level.matchLength ?? 3)) count++;
      [grid[row][column], grid[otherRow][otherColumn]] = [grid[otherRow][otherColumn], grid[row][column]];
    }
  }
  return count;
}

export function validateLevel(level) {
  const issues = [];
  const error = (code, message) => issues.push({ severity: "error", code, message });
  const warning = (code, message) => issues.push({ severity: "warning", code, message });
  const validMask = Number.isInteger(level.rows) && Number.isInteger(level.columns)
    && level.rows >= 3 && level.columns >= 3 && level.mask?.length === level.rows
    && level.mask.every(row => row.length === level.columns && row.every(value => value === 0 || value === 1));
  const validLayout = level.initialLayout?.length === level.rows
    && level.initialLayout.every(row => row.length === level.columns);
  if (!validMask) error("grid", "棋盘尺寸或遮罩数据不正确。");
  if (!validLayout) error("layout", "初始宝石布局尺寸不正确。");
  if (!validMask || !validLayout) return issues;

  const active = level.mask.flat().filter(Boolean).length;
  const matchLength = level.matchLength ?? 3;
  if (active < Math.max(12, matchLength * 2)) error("active", `可用格只有 ${active} 个，无法稳定游玩。`);
  else if (active < 24) warning("active-low", `可用格只有 ${active} 个，建议实际试玩。`);
  if (!Number.isInteger(level.moveLimit) || level.moveLimit < 5 || level.moveLimit > 60) error("moves", "步数应在 5～60 之间。");
  if (!Number.isInteger(level.gemTypes) || level.gemTypes < 3 || level.gemTypes > 6) error("colors", "宝石颜色数量应在 3～6 之间。");
  if (matchLength < 3 || matchLength > 5) error("match-length", "基础消除数量应在 3～5 之间。");
  if (!level.goals?.length) error("goals", "至少需要一个目标。");
  else if (level.goals.length > 3) warning("goals-many", "目标超过 3 个，手机顶部可能显示拥挤。");
  if (level.goals?.length === 1) {
    const goal = level.goals[0];
    const oneTurnRisk = (["breakIce", "breakCrate"].includes(goal.type) && goal.count <= 1)
      || (goal.type === "collectGem" && goal.count <= matchLength)
      || (goal.type === "score" && goal.count <= matchLength * 160);
    if (oneTurnRisk) error("one-turn-risk", "唯一目标可能一次消除就完成，请提高数量或增加收集/分数目标。");
  }

  const activeAt = (row, column) => level.mask[row]?.[column] === 1;
  if ((level.obstacles ?? []).some(item => !activeAt(item.row, item.column))) error("obstacle-mask", "有障碍位于不可用格。");
  if ((level.initialSpecials ?? []).some(item => !activeAt(item.row, item.column))) error("special-mask", "有特殊宝石位于不可用格。");
  const obstacleKeys = (level.obstacles ?? []).map(item => `${item.row}:${item.column}`);
  if (new Set(obstacleKeys).size !== obstacleKeys.length) error("obstacle-duplicate", "同一个格子放置了多个障碍。");
  const ice = (level.obstacles ?? []).filter(item => item.type === 1).length;
  const crates = (level.obstacles ?? []).filter(item => item.type === 3).length;
  for (const goal of level.goals ?? []) {
    if (!Number.isInteger(goal.count) || goal.count < 1) error("goal-count", "目标数量必须大于 0。");
    if (goal.type === "collectGem" && (!Number.isInteger(goal.gemType) || goal.gemType < 0 || goal.gemType >= level.gemTypes)) {
      error("goal-color", "收集目标使用了未启用的宝石颜色。");
    }
    if (goal.type === "breakIce" && goal.count > ice) error("goal-ice", `冰块目标 ${goal.count}，但棋盘只有 ${ice} 个冰块。`);
    if (goal.type === "breakCrate" && goal.count > crates) error("goal-crate", `木箱目标 ${goal.count}，但棋盘只有 ${crates} 个木箱。`);
    if (goal.type === "score" && goal.count > level.moveLimit * 650) warning("goal-score", "分数目标相对步数偏高，建议试玩确认。");
  }
  const hasStrongSupport = (level.goals ?? []).some(goal => (goal.type === "collectGem" && goal.count >= 12)
    || (goal.type === "score" && goal.count >= level.moveLimit * 180));
  const weakGoal = (level.goals ?? []).some(goal => (goal.type === "collectGem" && goal.count < 8)
    || (goal.type === "score" && goal.count < level.moveLimit * 120)
    || (["breakIce", "breakCrate"].includes(goal.type) && goal.count < 2 && !hasStrongSupport));
  if (weakGoal) warning("goal-too-low", "目标强度过低，建议提高数量或搭配收集/分数目标。");
  if ((level.obstacles ?? []).length > active * .35) warning("obstacles", "障碍超过可用格的 35%，建议实际试玩。");
  const grid = gridFor(level);
  if (hasMatch(grid, matchLength)) error("initial-match", "初始棋盘已经存在可消除组合。");
  if (countPossibleMoves(level) === 0) error("no-move", "初始棋盘没有合法交换。");
  return issues;
}
