import {
    _decorator,
    Color,
    Component,
    EventTouch,
    isValid,
    Label,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import {
    BOARD_CELL_SIZE,
    BOARD_CELL_STEP,
    BoardManager,
    type BoardCellRelocation,
    type BoardCoordinate,
    type LineClearResult,
} from '../core/BoardManager';
import { ScoreManager } from '../core/ScoreManager';
import { AudioManager } from '../core/AudioManager';
import { EffectManager } from '../effect/EffectManager';
import { SpriteShatter } from '../effect/SpriteShatter';
import type { Match3Config } from '../level/LevelData';
import type { GuaranteedMatchFeature } from '../level/LevelData';
import { GAME_CONFIG } from '../utils/Config';

const { ccclass } = _decorator;
const BOARD_ROWS = GAME_CONFIG.boardRows;
const BOARD_COLUMNS = GAME_CONFIG.boardColumns;

interface MatchGem {
    colorId: number;
    special: SpecialGemType;
    readonly node: Node;
}

export type SpecialGemType = 'none' | 'rocketHorizontal' | 'rocketVertical' | 'bomb' | 'rainbow';

export interface SpecialGemFrames {
    readonly rocketHorizontal: SpriteFrame | null;
    readonly rocketVertical: SpriteFrame | null;
    readonly bomb: SpriteFrame | null;
    readonly rainbow: SpriteFrame | null;
}

interface SpecialCreation {
    readonly coordinate: BoardCoordinate;
    readonly type: Exclude<SpecialGemType, 'none'>;
}

interface SpecialExpansion {
    readonly targets: Map<string, BoardCoordinate>;
    readonly destroyedBoardCells: readonly BoardCoordinate[];
}

interface AbsorptionMatch {
    readonly center: BoardCoordinate;
    readonly targets: readonly BoardCoordinate[];
}

const MAX_ENDGAME_RESCUE_DROPS = 2;
const DRAG_THRESHOLD = 28;
const IDLE_HINT_SECONDS = 10;

interface PotentialMove {
    readonly first: BoardCoordinate;
    readonly second: BoardCoordinate;
}

export interface MatchBoardDebugState {
    readonly active: boolean;
    readonly matchLength: number;
    readonly resolving: boolean;
    readonly clearingPhase: boolean;
    readonly finalHammerActive: boolean;
    readonly rescueDrops: number;
    readonly remainingColors: number;
    readonly movesRemaining: number;
    readonly targetScore: number;
    readonly remainingGems: number;
    readonly potentialMove: PotentialMove | null;
    readonly cells: ReadonlyArray<ReadonlyArray<{
        readonly colorId: number;
        readonly special: SpecialGemType;
    } | null>>;
}

@ccclass('MatchBoardManager')
export class MatchBoardManager extends Component {
    private boardManager: BoardManager | null = null;
    private scoreManager: ScoreManager | null = null;
    private effectManager: EffectManager | null = null;
    private gemFrames: readonly SpriteFrame[] = [];
    private activeGemFrames: readonly SpriteFrame[] = [];
    private specialFrames: SpecialGemFrames = {
        rocketHorizontal: null,
        rocketVertical: null,
        bomb: null,
        rainbow: null,
    };
    private statusLabel: Label | null = null;
    private colorCount = 4;
    private targetScore = 0;
    private clearingPhase = false;
    private finalHammerActive = false;
    private movesRemaining = 0;
    private initialMoves = 0;
    private idleSeconds = 0;
    private hintPlaying = false;
    private active = false;
    private resolving = false;
    private selectedGem: Node | null = null;
    private touchStart = new Vec2();
    private touchNode: Node | null = null;
    private modeVersion = 0;
    private matchLength = 4;
    private rescueWindowCursor = BOARD_COLUMNS - this.matchLength;
    private endgameRescueDropCount = 0;
    private onOutOfMoves: (() => void) | null = null;
    private onBoardSettled: (() => void) | null = null;
    private readonly positions = new Map<Node, BoardCoordinate>();
    private readonly pendingDestroyedBoardCells = new Map<string, BoardCoordinate>();
    private readonly gems: Array<Array<MatchGem | null>> = Array.from(
        { length: BOARD_ROWS },
        () => Array.from({ length: BOARD_COLUMNS }, () => null),
    );

    public initialize(
        boardManager: BoardManager,
        scoreManager: ScoreManager,
        effectManager: EffectManager,
        gemFrames: readonly SpriteFrame[],
        specialFrames: SpecialGemFrames,
        statusLabel: Label,
    ): void {
        this.boardManager = boardManager;
        this.scoreManager = scoreManager;
        this.effectManager = effectManager;
        this.gemFrames = gemFrames;
        this.activeGemFrames = gemFrames;
        this.specialFrames = specialFrames;
        this.statusLabel = statusLabel;
    }

    public setOutOfMovesCallback(callback: (() => void) | null): void {
        this.onOutOfMoves = callback;
    }

    public setBoardSettledCallback(callback: (() => void) | null): void {
        this.onBoardSettled = callback;
    }

    public activate(config: Match3Config, targetScore: number): void {
        this.modeVersion += 1;
        this.active = true;
        this.resolving = false;
        this.clearingPhase = false;
        this.finalHammerActive = false;
        this.matchLength = Math.max(3, Math.min(5, Math.floor(config.matchLength ?? 4)));
        this.rescueWindowCursor = BOARD_COLUMNS - this.matchLength;
        this.endgameRescueDropCount = 0;
        this.movesRemaining = Math.max(5, Math.floor(config.moveLimit));
        this.initialMoves = this.movesRemaining;
        this.resetIdleHint();
        this.colorCount = Math.max(3, this.gemFrames.length);
        this.activeGemFrames = [...this.gemFrames]
            .map((frame) => ({ frame, order: Math.random() }))
            .sort((first, second) => first.order - second.order)
            .map(({ frame }) => frame);
        this.targetScore = Math.max(1, Math.floor(targetScore));
        this.clearSelection();
        const initialSpecials = this.populateBoard(config);
        this.updateStatus();
        if (initialSpecials.length > 0) {
            this.resolving = true;
            const version = this.modeVersion;
            void this.resolveInitialSpecials(initialSpecials, version);
        } else if (!this.hasCurrentPotentialMove()) {
            this.updateStatus('NO POSSIBLE MATCH');
            const version = this.modeVersion;
            this.scheduleOnce(() => {
                if (this.active && version === this.modeVersion) {
                    this.onOutOfMoves?.();
                }
            }, 0.5);
        }
    }

    public deactivate(): void {
        this.modeVersion += 1;
        this.active = false;
        this.resolving = false;
        this.clearingPhase = false;
        this.finalHammerActive = false;
        AudioManager.instance?.stopBlackHoleLoop();
        this.clearSelection();
        this.clearHintAnimation();
        this.destroyAllGems();
    }

    public getMovesRemaining(): number {
        return this.movesRemaining;
    }

    public getInitialMoves(): number {
        return this.initialMoves;
    }

    public getMatchLength(): number {
        return this.matchLength;
    }

    public isClearingBoardPhase(): boolean {
        return this.clearingPhase;
    }

    public getDebugState(): MatchBoardDebugState {
        const potentialMove = this.active && !this.resolving
            ? this.findCurrentPotentialMove()
            : null;
        return {
            active: this.active,
            matchLength: this.matchLength,
            resolving: this.resolving,
            clearingPhase: this.clearingPhase,
            finalHammerActive: this.finalHammerActive,
            rescueDrops: this.endgameRescueDropCount,
            remainingColors: this.getRemainingColorIds().length,
            movesRemaining: this.movesRemaining,
            targetScore: this.targetScore,
            remainingGems: this.getRemainingGemCount(),
            potentialMove: potentialMove === null
                ? null
                : {
                    first: { ...potentialMove.first },
                    second: { ...potentialMove.second },
                },
            cells: this.gems.map((row) => row.map((gem) => gem === null
                ? null
                : { colorId: gem.colorId, special: gem.special })),
        };
    }

    public getRemainingGemCount(): number {
        let count = 0;
        for (const row of this.gems) {
            for (const gem of row) {
                count += gem === null ? 0 : 1;
            }
        }
        return count;
    }

    protected override update(deltaTime: number): void {
        if (!this.active || this.resolving || this.hintPlaying || this.selectedGem !== null) {
            return;
        }
        this.idleSeconds += deltaTime;
        if (this.idleSeconds >= IDLE_HINT_SECONDS) {
            this.playIdleHint();
        }
    }

    public isMatchModeActive(): boolean {
        return this.active;
    }

    public isBoardEmpty(): boolean {
        return this.boardManager?.getOccupiedCellCount() === 0
            && this.gems.every((row) => row.every((gem) => gem === null));
    }

    public handleExternalClear(clearResult: LineClearResult): void {
        if (!this.active || clearResult.clearedCells.length === 0) {
            return;
        }
        for (const coordinate of clearResult.clearedCells) {
            const gem = this.gems[coordinate.row]?.[coordinate.column] ?? null;
            if (gem !== null) {
                this.positions.delete(gem.node);
                this.gems[coordinate.row][coordinate.column] = null;
            }
        }
        this.resolving = true;
        const version = this.modeVersion;
        this.scheduleOnce(() => {
            if (this.active && version === this.modeVersion) {
                void this.finishExternalClear(version);
            }
        }, 0.28);
    }

    protected override onDestroy(): void {
        this.modeVersion += 1;
        this.active = false;
        this.pendingDestroyedBoardCells.clear();
        this.positions.clear();
        // Scene teardown already owns and destroys every gem node.
        for (const row of this.gems) {
            row.fill(null);
        }
    }

    private populateBoard(config: Match3Config): readonly BoardCoordinate[] {
        this.destroyAllGems();
        const guaranteedFeatures = config.guaranteedFeatures ?? [];
        const colors = this.createPlayableColorGrid(guaranteedFeatures.indexOf('vortex') >= 0);
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const colorId = colors[row][column];
                if (colorId === null) {
                    this.boardManager?.setCellOccupant(row, column, null, null);
                    continue;
                }
                const gem = this.createGem(row, column, colorId, 0);
                this.gems[row][column] = gem;
                this.boardManager?.setCellOccupant(row, column, gem.node, colorId);
                gem.node.setScale(0, 0, 1);
                tween(gem.node)
                    .delay((row + column) * 0.008)
                    .to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' })
                    .start();
            }
        }
        return this.applyGuaranteedSpecials(guaranteedFeatures);
    }

    private createPlayableColorGrid(guaranteeVortex: boolean): Array<Array<number | null>> {
        let fallback = this.createColorGridWithoutMatches();
        for (let attempt = 0; attempt < 300; attempt += 1) {
            const candidate = this.createColorGridWithoutMatches();
            fallback = candidate;
            if (guaranteeVortex) {
                const injected = this.injectGuaranteedVortex(candidate);
                if (injected && this.findMatchesInGrid(candidate).length === 0) {
                    return candidate;
                }
                continue;
            }
            if (this.hasPotentialMove(candidate)) {
                return candidate;
            }
        }
        if (guaranteeVortex) {
            this.injectGuaranteedVortex(fallback);
        }
        return fallback;
    }

    private injectGuaranteedVortex(colors: Array<Array<number | null>>): boolean {
        for (let row = 0; row < BOARD_ROWS - 1; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS - 2; column += 1) {
                const cells = [
                    { row, column },
                    { row, column: column + 1 },
                    { row, column: column + 2 },
                    { row: row + 1, column },
                    { row: row + 1, column: column + 1 },
                    { row: row + 1, column: column + 2 },
                ];
                if (!cells.every((cell) => this.boardManager?.getCell(cell.row, cell.column)?.active)) {
                    continue;
                }
                const vortexColor = 0;
                const blockerColor = Math.min(1, this.colorCount - 1);
                const guardColor = Math.min(2, this.colorCount - 1);
                colors[row][column] = guardColor;
                colors[row][column + 1] = vortexColor;
                colors[row][column + 2] = vortexColor;
                colors[row + 1][column] = vortexColor;
                colors[row + 1][column + 1] = blockerColor;
                colors[row + 1][column + 2] = vortexColor;
                return true;
            }
        }
        return false;
    }

    private applyGuaranteedSpecials(
        features: readonly GuaranteedMatchFeature[],
    ): readonly BoardCoordinate[] {
        const specials = features.filter((feature): feature is Exclude<GuaranteedMatchFeature, 'vortex'> =>
            feature !== 'vortex');
        if (specials.length === 0) {
            return [];
        }
        const candidates: BoardCoordinate[] = [];
        for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
            for (let column = BOARD_COLUMNS - 1; column >= 0; column -= 1) {
                if (this.gems[row][column] !== null) {
                    candidates.push({ row, column });
                }
            }
        }
        const creations: BoardCoordinate[] = [];
        specials.forEach((type, index) => {
            const candidateIndex = Math.floor(index * candidates.length / specials.length);
            const coordinate = candidates[candidateIndex];
            if (coordinate !== undefined) {
                this.createSpecialGem({ coordinate, type });
                creations.push({ ...coordinate });
            }
        });
        return creations;
    }

    private createColorGridWithoutMatches(): Array<Array<number | null>> {
        const colors: Array<Array<number | null>> = Array.from(
            { length: BOARD_ROWS },
            () => Array.from({ length: BOARD_COLUMNS }, () => null),
        );
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                if (!this.boardManager?.getCell(row, column)?.active) {
                    continue;
                }
                const candidates = Array.from({ length: this.colorCount }, (_, index) => index)
                    .sort(() => Math.random() - 0.5);
                colors[row][column] = candidates.find((candidate) =>
                    !this.wouldCreateInitialMatch(colors, row, column, candidate)) ?? candidates[0];
            }
        }
        return colors;
    }

    private wouldCreateInitialMatch(
        colors: ReadonlyArray<ReadonlyArray<number | null>>,
        row: number,
        column: number,
        colorId: number,
    ): boolean {
        const horizontalLength = this.getRequiredMatchLengthAt(row, column, 'horizontal');
        const verticalLength = this.getRequiredMatchLengthAt(row, column, 'vertical');
        const horizontal = column >= horizontalLength - 1
            && Array.from({ length: horizontalLength - 1 }, (_, index) =>
                colors[row][column - index - 1] === colorId).every(Boolean);
        const vertical = row >= verticalLength - 1
            && Array.from({ length: verticalLength - 1 }, (_, index) =>
                colors[row - index - 1][column] === colorId).every(Boolean);
        return horizontal || vertical;
    }

    private createGem(row: number, column: number, colorId: number, spawnHeight: number): MatchGem {
        const blockLayer = this.boardManager?.getBlockLayer() ?? null;
        const node = new Node(`MatchGem_${row}_${column}`);
        node.layer = blockLayer?.layer ?? Layers.Enum.UI_2D;
        node.setParent(blockLayer);
        node.addComponent(UITransform).setContentSize(128, 128);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const gem: MatchGem = { colorId, special: 'none', node };
        this.applyGemVisual(gem);
        const target = this.boardManager?.getCellLocalPosition(row, column) ?? Vec3.ZERO;
        node.setPosition(target.x, target.y + spawnHeight, 0);
        this.positions.set(node, { row, column });
        node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onTouchStart(node, event));
        node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onTouchMove(node, event));
        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onTouchEnd(node, event));
        node.on(Node.EventType.TOUCH_CANCEL, () => this.cancelTouch(node));
        return gem;
    }

    private onTouchStart(node: Node, event: EventTouch): void {
        if (!this.active || this.resolving) {
            return;
        }
        this.resetIdleHint();
        Tween.stopAllByTarget(node);
        tween(node)
            .to(0.08, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'sineOut' })
            .start();
        const location = event.getUILocation();
        this.touchStart.set(location.x, location.y);
        this.touchNode = node;
    }

    private onTouchEnd(node: Node, event: EventTouch): void {
        if (!this.active || this.resolving || this.touchNode !== node) {
            return;
        }
        this.touchNode = null;
        this.restorePressedScale(node);
        if (this.finalHammerActive) {
            void this.useFinalHammer(node);
            return;
        }
        const location = event.getUILocation();
        const deltaX = location.x - this.touchStart.x;
        const deltaY = location.y - this.touchStart.y;
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= DRAG_THRESHOLD) {
            const origin = this.positions.get(node);
            if (origin === undefined) {
                return;
            }
            const target = Math.abs(deltaX) > Math.abs(deltaY)
                ? { row: origin.row, column: origin.column + (deltaX > 0 ? 1 : -1) }
                : { row: origin.row + (deltaY > 0 ? -1 : 1), column: origin.column };
            void this.trySwap(origin, target);
            return;
        }
        this.handleTap(node);
    }

    private onTouchMove(node: Node, event: EventTouch): void {
        if (!this.active || this.resolving || this.finalHammerActive || this.touchNode !== node) {
            return;
        }
        const location = event.getUILocation();
        const deltaX = location.x - this.touchStart.x;
        const deltaY = location.y - this.touchStart.y;
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < DRAG_THRESHOLD) {
            return;
        }
        const origin = this.positions.get(node);
        if (origin === undefined) {
            this.touchNode = null;
            return;
        }
        this.touchNode = null;
        this.clearSelection();
        this.restorePressedScale(node);
        const target = Math.abs(deltaX) > Math.abs(deltaY)
            ? { row: origin.row, column: origin.column + (deltaX > 0 ? 1 : -1) }
            : { row: origin.row + (deltaY > 0 ? -1 : 1), column: origin.column };
        void this.trySwap(origin, target);
    }

    private cancelTouch(node: Node): void {
        if (this.touchNode === node) {
            this.touchNode = null;
        }
        this.restorePressedScale(node);
    }

    private handleTap(node: Node): void {
        if (this.selectedGem === null) {
            this.selectGem(node);
            return;
        }
        if (this.selectedGem === node) {
            this.clearSelection();
            return;
        }
        const first = this.positions.get(this.selectedGem);
        const second = this.positions.get(node);
        if (first !== undefined && second !== undefined && this.areAdjacent(first, second)) {
            this.clearSelection();
            void this.trySwap(first, second);
            return;
        }
        this.clearSelection();
        this.selectGem(node);
    }

    private selectGem(node: Node): void {
        this.selectedGem = node;
        Tween.stopAllByTarget(node);
        tween(node)
            .to(0.08, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'sineOut' })
            .to(0.1, { scale: Vec3.ONE }, { easing: 'sineIn' })
            .start();
    }

    private restorePressedScale(node: Node): void {
        if (!node.isValid) {
            return;
        }
        Tween.stopAllByTarget(node);
        tween(node)
            .to(0.09, { scale: Vec3.ONE }, { easing: 'sineOut' })
            .start();
    }

    private clearSelection(): void {
        if (this.selectedGem !== null && this.selectedGem.isValid) {
            Tween.stopAllByTarget(this.selectedGem);
            this.selectedGem.setScale(1, 1, 1);
        }
        this.selectedGem = null;
    }

    private async trySwap(first: BoardCoordinate, second: BoardCoordinate): Promise<void> {
        if (!this.active || this.resolving || !this.areAdjacent(first, second)) {
            return;
        }
        const firstGem = this.gems[first.row]?.[first.column] ?? null;
        const secondGem = this.gems[second.row]?.[second.column] ?? null;
        if (firstGem === null || secondGem === null) {
            return;
        }
        this.resolving = true;
        const version = this.modeVersion;
        this.swapEntries(first, second);
        await this.animateSwap(firstGem, secondGem, first, second);
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        const rainbowMatches = this.getRainbowSwapTargets(firstGem, secondGem, first, second);
        if (rainbowMatches.length > 0) {
            this.movesRemaining = Math.max(0, this.movesRemaining - 1);
            await this.resolveCascades(rainbowMatches, version, null);
            return;
        }
        // A valid 2x2 vortex must work regardless of which gem the player
        // starts dragging. The completed square can be around either swapped
        // endpoint after the entries have exchanged positions.
        const absorption = firstGem.colorId === secondGem.colorId
            ? null
            : this.findAbsorptionMatch(second) ?? this.findAbsorptionMatch(first);
        if (absorption !== null) {
            this.movesRemaining = Math.max(0, this.movesRemaining - 1);
            await this.resolveBlackHoleAbsorption(absorption, version);
            return;
        }
        const matches = this.findMatches();
        if (matches.length === 0) {
            this.swapEntries(second, first);
            await this.animateSwap(firstGem, secondGem, second, first);
            this.snapAllGemsToLogicalCells();
            this.playInvalidSwapFeedback(firstGem.node, secondGem.node);
            this.resolving = false;
            this.updateStatus(`NEED ${this.matchLength} OF THE SAME COLOR`);
            return;
        }

        this.movesRemaining = Math.max(0, this.movesRemaining - 1);
        await this.resolveCascades(matches, version, second);
    }

    private findAbsorptionMatch(center: BoardCoordinate): AbsorptionMatch | null {
        const colorId = this.gems[center.row]?.[center.column]?.colorId ?? null;
        if (colorId === null) {
            return null;
        }
        for (const rowOffset of [-1, 0] as const) {
            for (const columnOffset of [-1, 0] as const) {
                const top = center.row + rowOffset;
                const left = center.column + columnOffset;
                const square = [
                    { row: top, column: left },
                    { row: top, column: left + 1 },
                    { row: top + 1, column: left },
                    { row: top + 1, column: left + 1 },
                ];
                if (!square.every((coordinate) =>
                    this.gems[coordinate.row]?.[coordinate.column]?.colorId === colorId)) {
                    continue;
                }
                const targets: BoardCoordinate[] = [];
                for (let row = center.row - 2; row <= center.row + 2; row += 1) {
                    for (let column = center.column - 2; column <= center.column + 2; column += 1) {
                        if (this.gems[row]?.[column] !== null
                            && this.gems[row]?.[column] !== undefined) {
                            targets.push({ row, column });
                        }
                    }
                }
                return { center: { ...center }, targets };
            }
        }
        return null;
    }

    private async resolveBlackHoleAbsorption(
        absorption: AbsorptionMatch,
        version: number,
    ): Promise<void> {
        const centerGem = this.gems[absorption.center.row]?.[absorption.center.column] ?? null;
        const centerWorldPosition = centerGem?.node.worldPosition.clone() ?? this.node.worldPosition.clone();
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        const duration = 3;
        const startedAt = Date.now();
        this.updateStatus('BLACK HOLE!');
        this.effectManager?.startBlackHoleAbsorption(centerWorldPosition, duration);

        let targets: readonly BoardCoordinate[] = absorption.targets;
        for (let wave = 0; wave < 4; wave += 1) {
            if (!this.active || version !== this.modeVersion) {
                AudioManager.instance?.stopBlackHoleLoop();
                return;
            }
            if (targets.length === 0) {
                await this.collapseAndRefill(true);
                targets = this.collectBlackHoleTargets(absorption.center);
            }
            this.clearBlackHoleWave(targets, centerWorldPosition);
            await this.wait(0.46);
            if (wave < 3 && this.active && version === this.modeVersion) {
                // Keep feeding the vortex: newly dropped gems are collected by
                // the following wave instead of remaining untouched.
                await this.collapseAndRefill(true);
                targets = this.collectBlackHoleTargets(absorption.center);
            }
        }
        const remainingDuration = duration - (Date.now() - startedAt) / 1000;
        if (remainingDuration > 0) {
            await this.wait(remainingDuration);
        }
        AudioManager.instance?.stopBlackHoleLoop();
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        this.updateClearingPhase();
        if (this.clearingPhase && this.isBoardEmpty()) {
            this.completeClearedBoard();
            return;
        }
        await this.collapseAndRefill(!this.clearingPhase);
        const matches = this.findMatches();
        if (matches.length > 0) {
            await this.resolveCascades(matches, version);
            return;
        }
        this.snapAllGemsToLogicalCells();
        this.resolving = false;
        this.scoreManager?.resetCombo();
        const hasMove = this.hasCurrentPotentialMove();
        if (!hasMove) {
            if (this.clearingPhase) {
                await this.prepareEndgameRescue(version);
                this.onBoardSettled?.();
                return;
            } else {
                this.updateStatus('SHUFFLING...');
                await this.wait(0.35);
                if (this.active && version === this.modeVersion) {
                    await this.shuffleBoard(version);
                }
            }
        }
        if (hasMove || !this.clearingPhase) {
            this.updateStatus();
        }
        if (hasMove && this.clearingPhase) {
            this.scheduleClearingHint(version);
        }
        this.onBoardSettled?.();
        if (this.movesRemaining <= 0) {
            this.scheduleOnce(() => this.onOutOfMoves?.(), 0.35);
        }
    }

    private collectBlackHoleTargets(center: BoardCoordinate): BoardCoordinate[] {
        const targets: BoardCoordinate[] = [];
        for (let row = center.row - 2; row <= center.row + 2; row += 1) {
            for (let column = center.column - 2; column <= center.column + 2; column += 1) {
                if (this.gems[row]?.[column] !== null
                    && this.gems[row]?.[column] !== undefined) {
                    targets.push({ row, column });
                }
            }
        }
        return targets;
    }

    private clearBlackHoleWave(
        targets: readonly BoardCoordinate[],
        centerWorldPosition: Readonly<Vec3>,
    ): void {
        for (const coordinate of targets) {
            const gem = this.gems[coordinate.row]?.[coordinate.column] ?? null;
            if (gem !== null) {
                this.positions.delete(gem.node);
                this.gems[coordinate.row][coordinate.column] = null;
            }
        }
        const clearResult = this.boardManager?.clearCells(targets) ?? {
            completedRows: [],
            completedColumns: [],
            clearedCells: [],
            clearedVisualNodes: [],
        };
        const gainedScore = this.scoreManager?.recordMatchClear(
            clearResult.clearedCells.length,
            1,
        ) ?? 0;
        this.effectManager?.playBlackHoleWave(
            clearResult,
            centerWorldPosition,
            gainedScore,
            0.72,
        );
    }

    private swapEntries(first: BoardCoordinate, second: BoardCoordinate): void {
        const firstGem = this.gems[first.row][first.column];
        const secondGem = this.gems[second.row][second.column];
        this.gems[first.row][first.column] = secondGem;
        this.gems[second.row][second.column] = firstGem;
        if (secondGem !== null) {
            this.positions.set(secondGem.node, { ...first });
        }
        if (firstGem !== null) {
            this.positions.set(firstGem.node, { ...second });
        }
        this.syncBoardState();
    }

    private async animateSwap(
        firstGem: MatchGem,
        secondGem: MatchGem,
        firstOrigin: BoardCoordinate,
        secondOrigin: BoardCoordinate,
    ): Promise<void> {
        const firstTarget = this.boardManager?.getCellLocalPosition(secondOrigin.row, secondOrigin.column);
        const secondTarget = this.boardManager?.getCellLocalPosition(firstOrigin.row, firstOrigin.column);
        if (firstTarget === null || firstTarget === undefined
            || secondTarget === null || secondTarget === undefined) {
            return;
        }
        Tween.stopAllByTarget(firstGem.node);
        Tween.stopAllByTarget(secondGem.node);
        const firstFinal = new Vec3(firstTarget);
        const secondFinal = new Vec3(secondTarget);
        tween(firstGem.node)
            .to(0.15, { position: firstFinal }, { easing: 'sineInOut' })
            .call(() => {
                if (firstGem.node.isValid) firstGem.node.setPosition(firstFinal);
            })
            .start();
        tween(secondGem.node)
            .to(0.15, { position: secondFinal }, { easing: 'sineInOut' })
            .call(() => {
                if (secondGem.node.isValid) secondGem.node.setPosition(secondFinal);
            })
            .start();
        await this.wait(0.17);
        // Scheduler/tween update order can differ on a slow frame. Always snap
        // again after the wait so an interrupted tween cannot leave a gem halfway.
        if (firstGem.node.isValid) firstGem.node.setPosition(firstFinal);
        if (secondGem.node.isValid) secondGem.node.setPosition(secondFinal);
    }

    private async resolveCascades(
        initialMatches: readonly BoardCoordinate[],
        version: number,
        preferredCreation: BoardCoordinate | null = null,
    ): Promise<void> {
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        let matches = [...initialMatches];
        let cascade = 1;
        while (matches.length > 0 && this.active && version === this.modeVersion) {
            const creation = this.detectSpecialCreation(matches, preferredCreation);
            const clearResult = this.clearMatchedGems(matches, creation);
            if (creation !== null) {
                this.createSpecialGem(creation);
            }
            const gainedScore = this.scoreManager?.recordMatchClear(
                clearResult.clearedCells.length,
                cascade,
            ) ?? 0;
            const clearDuration = this.effectManager?.playMatchClear(
                clearResult,
                gainedScore,
                cascade,
            ) ?? 0.38;
            await this.wait(clearDuration);
            if (!this.active || version !== this.modeVersion) {
                return;
            }
            if (creation !== null) {
                await this.triggerSpecialGem(creation.coordinate, cascade + 1, version);
                if (!this.active || version !== this.modeVersion) {
                    return;
                }
            }
            this.updateClearingPhase();
            if (this.clearingPhase && this.isBoardEmpty()) {
                this.completeClearedBoard();
                return;
            }
            await this.collapseAndRefill(!this.clearingPhase);
            matches = this.findMatches();
            preferredCreation = null;
            cascade += 1;
        }
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        this.snapAllGemsToLogicalCells();
        this.resolving = false;
        this.scoreManager?.resetCombo();
        const hasMove = this.hasCurrentPotentialMove();
        if (!hasMove) {
            if (this.clearingPhase) {
                await this.prepareEndgameRescue(version);
                this.onBoardSettled?.();
                return;
            } else {
                this.updateStatus('SHUFFLING...');
                await this.wait(0.35);
                if (this.active && version === this.modeVersion) {
                    await this.shuffleBoard(version);
                }
            }
        }
        if (hasMove || !this.clearingPhase) {
            this.updateStatus();
        }
        if (hasMove && this.clearingPhase) {
            this.scheduleClearingHint(version);
        }
        this.onBoardSettled?.();
        if (this.movesRemaining <= 0) {
            this.scheduleOnce(() => this.onOutOfMoves?.(), 0.35);
        }
    }

    private async resolveInitialSpecials(
        coordinates: readonly BoardCoordinate[],
        version: number,
    ): Promise<void> {
        for (let index = 0; index < coordinates.length; index += 1) {
            if (!this.active || version !== this.modeVersion) {
                return;
            }
            await this.triggerSpecialGem(coordinates[index], index + 1, version);
        }
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        this.updateClearingPhase();
        if (this.clearingPhase && this.isBoardEmpty()) {
            this.completeClearedBoard();
            return;
        }
        await this.collapseAndRefill(!this.clearingPhase);
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        const matches = this.findMatches();
        if (matches.length > 0) {
            await this.resolveCascades(matches, version);
            return;
        }
        this.snapAllGemsToLogicalCells();
        this.resolving = false;
        this.scoreManager?.resetCombo();
        if (!this.hasCurrentPotentialMove()) {
            if (this.clearingPhase) {
                await this.prepareEndgameRescue(version);
                this.onBoardSettled?.();
                return;
            } else {
                this.updateStatus('SHUFFLING...');
                await this.wait(0.35);
                if (this.active && version === this.modeVersion) {
                    await this.shuffleBoard(version);
                }
            }
        } else {
            this.updateStatus();
        }
        if (this.clearingPhase && this.hasCurrentPotentialMove()) {
            this.scheduleClearingHint(version);
        }
        this.onBoardSettled?.();
    }

    private async triggerSpecialGem(
        coordinate: BoardCoordinate,
        cascade: number,
        version: number,
    ): Promise<void> {
        const gem = this.gems[coordinate.row]?.[coordinate.column] ?? null;
        if (gem === null || gem.special === 'none' || !gem.node.isValid) {
            return;
        }
        if (!this.active || version !== this.modeVersion || !gem.node.isValid) {
            return;
        }
        this.updateStatus(`${this.getSpecialLabel(gem.special)} READY!`);
        await this.wait(1);
        if (!this.active || version !== this.modeVersion || !gem.node.isValid
            || this.gems[coordinate.row]?.[coordinate.column] !== gem) {
            return;
        }
        Tween.stopAllByTarget(gem.node);
        gem.node.setScale(Vec3.ONE);
        tween(gem.node)
            .to(0.16, { scale: new Vec3(1.42, 1.42, 1), angle: gem.node.angle + 14 }, { easing: 'backOut' })
            .to(0.16, { scale: new Vec3(0.82, 0.82, 1), angle: gem.node.angle - 10 }, { easing: 'sineInOut' })
            .to(0.12, { scale: new Vec3(1.18, 1.18, 1), angle: 0 }, { easing: 'backOut' })
            .start();
        await this.wait(0.46);
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        const clearResult = this.clearMatchedGems([coordinate], null);
        const gainedScore = this.scoreManager?.recordMatchClear(
            clearResult.clearedCells.length,
            cascade,
        ) ?? 0;
        const duration = this.effectManager?.playMatchClear(
            clearResult,
            gainedScore,
            cascade,
        ) ?? 0.38;
        await this.wait(duration);
    }

    private getSpecialLabel(type: SpecialGemType): string {
        switch (type) {
            case 'rocketHorizontal':
                return 'HORIZONTAL ROCKET';
            case 'rocketVertical':
                return 'VERTICAL ROCKET';
            case 'bomb':
                return 'BOMB';
            case 'rainbow':
                return 'RAINBOW';
            default:
                return 'SPECIAL';
        }
    }

    private async prepareEndgameRescue(version: number): Promise<boolean> {
        if (!this.clearingPhase || this.hasCurrentPotentialMove()) {
            return false;
        }
        this.resolving = true;
        this.finalHammerActive = false;
        const remainingColors = this.getRemainingColorIds();
        if (remainingColors.length <= 1
            || this.endgameRescueDropCount >= MAX_ENDGAME_RESCUE_DROPS) {
            return this.resolveEndgameRainbow(version);
        }
        this.updateStatus('NO MATCH · RESCUE DROP!');
        await this.wait(0.4);
        if (!this.active || version !== this.modeVersion) {
            return true;
        }
        if (this.spawnRescueCombination()) {
            this.endgameRescueDropCount += 1;
            this.movesRemaining = Math.max(1, this.movesRemaining);
            await this.wait(0.62);
            if (!this.active || version !== this.modeVersion) {
                return true;
            }
            this.snapAllGemsToLogicalCells();
            this.resolving = false;
            this.resetIdleHint();
            this.updateStatus('RESCUE READY · SWAP THE NEW GEMS');
            return true;
        }
        this.finalHammerActive = true;
        this.resolving = false;
        this.updateStatus('FINAL HAMMER · TAP ANY GEM');
        return true;
    }

    private getRemainingColorIds(): number[] {
        const colors = new Set<number>();
        for (const row of this.gems) {
            for (const gem of row) {
                if (gem !== null) {
                    colors.add(gem.colorId);
                }
            }
        }
        return [...colors];
    }

    private async resolveEndgameRainbow(version: number): Promise<boolean> {
        let coordinate: BoardCoordinate | null = null;
        for (let row = BOARD_ROWS - 1; row >= 0 && coordinate === null; row -= 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                if (this.gems[row]?.[column] !== null) {
                    coordinate = { row, column };
                    break;
                }
            }
        }
        if (coordinate === null) {
            this.completeClearedBoard();
            return true;
        }

        this.updateStatus('FINAL RAINBOW · BOARD FINISH!');
        this.createSpecialGem({ coordinate, type: 'rainbow' });
        await this.triggerSpecialGem(coordinate, this.endgameRescueDropCount + 1, version);
        if (!this.active || version !== this.modeVersion) {
            return true;
        }
        if (this.isBoardEmpty()) {
            this.completeClearedBoard();
            return true;
        }

        await this.collapseAndRefill(false);
        if (!this.active || version !== this.modeVersion) {
            return true;
        }
        const matches = this.findMatches();
        if (matches.length > 0) {
            await this.resolveCascades(matches, version);
            return true;
        }

        this.snapAllGemsToLogicalCells();
        this.resolving = false;
        if (!this.hasCurrentPotentialMove()) {
            await this.wait(0.2);
            if (this.active && version === this.modeVersion) {
                await this.prepareEndgameRescue(version);
            }
            return true;
        }
        this.updateStatus();
        this.scheduleClearingHint(version);
        this.onBoardSettled?.();
        return true;
    }

    private spawnRescueCombination(): boolean {
        const dominantColor = this.getDominantRemainingColor();
        const blockerColor = (dominantColor + 1) % this.colorCount;
        const dropSlots = Array.from(
            { length: BOARD_COLUMNS },
            (_, column) => this.getColumnDropSlots(column),
        );

        // 优先补齐四个相邻列的高度，再在新的顶部构造横向四连机会。
        const horizontalCandidates: Array<{
            readonly windowStart: number;
            readonly entries: Array<{
                coordinate: BoardCoordinate;
                colorId: number;
            }>;
        }> = [];
        for (let column = 0; column <= BOARD_COLUMNS - this.matchLength; column += 1) {
            const windowSlots = Array.from(
                { length: this.matchLength },
                (_, index) => dropSlots[column + index],
            );
            if (windowSlots.some((slots) => slots.length === 0)) {
                continue;
            }
            const lineRow = Math.min(...windowSlots.map((slots) => slots[0].row));
            const lineSlotIndexes = windowSlots.map((slots) =>
                slots.findIndex((slot) => slot.row === lineRow));
            if (lineSlotIndexes.some((index) => index < 0)) {
                continue;
            }
            for (let targetIndex = 0; targetIndex < this.matchLength; targetIndex += 1) {
                const targetSlotIndex = lineSlotIndexes[targetIndex];
                const source = windowSlots[targetIndex][targetSlotIndex + 1];
                if (source === undefined || source.row !== lineRow - 1) {
                    continue;
                }
                const entries: Array<{ coordinate: BoardCoordinate; colorId: number }> = [];
                windowSlots.forEach((slots, windowIndex) => {
                    for (let fillerIndex = 0;
                        fillerIndex < lineSlotIndexes[windowIndex]; fillerIndex += 1) {
                        entries.push({
                            coordinate: slots[fillerIndex],
                            colorId: (dominantColor + 1 + windowIndex + fillerIndex) % this.colorCount,
                        });
                    }
                    entries.push({
                        coordinate: slots[lineSlotIndexes[windowIndex]],
                        colorId: windowIndex === targetIndex ? blockerColor : dominantColor,
                    });
                });
                entries.push({ coordinate: source, colorId: dominantColor });
                const existingCandidate = horizontalCandidates.find(
                    (candidate) => candidate.windowStart === column,
                );
                if (existingCandidate === undefined) {
                    horizontalCandidates.push({ windowStart: column, entries });
                } else if (entries.length < existingCandidate.entries.length) {
                    existingCandidate.entries.splice(0, existingCandidate.entries.length, ...entries);
                }
            }
        }
        if (horizontalCandidates.length > 0) {
            const windowCount = BOARD_COLUMNS - this.matchLength + 1;
            const distanceFromCursor = (windowStart: number): number =>
                (this.rescueWindowCursor - windowStart + windowCount) % windowCount;
            horizontalCandidates.sort((first, second) => {
                const distanceDifference = distanceFromCursor(first.windowStart)
                    - distanceFromCursor(second.windowStart);
                return distanceDifference !== 0
                    ? distanceDifference
                    : first.entries.length - second.entries.length;
            });
            const selected = horizontalCandidates[0];
            this.rescueWindowCursor = (selected.windowStart - 1 + windowCount) % windowCount;
            this.createRescueGems(selected.entries);
            return true;
        }

        // 横向空间不足时，在单列最低落点构造竖向四连机会。
        for (let column = 0; column < BOARD_COLUMNS; column += 1) {
            const line = dropSlots[column].slice(0, this.matchLength);
            if (line.length < this.matchLength
                || !line.every((coordinate, index) => index === 0
                    || coordinate.row === line[index - 1].row - 1)) {
                continue;
            }
            const target = line[this.matchLength - 1];
            for (const sourceColumn of [column + 1, column - 1]) {
                const source = dropSlots[sourceColumn]?.[0];
                if (source === undefined || source.row !== target.row) {
                    continue;
                }
                const entries = line.map((coordinate, index) => ({
                    coordinate,
                    colorId: index === this.matchLength - 1 ? blockerColor : dominantColor,
                }));
                entries.push({ coordinate: source, colorId: dominantColor });
                this.createRescueGems(entries);
                return true;
            }
        }
        return false;
    }

    private getColumnDropSlots(column: number): BoardCoordinate[] {
        if (column < 0 || column >= BOARD_COLUMNS) {
            return [];
        }
        const slots: BoardCoordinate[] = [];
        for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
            if (this.boardManager?.getCell(row, column)?.active
                && this.gems[row]?.[column] === null) {
                slots.push({ row, column });
            }
        }
        return slots;
    }

    private getDominantRemainingColor(): number {
        const counts = Array.from({ length: this.colorCount }, () => 0);
        for (const row of this.gems) {
            for (const gem of row) {
                if (gem !== null) {
                    counts[gem.colorId] += 1;
                }
            }
        }
        let bestColor = 0;
        for (let colorId = 1; colorId < counts.length; colorId += 1) {
            if (counts[colorId] > counts[bestColor]) {
                bestColor = colorId;
            }
        }
        return bestColor;
    }

    private createRescueGems(
        entries: readonly { readonly coordinate: BoardCoordinate; readonly colorId: number }[],
    ): void {
        entries.forEach((entry, index) => {
            const { row, column } = entry.coordinate;
            const gem = this.createGem(
                row,
                column,
                entry.colorId,
                (5 + index * 0.35) * BOARD_CELL_STEP,
            );
            this.gems[row][column] = gem;
            this.boardManager?.setCellOccupant(row, column, gem.node, entry.colorId);
            const target = this.boardManager?.getCellLocalPosition(row, column);
            if (target !== null && target !== undefined) {
                tween(gem.node)
                    .delay(index * 0.045)
                    .to(0.38, { position: new Vec3(target) }, { easing: 'bounceOut' })
                    .to(0.12, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'sineOut' })
                    .to(0.1, { scale: Vec3.ONE }, { easing: 'sineIn' })
                    .start();
            }
        });
        this.syncBoardState();
    }

    private async useFinalHammer(node: Node): Promise<void> {
        const coordinate = this.positions.get(node);
        if (!this.finalHammerActive || coordinate === undefined) {
            return;
        }
        this.finalHammerActive = false;
        this.resolving = true;
        const gem = this.gems[coordinate.row]?.[coordinate.column] ?? null;
        if (gem !== null) {
            this.positions.delete(gem.node);
            this.gems[coordinate.row][coordinate.column] = null;
        }
        const clearResult = this.boardManager?.clearCells([coordinate]);
        if (clearResult !== undefined) {
            this.effectManager?.playBoosterClear(clearResult, 'FINAL HAMMER!');
        }
        await this.wait(0.36);
        if (this.active) {
            await this.finishExternalClear(this.modeVersion);
        }
    }

    private clearMatchedGems(
        matches: readonly BoardCoordinate[],
        creation: SpecialCreation | null,
    ): LineClearResult {
        const expansion = this.expandSpecialTargets(matches);
        const targets = expansion.targets;
        if (creation !== null) {
            targets.delete(this.coordinateKey(creation.coordinate));
        }
        const coordinates = Array.from(targets.values());
        for (const coordinate of coordinates) {
            const gem = this.gems[coordinate.row][coordinate.column];
            if (gem !== null) {
                this.positions.delete(gem.node);
                this.gems[coordinate.row][coordinate.column] = null;
            }
        }
        const clearResult = this.boardManager?.clearCells(coordinates) ?? {
            completedRows: [],
            completedColumns: [],
            clearedCells: [],
            clearedVisualNodes: [],
        };
        const destroyed = this.boardManager?.destroyBoardCells(expansion.destroyedBoardCells) ?? [];
        for (const coordinate of destroyed) {
            this.pendingDestroyedBoardCells.set(this.coordinateKey(coordinate), { ...coordinate });
        }
        return clearResult;
    }

    private detectSpecialCreation(
        matches: readonly BoardCoordinate[],
        preferred: BoardCoordinate | null,
    ): SpecialCreation | null {
        if (matches.some((coordinate) =>
            (this.gems[coordinate.row]?.[coordinate.column]?.special ?? 'none') !== 'none')) {
            return null;
        }
        const candidates = preferred === null
            ? [...matches]
            : [preferred, ...matches.filter((coordinate) =>
                coordinate.row !== preferred.row || coordinate.column !== preferred.column)];
        for (const coordinate of candidates) {
            const gem = this.gems[coordinate.row]?.[coordinate.column] ?? null;
            if (gem === null || gem.special !== 'none') {
                continue;
            }
            const horizontal = this.sameColorRunLength(coordinate, gem.colorId, 0, 1);
            const vertical = this.sameColorRunLength(coordinate, gem.colorId, 1, 0);
            if (horizontal >= this.matchLength && vertical >= this.matchLength) {
                return { coordinate, type: 'bomb' };
            }
            if (Math.max(horizontal, vertical) >= 6) {
                return { coordinate, type: 'rainbow' };
            }
            if (horizontal >= 5) {
                return { coordinate, type: 'rocketHorizontal' };
            }
            if (vertical >= 5) {
                return { coordinate, type: 'rocketVertical' };
            }
        }
        return null;
    }

    private sameColorRunLength(
        origin: BoardCoordinate,
        colorId: number,
        rowStep: number,
        columnStep: number,
    ): number {
        const countDirection = (direction: number): number => {
            let count = 0;
            let row = origin.row + rowStep * direction;
            let column = origin.column + columnStep * direction;
            while (this.gems[row]?.[column]?.colorId === colorId) {
                count += 1;
                row += rowStep * direction;
                column += columnStep * direction;
            }
            return count;
        };
        return 1 + countDirection(-1) + countDirection(1);
    }

    private createSpecialGem(creation: SpecialCreation): void {
        const gem = this.gems[creation.coordinate.row]?.[creation.coordinate.column] ?? null;
        if (gem === null || !gem.node.isValid) {
            return;
        }
        gem.special = creation.type;
        this.applyGemVisual(gem);
        Tween.stopAllByTarget(gem.node);
        gem.node.setScale(0.35, 0.35, 1);
        gem.node.angle = creation.type === 'rainbow' ? -90 : 0;
        tween(gem.node)
            .to(0.22, { scale: new Vec3(1.22, 1.22, 1), angle: 0 }, { easing: 'backOut' })
            .to(0.12, { scale: Vec3.ONE }, { easing: 'sineOut' })
            .start();
    }

    private expandSpecialTargets(
        initial: readonly BoardCoordinate[],
    ): SpecialExpansion {
        const targets = new Map<string, BoardCoordinate>();
        const destroyedBoardCells = new Map<string, BoardCoordinate>();
        const queue: BoardCoordinate[] = [];
        const activatedSpecials = new Set<SpecialGemType>();
        const shatteredBombs = new Set<Node>();
        const add = (row: number, column: number): void => {
            const gem = this.gems[row]?.[column] ?? null;
            if (gem === null) {
                return;
            }
            const coordinate = { row, column };
            const key = this.coordinateKey(coordinate);
            if (!targets.has(key)) {
                targets.set(key, coordinate);
                queue.push(coordinate);
            }
        };
        for (const coordinate of initial) {
            add(coordinate.row, coordinate.column);
        }
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const coordinate = queue[cursor];
            const gem = this.gems[coordinate.row]?.[coordinate.column] ?? null;
            if (gem === null || gem.special === 'none') {
                continue;
            }
            activatedSpecials.add(gem.special);
            if (gem.special === 'rocketHorizontal') {
                for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                    add(coordinate.row, column);
                }
            } else if (gem.special === 'rocketVertical') {
                for (let row = 0; row < BOARD_ROWS; row += 1) {
                    add(row, coordinate.column);
                }
            } else if (gem.special === 'bomb') {
                if (!shatteredBombs.has(gem.node)) {
                    shatteredBombs.add(gem.node);
                    const sprite = gem.node.getComponent(Sprite);
                    if (sprite !== null && SpriteShatter.canPlay(sprite)) {
                        void SpriteShatter.play(sprite, {
                            rows: 4,
                            columns: 4,
                            lifetime: 0.82,
                            fadeDuration: 0.28,
                            gravityScale: 4.5,
                            minSpeed: 4,
                            maxSpeed: 11,
                            upwardSpeed: 8,
                            angularSpeed: 620,
                        });
                    }
                }
                // Bomb elements clear their own cell and all eight surrounding
                // elements, then permanently destroy those active board cells.
                for (let row = coordinate.row - 1; row <= coordinate.row + 1; row += 1) {
                    for (let column = coordinate.column - 1;
                        column <= coordinate.column + 1; column += 1) {
                        add(row, column);
                        const cell = this.boardManager?.getCell(row, column);
                        if (cell?.active === true) {
                            const boardCoordinate = { row, column };
                            destroyedBoardCells.set(
                                this.coordinateKey(boardCoordinate),
                                boardCoordinate,
                            );
                        }
                    }
                }
            } else {
                for (let row = 0; row < BOARD_ROWS; row += 1) {
                    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                        if (this.gems[row][column]?.colorId === gem.colorId) {
                            add(row, column);
                        }
                    }
                }
            }
        }
        this.playSpecialGemSounds(activatedSpecials);
        return {
            targets,
            destroyedBoardCells: Array.from(destroyedBoardCells.values()),
        };
    }

    private playSpecialGemSounds(specials: ReadonlySet<SpecialGemType>): void {
        if (specials.has('bomb')) {
            AudioManager.instance?.playBomb();
        }
        if (specials.has('rocketVertical')) {
            AudioManager.instance?.playHammer();
        }
        if (specials.has('rocketHorizontal')) {
            // Reuse the absorption clip as a one-shot; only the real black-hole
            // effect uses the dedicated looping AudioSource.
            AudioManager.instance?.playBlackHoleOneShot();
        }
        if (specials.has('rainbow')) {
            AudioManager.instance?.playRainbow();
        }
    }

    private getRainbowSwapTargets(
        firstGem: MatchGem,
        secondGem: MatchGem,
        _first: BoardCoordinate,
        _second: BoardCoordinate,
    ): BoardCoordinate[] {
        if (firstGem.special !== 'rainbow' && secondGem.special !== 'rainbow') {
            return [];
        }
        if (firstGem.special === 'rainbow' && secondGem.special === 'rainbow') {
            const all: BoardCoordinate[] = [];
            for (let row = 0; row < BOARD_ROWS; row += 1) {
                for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                    if (this.gems[row][column] !== null) {
                        all.push({ row, column });
                    }
                }
            }
            return all;
        }
        const rainbow = firstGem.special === 'rainbow' ? firstGem : secondGem;
        const targetColor = firstGem.special === 'rainbow' ? secondGem.colorId : firstGem.colorId;
        rainbow.colorId = targetColor;
        const targets: BoardCoordinate[] = [];
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                if (gem !== null && (gem === rainbow || gem.colorId === targetColor)) {
                    targets.push({ row, column });
                }
            }
        }
        return targets;
    }

    private applyGemVisual(gem: MatchGem): void {
        const sprite = gem.node.getComponent(Sprite);
        if (sprite === null) {
            return;
        }
        const specialFrame = gem.special === 'none' ? null : this.specialFrames[gem.special];
        sprite.spriteFrame = specialFrame ?? (this.activeGemFrames.length > 0
            ? this.activeGemFrames[gem.colorId % this.activeGemFrames.length]
            : null);
        sprite.color = Color.WHITE;
    }

    private coordinateKey(coordinate: BoardCoordinate): string {
        return `${coordinate.row}:${coordinate.column}`;
    }

    private async collapseAndRefill(refill = true): Promise<void> {
        await this.settleDestroyedBoardCells();
        let longestDrop = 0;
        for (let column = 0; column < BOARD_COLUMNS; column += 1) {
            const activeRows = Array.from({ length: BOARD_ROWS }, (_, row) => row)
                .filter((row) => this.boardManager?.getCell(row, column)?.active);
            const existing = [...activeRows]
                .reverse()
                .map((row) => this.gems[row][column])
                .filter((gem): gem is MatchGem => gem !== null);
            for (const row of activeRows) {
                this.gems[row][column] = null;
            }

            const bottomUpRows = [...activeRows].reverse();
            existing.forEach((gem, index) => {
                const targetRow = bottomUpRows[index];
                const old = this.positions.get(gem.node);
                longestDrop = Math.max(longestDrop, Math.abs((old?.row ?? targetRow) - targetRow));
                this.gems[targetRow][column] = gem;
                this.positions.set(gem.node, { row: targetRow, column });
                const target = this.boardManager?.getCellLocalPosition(targetRow, column);
                if (target !== null && target !== undefined) {
                    Tween.stopAllByTarget(gem.node);
                    tween(gem.node)
                        .to(0.2, { position: new Vec3(target) }, { easing: 'quadIn' })
                        .start();
                }
            });

            if (!refill) {
                continue;
            }
            for (let index = existing.length; index < bottomUpRows.length; index += 1) {
                const targetRow = bottomUpRows[index];
                const colorId = this.chooseRefillColor(targetRow, column);
                const spawnHeight = (bottomUpRows.length - index + 1) * BOARD_CELL_STEP;
                const gem = this.createGem(targetRow, column, colorId, spawnHeight);
                this.gems[targetRow][column] = gem;
                const target = this.boardManager?.getCellLocalPosition(targetRow, column);
                if (target !== null && target !== undefined) {
                    tween(gem.node)
                        .to(0.24, { position: new Vec3(target) }, { easing: 'quadIn' })
                        .start();
                }
                longestDrop = Math.max(longestDrop, bottomUpRows.length - index);
            }
        }
        this.syncBoardState();
        await this.wait(longestDrop > 0 ? 0.27 : 0.05);
    }

    /** Moves the nearest surviving board cells (and their gems) into bomb holes. */
    private async settleDestroyedBoardCells(): Promise<void> {
        if (this.pendingDestroyedBoardCells.size === 0 || this.boardManager === null) {
            return;
        }
        const vacancies = Array.from(this.pendingDestroyedBoardCells.values());
        this.pendingDestroyedBoardCells.clear();
        const relocations = this.boardManager.planCellRelocations(vacancies);
        if (relocations.length === 0) {
            return;
        }

        const movedGems: Array<{
            readonly relocation: BoardCellRelocation;
            readonly gem: MatchGem;
            readonly target: Vec3;
        }> = [];
        for (const relocation of relocations) {
            const gem = this.gems[relocation.from.row]?.[relocation.from.column] ?? null;
            const target = this.boardManager.getCellLocalPosition(
                relocation.to.row,
                relocation.to.column,
            );
            if (gem === null || target === null || !gem.node.isValid) {
                continue;
            }
            this.gems[relocation.from.row][relocation.from.column] = null;
            this.gems[relocation.to.row][relocation.to.column] = gem;
            this.positions.set(gem.node, { ...relocation.to });
            movedGems.push({ relocation, gem, target: new Vec3(target) });
        }

        const cellDuration = this.boardManager.animateCellRelocations(relocations);
        for (const movement of movedGems) {
            Tween.stopAllByTarget(movement.gem.node);
            tween(movement.gem.node)
                .to(movement.relocation.duration, { position: movement.target }, {
                    easing: 'sineInOut',
                })
                .start();
        }
        this.syncBoardState();
        await this.wait(cellDuration + 0.03);

        this.boardManager.completeCellRelocations(relocations);
        for (const movement of movedGems) {
            if (movement.gem.node.isValid
                && this.gems[movement.relocation.to.row]?.[movement.relocation.to.column]
                    === movement.gem) {
                Tween.stopAllByTarget(movement.gem.node);
                movement.gem.node.setPosition(movement.target);
            }
        }
        this.syncBoardState();
    }

    private chooseRefillColor(row: number, column: number): number {
        const candidates = Array.from({ length: this.colorCount }, (_, colorId) => colorId);
        if (this.colorCount <= 3) {
            const matching = candidates.filter((colorId) =>
                this.wouldMatchAt(row, column, colorId));
            if (matching.length > 0 && Math.random() < 0.82) {
                return matching[Math.floor(Math.random() * matching.length)];
            }
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    private wouldMatchAt(row: number, column: number, colorId: number): boolean {
        const count = (rowStep: number, columnStep: number): number => {
            let total = 0;
            let nextRow = row + rowStep;
            let nextColumn = column + columnStep;
            while (this.gems[nextRow]?.[nextColumn]?.colorId === colorId) {
                total += 1;
                nextRow += rowStep;
                nextColumn += columnStep;
            }
            return total;
        };
        const horizontal = 1 + count(0, -1) + count(0, 1);
        const vertical = 1 + count(-1, 0) + count(1, 0);
        const horizontalRequired = this.getRequiredMatchLengthAt(row, column, 'horizontal');
        const verticalRequired = this.getRequiredMatchLengthAt(row, column, 'vertical');
        return horizontal >= horizontalRequired || vertical >= verticalRequired;
    }

    /**
     * A short edge of an irregular mask must not become permanently uncleareable.
     * The configured rule remains in force on normal lines, while a contiguous
     * two- or three-cell board segment may be cleared by filling that whole segment.
     */
    private getRequiredMatchLengthAt(
        row: number,
        column: number,
        axis: 'horizontal' | 'vertical',
    ): number {
        const origin = this.boardManager?.getCell(row, column);
        if (origin === null || origin === undefined || !origin.active) {
            return this.matchLength;
        }
        const rowStep = axis === 'vertical' ? 1 : 0;
        const columnStep = axis === 'horizontal' ? 1 : 0;
        const countDirection = (direction: -1 | 1): number => {
            let count = 0;
            let nextRow = row + rowStep * direction;
            let nextColumn = column + columnStep * direction;
            while (this.boardManager?.getCell(nextRow, nextColumn)?.active === true) {
                count += 1;
                nextRow += rowStep * direction;
                nextColumn += columnStep * direction;
            }
            return count;
        };
        const segmentLength = 1 + countDirection(-1) + countDirection(1);
        return segmentLength >= 2
            ? Math.min(this.matchLength, segmentLength)
            : this.matchLength;
    }

    private findMatches(): BoardCoordinate[] {
        return this.findMatchesInGrid(this.getColorGrid());
    }

    private findMatchesInGrid(
        colors: ReadonlyArray<ReadonlyArray<number | null>>,
    ): BoardCoordinate[] {
        const matches = new Map<string, BoardCoordinate>();
        const addRun = (
            run: readonly BoardCoordinate[],
            axis: 'horizontal' | 'vertical',
        ): void => {
            const first = run[0];
            if (first === undefined
                || run.length < this.getRequiredMatchLengthAt(first.row, first.column, axis)) {
                return;
            }
            for (const coordinate of run) {
                matches.set(`${coordinate.row}:${coordinate.column}`, coordinate);
            }
        };

        for (let row = 0; row < BOARD_ROWS; row += 1) {
            let run: BoardCoordinate[] = [];
            let color: number | null = null;
            for (let column = 0; column <= BOARD_COLUMNS; column += 1) {
                const nextColor = column < BOARD_COLUMNS ? colors[row][column] : null;
                if (nextColor !== null && nextColor === color) {
                    run.push({ row, column });
                } else {
                    addRun(run, 'horizontal');
                    run = nextColor === null ? [] : [{ row, column }];
                    color = nextColor;
                }
            }
        }
        for (let column = 0; column < BOARD_COLUMNS; column += 1) {
            let run: BoardCoordinate[] = [];
            let color: number | null = null;
            for (let row = 0; row <= BOARD_ROWS; row += 1) {
                const nextColor = row < BOARD_ROWS ? colors[row][column] : null;
                if (nextColor !== null && nextColor === color) {
                    run.push({ row, column });
                } else {
                    addRun(run, 'vertical');
                    run = nextColor === null ? [] : [{ row, column }];
                    color = nextColor;
                }
            }
        }

        // 四连触发后，连带清除上下左右紧邻（距离 1 格）的全部同色宝石。
        const queue = Array.from(matches.values());
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ] as const;
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const coordinate = queue[cursor];
            const sourceColor = colors[coordinate.row]?.[coordinate.column] ?? null;
            if (sourceColor === null) {
                continue;
            }
            for (let index = 0; index < directions.length; index += 1) {
                const [rowOffset, columnOffset] = directions[index];
                const row = coordinate.row + rowOffset;
                const column = coordinate.column + columnOffset;
                if (row < 0 || row >= BOARD_ROWS
                    || column < 0 || column >= BOARD_COLUMNS
                    || colors[row][column] !== sourceColor) {
                    continue;
                }
                const key = `${row}:${column}`;
                if (matches.has(key)) {
                    continue;
                }
                const connected = { row, column };
                matches.set(key, connected);
                queue.push(connected);
            }
        }
        return Array.from(matches.values());
    }

    private hasPotentialMove(colors: Array<Array<number | null>>): boolean {
        return this.findPotentialMove(colors) !== null;
    }

    private hasCurrentPotentialMove(): boolean {
        return this.findCurrentPotentialMove() !== null;
    }

    private findCurrentPotentialMove(): PotentialMove | null {
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                if (gem?.special !== 'rainbow') {
                    continue;
                }
                for (const [rowOffset, columnOffset] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
                    const nextRow = row + rowOffset;
                    const nextColumn = column + columnOffset;
                    if (this.gems[nextRow]?.[nextColumn] !== null
                        && this.gems[nextRow]?.[nextColumn] !== undefined) {
                        return {
                            first: { row, column },
                            second: { row: nextRow, column: nextColumn },
                        };
                    }
                }
            }
        }
        return this.findPotentialMove(this.getColorGrid());
    }

    private findPotentialMove(colors: Array<Array<number | null>>): PotentialMove | null {
        let firstStandardMatch: PotentialMove | null = null;
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                for (const [rowOffset, columnOffset] of [[0, 1], [1, 0]] as const) {
                    const nextRow = row + rowOffset;
                    const nextColumn = column + columnOffset;
                    if (nextRow >= BOARD_ROWS || nextColumn >= BOARD_COLUMNS
                        || colors[row][column] === null || colors[nextRow][nextColumn] === null) {
                        continue;
                    }
                    [colors[row][column], colors[nextRow][nextColumn]] = [
                        colors[nextRow][nextColumn],
                        colors[row][column],
                    ];
                    const createsMatch = this.findMatchesInGrid(colors).length > 0;
                    const createsAbsorption = colors[row][column] !== colors[nextRow][nextColumn]
                        && this.hasAbsorptionSquareInGrid(
                            colors,
                            { row: nextRow, column: nextColumn },
                        );
                    [colors[row][column], colors[nextRow][nextColumn]] = [
                        colors[nextRow][nextColumn],
                        colors[row][column],
                    ];
                    if (createsAbsorption) {
                        return {
                            first: { row, column },
                            second: { row: nextRow, column: nextColumn },
                        };
                    }
                    if (createsMatch && firstStandardMatch === null) {
                        firstStandardMatch = {
                            first: { row, column },
                            second: { row: nextRow, column: nextColumn },
                        };
                    }
                }
            }
        }
        return firstStandardMatch;
    }

    private hasAbsorptionSquareInGrid(
        colors: ReadonlyArray<ReadonlyArray<number | null>>,
        center: BoardCoordinate,
    ): boolean {
        const colorId = colors[center.row]?.[center.column] ?? null;
        if (colorId === null) {
            return false;
        }
        for (const rowOffset of [-1, 0] as const) {
            for (const columnOffset of [-1, 0] as const) {
                const top = center.row + rowOffset;
                const left = center.column + columnOffset;
                if (colors[top]?.[left] === colorId
                    && colors[top]?.[left + 1] === colorId
                    && colors[top + 1]?.[left] === colorId
                    && colors[top + 1]?.[left + 1] === colorId) {
                    return true;
                }
            }
        }
        return false;
    }

    private getColorGrid(): Array<Array<number | null>> {
        return this.gems.map((row) => row.map((gem) => gem?.colorId ?? null));
    }

    private syncBoardState(): void {
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                this.boardManager?.setCellOccupant(
                    row,
                    column,
                    gem?.node ?? null,
                    gem?.colorId ?? null,
                );
            }
        }
    }

    private snapAllGemsToLogicalCells(): void {
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                const target = this.boardManager?.getCellLocalPosition(row, column);
                if (gem === null || target === null || target === undefined || !gem.node.isValid) {
                    continue;
                }
                gem.node.setPosition(target);
            }
        }
    }

    private async finishExternalClear(version: number): Promise<void> {
        this.updateClearingPhase();
        if (this.clearingPhase && this.isBoardEmpty()) {
            this.completeClearedBoard();
            return;
        }
        await this.collapseAndRefill(!this.clearingPhase);
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        const matches = this.findMatches();
        if (matches.length > 0) {
            await this.resolveCascades(matches, version);
            return;
        }
        this.snapAllGemsToLogicalCells();
        this.resolving = false;
        if (this.clearingPhase && !this.hasCurrentPotentialMove()) {
            await this.prepareEndgameRescue(version);
            this.onBoardSettled?.();
            return;
        } else {
            this.updateStatus();
        }
        if (this.clearingPhase && this.hasCurrentPotentialMove()) {
            this.scheduleClearingHint(version);
        }
        this.onBoardSettled?.();
    }

    private updateClearingPhase(): void {
        if (!this.clearingPhase && (this.scoreManager?.getScore() ?? 0) >= this.targetScore) {
            this.clearingPhase = true;
            this.updateStatus('TARGET REACHED · CLEAR THE BOARD!');
        }
    }

    private scheduleClearingHint(version: number): void {
        this.scheduleOnce(() => {
            if (this.active && version === this.modeVersion
                && this.clearingPhase && !this.resolving && !this.hintPlaying) {
                this.playIdleHint();
            }
        }, 0.8);
    }

    private completeClearedBoard(): void {
        this.updateStatus('BOARD CLEARED!');
        this.resolving = false;
        this.scoreManager?.resetCombo();
        this.onBoardSettled?.();
    }

    private updateStatus(message?: string): void {
        if (this.statusLabel === null || !this.active) {
            return;
        }
        const combo = this.scoreManager?.getCombo() ?? 0;
        const comboText = combo > 1 ? `  ·  CHAIN x${combo}` : '';
        if (message === undefined && this.clearingPhase) {
            this.statusLabel.string = `CLEAR THE BOARD  ·  MOVES ${this.movesRemaining}  ·  LEFT ${this.getRemainingGemCount()}${comboText}`;
            return;
        }
        this.statusLabel.string = message
            ?? `MATCH ${this.matchLength}  ·  SHORT EDGES ADAPT  ·  MOVES ${this.movesRemaining}  ·  LEFT ${this.getRemainingGemCount()}${comboText}`;
    }

    private playIdleHint(): void {
        const move = this.findCurrentPotentialMove();
        if (move === null) {
            return;
        }
        const first = this.gems[move.first.row][move.first.column]?.node ?? null;
        const second = this.gems[move.second.row][move.second.column]?.node ?? null;
        if (first === null || second === null) {
            return;
        }
        this.hintPlaying = true;
        this.updateStatus('HINT: SWAP THE PULSING GEMS');
        let finished = 0;
        for (const [node, direction] of [[first, 1], [second, -1]] as const) {
            Tween.stopAllByTarget(node);
            tween(node)
                .repeat(3,
                    tween<Node>()
                        .to(0.18, {
                            scale: new Vec3(1.16, 1.16, 1),
                            angle: direction * 7,
                        }, { easing: 'sineOut' })
                        .to(0.18, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineIn' }),
                )
                .call(() => {
                    node.setScale(Vec3.ONE);
                    node.angle = 0;
                    finished += 1;
                    if (finished === 2) {
                        this.hintPlaying = false;
                        this.idleSeconds = 0;
                        this.updateStatus();
                    }
                })
                .start();
        }
    }

    private resetIdleHint(): void {
        this.idleSeconds = 0;
        this.clearHintAnimation();
    }

    private clearHintAnimation(): void {
        if (!this.hintPlaying) {
            return;
        }
        for (const row of this.gems) {
            for (const gem of row) {
                if (gem !== null && gem.node.isValid) {
                    Tween.stopAllByTarget(gem.node);
                    gem.node.setScale(Vec3.ONE);
                    gem.node.angle = 0;
                }
            }
        }
        this.hintPlaying = false;
    }

    private playInvalidSwapFeedback(first: Node, second: Node): void {
        for (const node of [first, second]) {
            if (!node.isValid) {
                continue;
            }
            tween(node)
                .to(0.06, { scale: new Vec3(0.88, 0.88, 1) })
                .to(0.1, { scale: Vec3.ONE }, { easing: 'backOut' })
                .start();
        }
    }

    private async shuffleBoard(version: number): Promise<void> {
        const colors = this.createPlayableColorGrid(false);
        if (!this.hasPotentialMove(colors.map((row) => [...row]))) {
            this.resolving = false;
            this.updateStatus('NO POSSIBLE MATCH');
            this.scheduleOnce(() => {
                if (this.active && version === this.modeVersion) {
                    this.onOutOfMoves?.();
                }
            }, 0.5);
            return;
        }
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                if (gem !== null && colors[row][column] !== null) {
                    tween(gem.node)
                        .to(0.16, { scale: new Vec3(0.12, 0.12, 1), angle: 90 }, { easing: 'quadIn' })
                        .start();
                }
            }
        }
        await this.wait(0.18);
        if (!this.active || version !== this.modeVersion) {
            return;
        }
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                const colorId = colors[row][column];
                if (gem === null || colorId === null) {
                    continue;
                }
                gem.colorId = colorId;
                this.applyGemVisual(gem);
                tween(gem.node)
                    .to(0.2, { scale: Vec3.ONE, angle: 0 }, { easing: 'backOut' })
                    .start();
            }
        }
        this.syncBoardState();
        await this.wait(0.22);
        this.resetIdleHint();
    }

    private areAdjacent(first: BoardCoordinate, second: BoardCoordinate): boolean {
        return Math.abs(first.row - second.row) + Math.abs(first.column - second.column) === 1;
    }

    private destroyAllGems(): void {
        this.pendingDestroyedBoardCells.clear();
        this.positions.clear();
        for (let row = 0; row < BOARD_ROWS; row += 1) {
            for (let column = 0; column < BOARD_COLUMNS; column += 1) {
                const gem = this.gems[row][column];
                if (gem !== null && isValid(gem.node, true)) {
                    gem.node.destroy();
                }
                this.gems[row][column] = null;
            }
        }
    }

    private wait(seconds: number): Promise<void> {
        return new Promise((resolve) => this.scheduleOnce(resolve, seconds));
    }
}
