import {
    _decorator,
    Camera,
    Canvas,
    Component,
    EventTouch,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import {
    BOARD_CELL_SIZE,
    BOARD_CELL_STEP,
    BoardManager,
    type LineClearResult,
} from '../core/BoardManager';
import type { BlockData } from './BlockData';
import type { BlockShape } from './BlockShape';

const { ccclass, property } = _decorator;

const BLOCK_TILE_SIZE = 128;
const PREVIEW_MAX_WIDTH = 170;
const PREVIEW_MAX_HEIGHT = 125;

export interface BlockInitializeOptions {
    readonly data: BlockData;
    readonly shape: BlockShape;
    readonly spriteFrame: SpriteFrame;
    readonly boardManager: BoardManager;
    readonly onPlaced: (block: Block, clearResult: LineClearResult) => void;
    readonly onInteraction?: () => void;
}

@ccclass('Block')
export class Block extends Component {
    @property({ min: 0, max: 240, step: 10 })
    public dragLift = 90;

    private data: BlockData | null = null;
    private shape: BlockShape | null = null;
    private boardManager: BoardManager | null = null;
    private onPlacedCallback: ((block: Block, clearResult: LineClearResult) => void) | null = null;
    private onInteractionCallback: (() => void) | null = null;
    private readonly visualCells: Node[] = [];
    private homeParent: Node | null = null;
    private homePosition = new Vec3();
    private previewScale = 1;
    private draggable = false;
    private uiCamera: Camera | null = null;

    public initialize(options: BlockInitializeOptions): void {
        this.data = options.data;
        this.shape = options.shape;
        this.boardManager = options.boardManager;
        this.onPlacedCallback = options.onPlaced;
        this.onInteractionCallback = options.onInteraction ?? null;
        this.uiCamera = this.findUICamera();
        this.buildVisualCells(options.spriteFrame);
        this.previewScale = this.calculatePreviewScale();
        this.node.setScale(this.previewScale, this.previewScale, 1);
        this.draggable = true;
        this.registerTouchEvents();
    }

    public playSpawn(delay: number): void {
        const targetScale = new Vec3(this.previewScale, this.previewScale, 1);
        this.node.setScale(Vec3.ZERO);
        tween(this.node)
            .delay(delay)
            .to(0.22, { scale: targetScale }, { easing: 'backOut' })
            .start();
    }

    public getShape(): BlockShape | null {
        return this.shape;
    }

    public getData(): BlockData | null {
        return this.data;
    }

    public getVisualCells(): readonly Node[] {
        return this.visualCells;
    }

    public playHint(): void {
        if (!this.draggable || !this.node.isValid) {
            return;
        }
        const normal = new Vec3(this.previewScale, this.previewScale, 1);
        const raised = new Vec3(this.previewScale * 1.18, this.previewScale * 1.18, 1);
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .repeat(3,
                tween<Node>()
                    .to(0.18, { scale: raised, angle: -5 }, { easing: 'sineOut' })
                    .to(0.18, { scale: normal, angle: 5 }, { easing: 'sineInOut' }),
            )
            .to(0.08, { scale: normal, angle: 0 })
            .start();
    }

    private buildVisualCells(spriteFrame: SpriteFrame): void {
        if (this.shape === null || this.data === null) {
            return;
        }

        this.node.removeAllChildren();
        this.visualCells.length = 0;
        const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        transform.setContentSize(
            (this.shape.width - 1) * BOARD_CELL_STEP + BOARD_CELL_SIZE,
            (this.shape.height - 1) * BOARD_CELL_STEP + BOARD_CELL_SIZE,
        );

        for (const [index, offset] of this.shape.cells.entries()) {
            const cellNode = new Node(`Gem_${index}`);
            cellNode.layer = Layers.Enum.UI_2D;
            cellNode.setParent(this.node);
            cellNode.setPosition(
                (offset.column - (this.shape.width - 1) / 2) * BOARD_CELL_STEP,
                ((this.shape.height - 1) / 2 - offset.row) * BOARD_CELL_STEP,
            );
            cellNode.addComponent(UITransform).setContentSize(BLOCK_TILE_SIZE, BLOCK_TILE_SIZE);
            const sprite = cellNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = spriteFrame;
            this.visualCells.push(cellNode);
        }
    }

    private calculatePreviewScale(): number {
        if (this.shape === null) {
            return 1;
        }
        const width = (this.shape.width - 1) * BOARD_CELL_STEP + BOARD_CELL_SIZE;
        const height = (this.shape.height - 1) * BOARD_CELL_STEP + BOARD_CELL_SIZE;
        return Math.min(0.58, PREVIEW_MAX_WIDTH / width, PREVIEW_MAX_HEIGHT / height);
    }

    private registerTouchEvents(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private unregisterTouchEvents(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch): void {
        const blockLayer = this.boardManager?.getBlockLayer();
        if (!this.draggable || blockLayer == null || this.node.parent === null) {
            return;
        }

        this.onInteractionCallback?.();

        event.propagationStopped = true;
        this.homeParent = this.node.parent;
        this.homePosition.set(this.node.position);
        const worldPosition = this.node.worldPosition.clone();
        this.node.setParent(blockLayer);
        this.node.setWorldPosition(worldPosition);
        this.moveToTouch(event);

        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.1, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'sineOut' })
            .start();
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.draggable || this.node.parent !== this.boardManager?.getBlockLayer()) {
            return;
        }
        event.propagationStopped = true;
        this.moveToTouch(event);
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.draggable || this.shape === null || this.data === null) {
            return;
        }
        event.propagationStopped = true;

        const candidate = this.boardManager?.findNearestPlacement(this.shape, this.node.position);
        if (candidate == null || !candidate.valid || this.boardManager === null) {
            this.returnHome();
            return;
        }

        const clearResult = this.boardManager.placeShape(
            this.shape,
            candidate.row,
            candidate.column,
            this.visualCells,
            this.data.cellColorIds ?? this.data.colorId,
        );
        if (clearResult === null) {
            this.returnHome();
            return;
        }

        this.draggable = false;
        this.unregisterTouchEvents();
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.13, {
                position: candidate.center,
                scale: Vec3.ONE,
            }, { easing: 'backOut' })
            .call(() => {
                const callback = this.onPlacedCallback;
                this.onPlacedCallback = null;
                callback?.(this, clearResult);
            })
            .start();
    }

    private moveToTouch(event: EventTouch): void {
        const parentTransform = this.node.parent?.getComponent(UITransform);
        if (parentTransform === null || parentTransform === undefined) {
            return;
        }
        const location = event.getLocation();
        const worldPosition = this.uiCamera?.screenToWorld(
            new Vec3(location.x, location.y, 0),
        );
        if (worldPosition === undefined) {
            return;
        }
        const localPosition = parentTransform.convertToNodeSpaceAR(
            worldPosition,
        );
        localPosition.y += this.dragLift;
        localPosition.z = 0;
        this.node.setPosition(localPosition);
    }

    private findUICamera(): Camera | null {
        let current: Node | null = this.node;
        while (current !== null) {
            const canvas = current.getComponent(Canvas);
            if (canvas?.cameraComponent !== null && canvas?.cameraComponent !== undefined) {
                return canvas.cameraComponent;
            }
            current = current.parent;
        }
        return null;
    }

    private returnHome(): void {
        if (this.homeParent === null || this.node.parent === null) {
            return;
        }
        const currentParentTransform = this.node.parent.getComponent(UITransform);
        if (currentParentTransform === null) {
            return;
        }

        const returnPosition = currentParentTransform.convertToNodeSpaceAR(
            this.homeParent.worldPosition,
        );
        const returnScale = new Vec3(this.previewScale, this.previewScale, 1);
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.18, {
                position: returnPosition,
                scale: returnScale,
            }, { easing: 'sineOut' })
            .call(() => {
                if (this.homeParent !== null && this.node.isValid) {
                    this.node.setParent(this.homeParent);
                    this.node.setPosition(this.homePosition);
                    this.node.setScale(returnScale);
                }
            })
            .start();
    }
}
