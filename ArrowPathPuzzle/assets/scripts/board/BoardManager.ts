import { _decorator, clamp, Component, EventTouch, instantiate, Node, Prefab, Rect, UITransform, Vec2, Vec3 } from 'cc';
import { eventBus, GameEvent, PathClearedEvent } from '../core/EventBus';
import { LevelData } from '../data/LevelData';
import { ArrowPath, ArrowPathState } from './ArrowPath';
const { ccclass, property } = _decorator;

@ccclass('BoardManager')
export class BoardManager extends Component {
    @property(Prefab) arrowPathPrefab: Prefab | null = null;
    @property maxBlockedAttempts = 3;

    private paths: ArrowPath[] = [];
    private level!: LevelData;
    private hammerArmed = false;
    private bombArmed = false;
    private touchStart = new Vec2();
    private nodeStart = new Vec3();
    private moved = false;
    private pinchDistance = 0;
    private pinchScale = 1;
    private levelCleared = false;

    onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
    onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    loadLevel(level: LevelData): void {
        this.level = level;
        this.levelCleared = false;
        this.paths.length = 0;
        this.node.removeAllChildren();
        const board = this.getComponent(UITransform)!;
        const boardRect = new Rect(-board.width / 2, -board.height / 2, board.width, board.height);
        for (const data of level.paths) {
            const node = instantiate(this.arrowPathPrefab!);
            node.parent = this.node;
            node.layer = this.node.layer;
            const path = node.getComponent(ArrowPath)!;
            path.initialize(data, data.points.map(([x, y]) => this.gridToLocal(x, y)), boardRect);
            this.paths.push(path);
        }
    }

    hint(): boolean {
        const path = this.activePaths().find((candidate) => this.canEscape(candidate));
        path?.highlight();
        return !!path;
    }

    scan(): void { this.activePaths().filter((path) => this.canEscape(path)).forEach((path) => path.highlight(1.6)); }
    armHammer(): void { this.hammerArmed = true; this.bombArmed = false; }
    armBomb(): void { this.bombArmed = true; this.hammerArmed = false; }

    setZoom(progress: number): void {
        const scale = 1 + clamp(progress, 0, 1);
        this.node.setScale(scale, scale, 1);
    }

    private onTouchStart(event: EventTouch): void {
        const touches = event.getAllTouches();
        this.moved = false;
        if (touches.length >= 2) {
            this.pinchDistance = Vec2.distance(touches[0].getUILocation(), touches[1].getUILocation());
            this.pinchScale = this.node.scale.x;
            return;
        }
        this.touchStart.set(event.getUILocation());
        this.nodeStart.set(this.node.position);
    }

    private onTouchMove(event: EventTouch): void {
        const touches = event.getAllTouches();
        if (touches.length >= 2) {
            const distance = Vec2.distance(touches[0].getUILocation(), touches[1].getUILocation());
            const scale = clamp(this.pinchScale * distance / Math.max(1, this.pinchDistance), 1, 2);
            this.node.setScale(scale, scale, 1);
            this.moved = true;
            return;
        }
        const location = event.getUILocation();
        const dx = location.x - this.touchStart.x;
        const dy = location.y - this.touchStart.y;
        if (Math.hypot(dx, dy) < 15) return;
        this.moved = true;
        const view = this.node.parent!.getComponent(UITransform)!;
        const board = this.getComponent(UITransform)!;
        const maxX = Math.max(0, (board.width * this.node.scale.x - view.width) / 2);
        const maxY = Math.max(0, (board.height * this.node.scale.y - view.height) / 2);
        this.node.setPosition(
            clamp(this.nodeStart.x + dx, -maxX, maxX),
            clamp(this.nodeStart.y + dy, -maxY, maxY),
            this.nodeStart.z,
        );
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.moved) this.onTouch(event);
        this.pinchDistance = 0;
    }

    private onTouch(event: EventTouch): void {
        const ui = this.getComponent(UITransform)!;
        const local = ui.convertToNodeSpaceAR(new Vec3(event.getUILocation().x, event.getUILocation().y));
        const point = new Vec2(local.x, local.y);
        let path: ArrowPath | undefined;
        let nearest = Number.POSITIVE_INFINITY;
        for (const candidate of this.activePaths()) {
            const distance = candidate.distanceTo(point);
            if (distance < nearest) { nearest = distance; path = candidate; }
        }
        if (!path || nearest > path.touchTolerance) return;
        if (this.bombArmed) {
            this.bombArmed = false;
            this.activePaths().filter((candidate) => this.isNear(candidate, path, 108)).forEach((candidate) => this.clear(candidate));
        } else if (this.hammerArmed) {
            this.hammerArmed = false;
            this.clear(path);
        } else if (this.canEscape(path)) {
            this.clear(path);
        } else {
            path.blocked();
            this.firstBlocker(path)?.warn();
            eventBus.emit(GameEvent.PATH_BLOCKED);
        }
    }

    private canEscape(path: ArrowPath): boolean {
        const obstacles: Rect[] = [];
        for (const other of this.activePaths()) if (other !== path) obstacles.push(...other.collisionRects());
        return path.canEscape(obstacles);
    }

    private firstBlocker(path: ArrowPath): ArrowPath | undefined {
        return this.activePaths().find((other) => other !== path && !path.canEscape(other.collisionRects()));
    }

    private clear(path: ArrowPath): void {
        const tip = path.points[path.points.length - 1];
        const world = this.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(tip.x, tip.y));
        path.flyOut(() => {
            const remaining = this.activePaths().length;
            eventBus.emit(GameEvent.PATH_CLEARED, { position: world, remaining } satisfies PathClearedEvent);
            if (!remaining && !this.levelCleared) {
                this.levelCleared = true;
                eventBus.emit(GameEvent.LEVEL_CLEAR);
            }
        });
    }

    private isNear(a: ArrowPath, b: ArrowPath, radius: number): boolean {
        const limit = radius * radius;
        return a.points.some((p) => b.points.some((q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 <= limit));
    }

    private activePaths(): ArrowPath[] { return this.paths.filter((path) => path.state === ArrowPathState.Idle); }

    private gridToLocal(x: number, y: number): Vec2 {
        const { columns, rows, cellSize } = this.level.grid;
        return new Vec2((x - (columns - 1) / 2) * cellSize, (y - (rows - 1) / 2) * cellSize);
    }
}
