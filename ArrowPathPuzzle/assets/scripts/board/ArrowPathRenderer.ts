import { _decorator, Color, Component, Graphics, Vec2 } from 'cc';
import { ExitDirection } from '../data/LevelData';
const { ccclass, property } = _decorator;

@ccclass('ArrowPathRenderer')
export class ArrowPathRenderer extends Component {
    @property(Graphics) graphics: Graphics | null = null;
    @property lineWidth = 8;
    @property arrowSize = 16;
    @property(Color) normalColor = new Color(0, 0, 0, 255);
    @property(Color) selectedColor = new Color(0, 0, 0, 255);
    @property(Color) blockedColor = new Color(210, 73, 70, 255);

    draw(points: readonly Vec2[], direction: ExitDirection, color = this.normalColor): void {
        const g = this.graphics ?? this.getComponent(Graphics)!;
        this.graphics = g;
        g.clear();
        g.lineWidth = this.lineWidth;
        g.lineCap = Graphics.LineCap.ROUND;
        g.lineJoin = Graphics.LineJoin.ROUND;
        g.strokeColor = color;
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
        g.stroke();
        this.drawArrow(g, points[points.length - 1], direction, color);
    }

    drawTrimmed(points: readonly Vec2[], direction: ExitDirection, progress: number, color = this.selectedColor): void {
        const lengths: number[] = [];
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const length = Vec2.distance(points[i - 1], points[i]);
            lengths.push(length);
            total += length;
        }
        let cut = total * Math.max(0, Math.min(1, progress));
        const visible: Vec2[] = [];
        for (let i = 0; i < lengths.length; i++) {
            if (cut >= lengths[i]) {
                cut -= lengths[i];
                continue;
            }
            const a = points[i];
            const b = points[i + 1];
            const ratio = lengths[i] ? cut / lengths[i] : 1;
            visible.push(new Vec2(a.x + (b.x - a.x) * ratio, a.y + (b.y - a.y) * ratio));
            visible.push(...points.slice(i + 1));
            break;
        }
        this.draw(visible.length ? visible : [points[points.length - 1]], direction, color);
    }

    private drawArrow(g: Graphics, tip: Vec2, direction: ExitDirection, color: Color): void {
        const s = this.arrowSize;
        const wings: Record<ExitDirection, [Vec2, Vec2]> = {
            right: [new Vec2(-s, s * 0.65), new Vec2(-s, -s * 0.65)],
            left: [new Vec2(s, s * 0.65), new Vec2(s, -s * 0.65)],
            up: [new Vec2(-s * 0.65, -s), new Vec2(s * 0.65, -s)],
            down: [new Vec2(-s * 0.65, s), new Vec2(s * 0.65, s)],
        };
        g.fillColor = color;
        g.moveTo(tip.x, tip.y);
        g.lineTo(tip.x + wings[direction][0].x, tip.y + wings[direction][0].y);
        g.lineTo(tip.x + wings[direction][1].x, tip.y + wings[direction][1].y);
        g.close();
        g.fill();
    }
}
