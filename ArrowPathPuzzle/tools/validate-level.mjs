import { readFileSync } from 'node:fs';

const file = new URL('../assets/resources/levels/level_001.json', import.meta.url);
const level = JSON.parse(readFileSync(file, 'utf8'));
const half = 8;
const board = { x0: -level.grid.columns * level.grid.cellSize / 2, y0: -level.grid.rows * level.grid.cellSize / 2,
    x1: level.grid.columns * level.grid.cellSize / 2, y1: level.grid.rows * level.grid.cellSize / 2 };
const points = (path) => path.points.map(([x, y]) => ({
    x: (x - (level.grid.columns - 1) / 2) * level.grid.cellSize,
    y: (y - (level.grid.rows - 1) / 2) * level.grid.cellSize,
}));
const rects = (path) => points(path).slice(1).map((b, i) => {
    const a = points(path)[i];
    return { x0: Math.min(a.x, b.x) - half, y0: Math.min(a.y, b.y) - half,
        x1: Math.max(a.x, b.x) + half, y1: Math.max(a.y, b.y) + half };
});
const intersects = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const canEscape = (path, others) => {
    const ps = points(path);
    const tip = ps[ps.length - 1];
    const distance = path.exitDirection === 'right' ? board.x1 - tip.x + 16
        : path.exitDirection === 'left' ? tip.x - board.x0 + 16
        : path.exitDirection === 'up' ? board.y1 - tip.y + 16
        : tip.y - board.y0 + 16;
    const delta = { x: path.exitDirection === 'right' ? distance : path.exitDirection === 'left' ? -distance : 0,
        y: path.exitDirection === 'up' ? distance : path.exitDirection === 'down' ? -distance : 0 };
    const obstacles = others.flatMap(rects);
    return !obstacles.some((o) => intersects({
        x0: Math.min(tip.x, tip.x + delta.x) - half, y0: Math.min(tip.y, tip.y + delta.y) - half,
        x1: Math.max(tip.x, tip.x + delta.x) + half, y1: Math.max(tip.y, tip.y + delta.y) + half,
    }, o));
};

const remaining = [...level.paths];
const order = [];
while (remaining.length) {
    const index = remaining.findIndex((path) => canEscape(path, remaining.filter((other) => other !== path)));
    if (index < 0) throw new Error(`Level ${level.level} is deadlocked after clearing: ${order.join(', ')}`);
    order.push(remaining[index].id);
    remaining.splice(index, 1);
}
console.log(`Level ${level.level} valid: ${level.paths.length} paths; escape order ${order.join(' -> ')}`);
