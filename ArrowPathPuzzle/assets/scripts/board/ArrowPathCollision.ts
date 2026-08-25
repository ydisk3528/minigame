import { Rect, Vec2 } from 'cc';
import { ExitDirection } from '../data/LevelData';

export class ArrowPathCollision {
    static segmentRects(points: readonly Vec2[], thickness: number): Rect[] {
        const half = thickness * 0.5;
        const rects: Rect[] = [];
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const b = points[i];
            rects.push(new Rect(
                Math.min(a.x, b.x) - half,
                Math.min(a.y, b.y) - half,
                Math.abs(a.x - b.x) + thickness,
                Math.abs(a.y - b.y) + thickness,
            ));
        }
        return rects;
    }

    static canEscape(
        points: readonly Vec2[],
        direction: ExitDirection,
        board: Rect,
        obstacles: readonly Rect[],
        thickness: number,
    ): boolean {
        const tip = points[points.length - 1];
        const distance = this.escapeDistance(points, direction, board, thickness * 2);
        const delta = this.delta(direction, distance);
        const half = thickness * 0.5;
        const end = new Vec2(tip.x + delta.x, tip.y + delta.y);
        const ray = new Rect(
            Math.min(tip.x, end.x) - half,
            Math.min(tip.y, end.y) - half,
            Math.abs(end.x - tip.x) + thickness,
            Math.abs(end.y - tip.y) + thickness,
        );
        return obstacles.every((obstacle) => !ray.intersects(obstacle));
    }

    static escapeDistance(points: readonly Vec2[], direction: ExitDirection, board: Rect, margin: number): number {
        const tip = points[points.length - 1];
        if (direction === 'right') return board.xMax - tip.x + margin;
        if (direction === 'left') return tip.x - board.xMin + margin;
        if (direction === 'up') return board.yMax - tip.y + margin;
        return tip.y - board.yMin + margin;
    }

    static delta(direction: ExitDirection, distance: number): Vec2 {
        if (direction === 'right') return new Vec2(distance, 0);
        if (direction === 'left') return new Vec2(-distance, 0);
        if (direction === 'up') return new Vec2(0, distance);
        return new Vec2(0, -distance);
    }
}
