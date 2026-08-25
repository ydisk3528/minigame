import { Vec2 } from 'cc';

export class PathHitTest {
    static contains(point: Vec2, path: readonly Vec2[], tolerance: number): boolean {
        return this.distance(point, path) <= tolerance;
    }

    static distance(point: Vec2, path: readonly Vec2[]): number {
        let nearest = Number.POSITIVE_INFINITY;
        for (let i = 1; i < path.length; i++) {
            nearest = Math.min(nearest, this.distanceToSegment(point, path[i - 1], path[i]));
        }
        return nearest;
    }

    private static distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSq = dx * dx + dy * dy;
        if (!lengthSq) return Vec2.distance(p, a);
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
        return Vec2.distance(p, new Vec2(a.x + dx * t, a.y + dy * t));
    }
}
