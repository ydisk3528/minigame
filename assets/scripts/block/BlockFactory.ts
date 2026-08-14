import {
    _decorator,
    Component,
    instantiate,
    Layers,
    Node,
    Prefab,
    SpriteFrame,
    UITransform,
} from 'cc';
import { BoardManager } from '../core/BoardManager';
import { ScoreManager } from '../core/ScoreManager';
import { EffectManager } from '../effect/EffectManager';
import { Block } from './Block';
import { BlockColorId, type BlockData } from './BlockData';
import { BLOCK_SHAPES, type BlockShape } from './BlockShape';

const { ccclass } = _decorator;

const COLOR_COUNT = Object.keys(BlockColorId).length / 2;
const IDLE_HINT_SECONDS = 10;

@ccclass('BlockFactory')
export class BlockFactory extends Component {
    private boardManager: BoardManager | null = null;
    private scoreManager: ScoreManager | null = null;
    private effectManager: EffectManager | null = null;
    private previewSlots: readonly Node[] = [];
    private gemSpriteFrames: readonly SpriteFrame[] = [];
    private blockPrefab: Prefab | null = null;
    private readonly activeBlocks = new Set<Block>();
    private allowedShapeIds: ReadonlySet<number> | null = null;
    private colorCount = COLOR_COUNT;
    private mixedCellColorChance = 0;
    private initialized = false;
    private gameOverNotified = false;
    private onNoMoves: (() => void) | null = null;
    private gameplayActive = true;
    private idleSeconds = 0;
    private hintCooldown = false;

    public initialize(
        boardManager: BoardManager,
        scoreManager: ScoreManager,
        effectManager: EffectManager,
        previewSlots: readonly Node[],
        gemSpriteFrames: readonly SpriteFrame[],
        blockPrefab: Prefab | null,
    ): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        this.boardManager = boardManager;
        this.scoreManager = scoreManager;
        this.effectManager = effectManager;
        this.previewSlots = previewSlots;
        this.gemSpriteFrames = gemSpriteFrames;
        this.blockPrefab = blockPrefab;
        if (this.gemSpriteFrames.length === 0) {
            console.warn('[BlockFactory] No Gem Tile Frame is assigned on GameUI.');
            return;
        }
        this.spawnBlockSet();
    }

    public getDebugPreviewData(): readonly {
        readonly shapeId: number;
        readonly colorId: number;
        readonly cellColorIds: readonly number[];
        readonly cells: readonly { readonly row: number; readonly column: number }[];
    }[] {
        return Array.from(this.activeBlocks).map((block) => ({
            shapeId: block.getData()?.shapeId ?? -1,
            colorId: block.getData()?.colorId ?? -1,
            cellColorIds: [...(block.getData()?.cellColorIds ?? [])],
            cells: (block.getShape()?.cells ?? []).map((cell) => ({ ...cell })),
        }));
    }

    public resetForLevel(
        availableShapeIds: readonly number[],
        colorCount = COLOR_COUNT,
        mixedCellColorChance = 0,
    ): void {
        this.unscheduleAllCallbacks();
        this.allowedShapeIds = new Set(availableShapeIds);
        this.colorCount = Math.max(1, Math.min(COLOR_COUNT, Math.floor(colorCount)));
        this.mixedCellColorChance = Math.max(0, Math.min(1, mixedCellColorChance));
        this.gameOverNotified = false;
        this.gameplayActive = true;
        this.resetIdleHint();
        this.activeBlocks.clear();
        for (const slot of this.previewSlots) {
            this.destroyChildren(slot);
        }
        if (this.gemSpriteFrames.length > 0) {
            this.spawnBlockSet();
        }
    }

    public setGameplayActive(
        active: boolean,
        availableShapeIds: readonly number[],
        colorCount = COLOR_COUNT,
        mixedCellColorChance = 0,
    ): void {
        this.unscheduleAllCallbacks();
        this.gameOverNotified = false;
        this.gameplayActive = active;
        this.resetIdleHint();
        this.activeBlocks.clear();
        for (const slot of this.previewSlots) {
            this.destroyChildren(slot);
        }
        if (!active) {
            return;
        }
        this.allowedShapeIds = new Set(availableShapeIds);
        this.colorCount = Math.max(1, Math.min(COLOR_COUNT, Math.floor(colorCount)));
        this.mixedCellColorChance = Math.max(0, Math.min(1, mixedCellColorChance));
        if (this.gemSpriteFrames.length > 0) {
            this.spawnBlockSet();
        }
    }

    public setNoMovesCallback(callback: (() => void) | null): void {
        this.onNoMoves = callback;
    }

    protected override update(deltaTime: number): void {
        if (!this.gameplayActive || this.gameOverNotified || this.hintCooldown) {
            return;
        }
        this.idleSeconds += deltaTime;
        if (this.idleSeconds < IDLE_HINT_SECONDS) {
            return;
        }
        const block = Array.from(this.activeBlocks).find((candidate) => {
            const shape = candidate.getShape();
            return shape !== null && (this.boardManager?.hasAnyPlacement(shape) ?? false);
        });
        if (block === undefined) {
            return;
        }
        this.hintCooldown = true;
        block.playHint();
        this.scheduleOnce(() => {
            this.hintCooldown = false;
            this.idleSeconds = 0;
        }, 1.25);
    }

    private spawnBlockSet(): void {
        if (this.boardManager === null || this.gemSpriteFrames.length === 0) {
            return;
        }

        const availableShapes = BLOCK_SHAPES.filter((shape) =>
            (this.allowedShapeIds === null || this.allowedShapeIds.has(shape.id))
            && (this.boardManager?.hasAnyPlacement(shape) ?? false),
        );
        if (availableShapes.length === 0) {
            console.info('[BlockFactory] No available shape remains.');
            this.notifyNoMoves();
            return;
        }

        const candidates = [...availableShapes];
        this.previewSlots.forEach((slot, index) => {
            this.destroyChildren(slot);
            const shape = this.takeRandomShape(candidates, availableShapes);
            const block = this.createBlock(slot, shape);
            this.activeBlocks.add(block);
            block.playSpawn(index * 0.08);
        });
    }

    private createBlock(slot: Node, shape: BlockShape): Block {
        const blockNode = this.blockPrefab === null
            ? new Node(`Block_${shape.id}`)
            : instantiate(this.blockPrefab);
        blockNode.name = `Block_${shape.id}`;
        blockNode.layer = Layers.Enum.UI_2D;
        blockNode.setParent(slot);
        blockNode.setPosition(0, 0);
        if (blockNode.getComponent(UITransform) === null) {
            blockNode.addComponent(UITransform);
        }

        const baseColorId = Math.floor(Math.random() * this.colorCount) as BlockColorId;
        const data: BlockData = {
            shapeId: shape.id,
            colorId: baseColorId,
            cellColorIds: this.createCellColorIds(shape, baseColorId),
        };
        const block = blockNode.getComponent(Block) ?? blockNode.addComponent(Block);
        const spriteFrame = this.gemSpriteFrames[
            Math.floor(Math.random() * this.gemSpriteFrames.length)
        ];
        block.initialize({
            data,
            shape,
            spriteFrame,
            boardManager: this.boardManager as BoardManager,
            onPlaced: (placedBlock, clearResult) => {
                const gainedScore = this.scoreManager?.recordPlacement(
                    shape.cells.length,
                    clearResult,
                ) ?? 0;
                this.effectManager?.playLineClear(
                    clearResult,
                    gainedScore,
                    this.scoreManager?.getCombo() ?? 0,
                );
                this.onBlockPlaced(placedBlock);
            },
            onInteraction: () => this.resetIdleHint(),
        });
        return block;
    }

    private createCellColorIds(
        shape: BlockShape,
        baseColorId: BlockColorId,
    ): readonly BlockColorId[] {
        if (this.mixedCellColorChance <= 0 || this.colorCount <= 1) {
            return shape.cells.map(() => baseColorId);
        }
        return shape.cells.map((_, index) => {
            if (index === 0 || Math.random() >= this.mixedCellColorChance) {
                return baseColorId;
            }
            const offset = 1 + Math.floor(Math.random() * (this.colorCount - 1));
            return ((baseColorId + offset) % this.colorCount) as BlockColorId;
        });
    }

    private onBlockPlaced(block: Block): void {
        this.resetIdleHint();
        this.activeBlocks.delete(block);
        if (this.activeBlocks.size === 0) {
            this.scheduleOnce(() => this.spawnBlockSet(), 0.22);
            return;
        }
        this.scheduleOnce(() => this.checkRemainingPlacements(), 0.24);
    }

    private checkRemainingPlacements(): void {
        if (this.boardManager === null || this.gameOverNotified) {
            return;
        }
        const hasMove = Array.from(this.activeBlocks).some((block) => {
            const shape = block.getShape();
            return shape !== null && this.boardManager?.hasAnyPlacement(shape);
        });
        if (!hasMove) {
            this.notifyNoMoves();
        }
    }

    private notifyNoMoves(): void {
        if (this.gameOverNotified) {
            return;
        }
        this.gameOverNotified = true;
        this.onNoMoves?.();
    }

    private resetIdleHint(): void {
        this.idleSeconds = 0;
        this.hintCooldown = false;
    }

    private takeRandomShape(
        uniqueCandidates: BlockShape[],
        fallbackCandidates: readonly BlockShape[],
    ): BlockShape {
        if (uniqueCandidates.length === 0) {
            return fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
        }
        const index = Math.floor(Math.random() * uniqueCandidates.length);
        return uniqueCandidates.splice(index, 1)[0];
    }

    private destroyChildren(parent: Node): void {
        const children = parent.children as readonly Node[] | null;
        for (let index = (children?.length ?? 0) - 1; index >= 0; index -= 1) {
            const child = children?.[index];
            if (child === undefined) {
                continue;
            }
            child.removeFromParent();
            child.destroy();
        }
    }
}
