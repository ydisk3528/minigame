import { ExitDirection, LevelData } from '../data/LevelData';

export interface LegacyLevelConfig {
    id: number;
    width: number;
    height: number;
    levelData: string;
    time: number;
}

/** Cocos 2.4 Level.js data adapter. The first legacy cell is the arrow head. */
export function convertLegacyLevel(config: LegacyLevelConfig): LevelData {
    const source = JSON.parse(config.levelData) as number[][];
    return {
        level: config.id,
        grid: { columns: config.width, rows: config.height, cellSize: 24 },
        paths: source.map((cells, id) => {
            const head = cells[0];
            const neck = cells[1];
            const hx = head % config.width;
            const hy = Math.floor(head / config.width);
            const nx = neck % config.width;
            const ny = Math.floor(neck / config.width);
            const exitDirection: ExitDirection = hx > nx ? 'right' : hx < nx ? 'left' : hy < ny ? 'up' : 'down';
            const points = cells.slice().reverse().map((cell): [number, number] => [
                cell % config.width,
                config.height - 1 - Math.floor(cell / config.width),
            ]);
            return { id, points: compress(points), exitDirection, color: '#000000' };
        }),
    };
}

function compress(points: [number, number][]): [number, number][] {
    if (points.length < 3) return points;
    const result = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1];
        const b = points[i];
        const c = points[i + 1];
        if ((a[0] - b[0]) * (b[1] - c[1]) !== (a[1] - b[1]) * (b[0] - c[0])) result.push(b);
    }
    result.push(points[points.length - 1]);
    return result;
}
