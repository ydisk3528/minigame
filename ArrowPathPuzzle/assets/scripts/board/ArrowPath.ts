import { _decorator, Color, Component, Rect, tween, UIOpacity, Vec2, Vec3 } from 'cc';
import { ArrowPathData } from '../data/LevelData';
import { ArrowPathCollision } from './ArrowPathCollision';
import { ArrowPathRenderer } from './ArrowPathRenderer';
import { PathHitTest } from './PathHitTest';
const { ccclass, property } = _decorator;

export enum ArrowPathState { Idle, Selected, Moving, Cleared, Blocked }

@ccclass('ArrowPath')
export class ArrowPath extends Component {
    @property(ArrowPathRenderer) renderer: ArrowPathRenderer | null = null;
    @property touchTolerance = 24;
    @property flyDuration = 0.48;

    data!: ArrowPathData;
    points: Vec2[] = [];
    state = ArrowPathState.Idle;
    private boardRect = new Rect();

    initialize(data: ArrowPathData, points: Vec2[], boardRect: Rect): void {
        this.data = data;
        this.points = points;
        this.boardRect = boardRect;
        this.node.name = `ArrowPath_${data.id}`;
        this.renderer ??= this.getComponent(ArrowPathRenderer);
        this.renderer!.draw(points, data.exitDirection, data.color ? new Color().fromHEX(data.color) : undefined);
    }

    contains(point: Vec2): boolean {
        return this.state === ArrowPathState.Idle && PathHitTest.contains(point, this.points, this.touchTolerance);
    }

    distanceTo(point: Vec2): number {
        return this.state === ArrowPathState.Idle ? PathHitTest.distance(point, this.points) : Number.POSITIVE_INFINITY;
    }

    collisionRects(): Rect[] {
        return ArrowPathCollision.segmentRects(this.points, this.renderer!.lineWidth + 8);
    }

    canEscape(obstacles: readonly Rect[]): boolean {
        return ArrowPathCollision.canEscape(this.points, this.data.exitDirection, this.boardRect, obstacles, this.renderer!.lineWidth + 8);
    }

    flyOut(onComplete: () => void): void {
        if (this.state !== ArrowPathState.Idle && this.state !== ArrowPathState.Selected) return;
        this.state = ArrowPathState.Moving;
        this.renderer!.draw(this.points, this.data.exitDirection, this.renderer!.selectedColor);
        const distance = ArrowPathCollision.escapeDistance(this.points, this.data.exitDirection, this.boardRect, 80);
        const delta = ArrowPathCollision.delta(this.data.exitDirection, distance);
        const progress = { value: 0 };
        tween(progress).to(this.flyDuration * 0.55, { value: 1 }, {
            easing: 'quadIn',
            onUpdate: () => this.renderer!.drawTrimmed(this.points, this.data.exitDirection, progress.value),
        }).call(() => {
            tween(this.node).to(this.flyDuration * 0.45, { position: new Vec3(delta.x, delta.y, 0) }, { easing: 'quadIn' }).call(() => {
                this.state = ArrowPathState.Cleared;
                this.node.active = false;
                onComplete();
            }).start();
        }).start();
    }

    blocked(): void {
        if (this.state !== ArrowPathState.Idle) return;
        this.state = ArrowPathState.Blocked;
        this.renderer!.draw(this.points, this.data.exitDirection, this.renderer!.blockedColor);
        tween(this.node)
            .by(0.04, { position: new Vec3(12, 0) }).by(0.08, { position: new Vec3(-24, 0) })
            .by(0.08, { position: new Vec3(24, 0) }).by(0.04, { position: new Vec3(-12, 0) })
            .call(() => { this.state = ArrowPathState.Idle; this.renderer!.draw(this.points, this.data.exitDirection); }).start();
    }

    highlight(duration = 1.2): void {
        if (this.state !== ArrowPathState.Idle) return;
        const opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.renderer!.draw(this.points, this.data.exitDirection, this.renderer!.selectedColor);
        tween(opacity).to(0.18, { opacity: 120 }).to(0.18, { opacity: 255 }).union().repeat(Math.max(1, Math.floor(duration / 0.36)))
            .call(() => this.renderer!.draw(this.points, this.data.exitDirection)).start();
    }

    warn(): void {
        if (this.state !== ArrowPathState.Idle) return;
        this.renderer!.draw(this.points, this.data.exitDirection, this.renderer!.blockedColor);
        this.scheduleOnce(() => {
            if (this.state === ArrowPathState.Idle) this.renderer!.draw(this.points, this.data.exitDirection);
        }, 0.55);
    }
}
