import { BoardCell } from "./BoardCell";
import { GameConfig } from "./GameConfig";
import { ThemeConfig } from "./ThemeConfig";
import { Gem, SpecialType } from "./Gem";
import { GameAudio } from "./GameAudio";
import { GameSave } from "./GameSave";
import { LevelData } from "./LevelData";
import { GridPosition, MatchDetector, MatchGroup } from "./MatchDetector";
import { MatchEffects } from "./MatchEffects";
import { Obstacle, ObstacleType } from "./Obstacle";

interface SpecialCreation {
    position: GridPosition;
    type: number;
    specialType: SpecialType;
}

export interface BoardEvents {
    onMoveUsed(): void;
    onCleared(types: number[], specialAttack: boolean): void;
    onObstacleDestroyed(type: ObstacleType): void;
    onBoardStable(): boolean;
}

enum BoardState { Idle, Swapping, Clearing, Falling, Shuffling, GameOver }

export class Board {
    private readonly cells: BoardCell[][] = [];
    private state = BoardState.Idle;
    private dragGem: Gem | null = null;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragOriginX = 0;
    private dragOriginY = 0;
    private dragAxis: "horizontal" | "vertical" | null = null;
    private dragPreviewTarget: Gem | null = null;
    private dragBlockedCellKey: string | null = null;
    private hinted: Gem[] = [];
    private armedProp: { type: "hammer" | "magic"; onUsed: () => void } | null = null;
    private guideActive = false;
    private nextGemId = 1;
    private readonly effects: MatchEffects;

    public constructor(
        private readonly slotLayer: Laya.Sprite,
        private readonly gemLayer: Laya.Sprite,
        private readonly effectLayer: Laya.Sprite,
        private readonly statusText: Laya.GTextField,
        goalText: Laya.GTextField,
        private readonly audio: GameAudio,
        private readonly level: LevelData,
        private readonly events: BoardEvents,
    ) {
        this.effects = new MatchEffects(effectLayer, gemLayer, goalText, level.rows, level.columns,
            level.goals.find((goal) => goal.type === "collectGem")?.gemType);
        for (let row = 0; row < level.rows; row++) {
            this.cells[row] = [];
            for (let column = 0; column < level.columns; column++) {
                this.cells[row][column] = new BoardCell(row, column, level.mask?.[row]?.[column] !== 0);
            }
        }
    }

    public async initialize(): Promise<void> {
        this.state = BoardState.Falling;
        this.statusText.text = "LOADING GEM PREFABS...";
        const prefabPaths = [GameConfig.boardPrefabs.cell, GameConfig.gemPrefab, GameConfig.obstaclePrefab,
            ...GameConfig.specialPrefabs.filter(Boolean)];
        await Promise.all([
            ...prefabPaths.map((path) => Laya.loader.load(path, Laya.Loader.HIERARCHY)),
            ...GameConfig.obstacleTextures.filter(Boolean).map((path) => Laya.loader.load(path)),
            this.effects.initialize(),
        ]);
        const blocked = new Set(this.level.obstacles
            .filter((item) => item.type === ObstacleType.Crate || item.type === ObstacleType.Stone)
            .map((item) => `${item.row}:${item.column}`));
        const initialSpecials = new Map(this.level.initialSpecials
            ?.map((item) => [`${item.row}:${item.column}`, item.specialType as SpecialType]) ?? []);
        for (let row = 0; row < this.level.rows; row++) {
            for (let column = 0; column < this.level.columns; column++) {
                if (!this.cells[row][column].active) continue;
                const slot = await Laya.Prefab.instantiate<Laya.GImage>(GameConfig.boardPrefabs.cell);
                slot.pos(column * GameConfig.cellSize + 4, row * GameConfig.cellSize + 4);
                slot.alpha = 0.68;
                this.slotLayer.addChild(slot);
            }
        }
        for (let row = 0; row < this.level.rows; row++) {
            for (let column = 0; column < this.level.columns; column++) {
                if (!this.cells[row][column].active || blocked.has(`${row}:${column}`)) continue;
                const type = this.level.initialLayout[row][column];
                const specialType = initialSpecials.get(`${row}:${column}`) ?? SpecialType.None;
                this.cells[row][column].gem = await this.createGem(type, row, column, specialType);
            }
        }
        for (const item of this.level.obstacles) {
            await this.createObstacle(item.type as ObstacleType, item.hitPoints, item.row, item.column);
        }
        await this.ensurePlayable();
        await this.playBoardEntrance();
        this.state = BoardState.Idle;
        this.statusText.text = initialSpecials.size ? "SPECIAL GEMS READY - SWIPE ONE!" : "SWIPE A GEM TO SWAP";
        this.restartHintTimer();
    }

    private async playBoardEntrance(): Promise<void> {
        const layers = [this.slotLayer, this.gemLayer, this.effectLayer];
        const finalY = layers.map((layer) => layer.y);
        for (let index = 0; index < layers.length; index++) {
            layers[index].y = finalY[index] - 150;
            layers[index].alpha = index === 0 ? 0.25 : 0;
        }
        await Promise.all(layers.map((layer, index) => new Promise<void>((resolve) => {
            Laya.Tween.to(layer, { y: finalY[index], alpha: 1 }, 430 + index * 55,
                Laya.Ease.backOut, Laya.Handler.create(null, resolve), index * 45);
        })));
        this.audio.interact();
    }

    public setTargetedProp(type: "hammer" | "magic" | null, onUsed: () => void): boolean {
        if (this.state !== BoardState.Idle) return false;
        this.armedProp = type ? { type, onUsed } : null;
        this.clearHint();
        this.statusText.text = type ? `${type.toUpperCase()} READY - TAP A GEM` : "SWIPE A GEM TO SWAP";
        if (!type) this.restartHintTimer();
        else Laya.timer.clear(this, this.showHint);
        return true;
    }

    public useRefresh(onUsed: () => void): boolean {
        if (this.state !== BoardState.Idle) return false;
        void this.refreshBoard(onUsed);
        return true;
    }

    public setGuideActive(active: boolean): void {
        this.guideActive = active;
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        if (!active) this.restartHintTimer();
    }

    public guideMovePoints(): [{ x: number; y: number }, { x: number; y: number }] | null {
        const move = this.findPossibleMove();
        return move ? [this.guidePoint(move[0]), this.guidePoint(move[1])] : null;
    }

    public guideGemPoint(): { x: number; y: number } | null {
        const gem = this.cells.flatMap((row) => row.map((cell) => cell.gem))
            .find((item): item is Gem => Boolean(item));
        return gem ? this.guidePoint(gem) : null;
    }

    public debugShuffle(): boolean {
        return this.useRefresh(() => undefined);
    }

    public debugCreateSpecial(specialType: SpecialType): boolean {
        if (this.state !== BoardState.Idle || specialType === SpecialType.None) return false;
        const gem = this.cells.flatMap((row) => row.map((cell) => cell.gem)
            .filter((item): item is Gem => Boolean(item)))
            .find((item) => item.specialType === SpecialType.None
                && this.cells[item.row][item.column].obstacle?.type !== ObstacleType.Chain);
        if (!gem) return false;
        void this.replaceWithDebugSpecial(gem, specialType);
        return true;
    }

    public resumeAfterContinue(): void {
        this.state = BoardState.Idle;
        this.statusText.text = "+5 MOVES! KEEP GOING";
        this.restartHintTimer();
    }

    public async playWinShatter(): Promise<void> {
        this.state = BoardState.GameOver;
        this.statusText.text = "LEVEL COMPLETE - SHATTERING BOARD...";
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        this.effects.clearSpecialTip();
        this.dragGem = null;
        this.dragPreviewTarget = null;
        this.dragBlockedCellKey = null;
        this.dragAxis = null;
        Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
        Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onPointerUp);

        const views: Laya.GImage[] = [];
        for (const row of this.cells) {
            for (const cell of row) {
                if (cell.gem) {
                    views.push(cell.gem.view);
                    cell.gem = null;
                }
                if (cell.obstacle) {
                    views.push(cell.obstacle.view);
                    cell.obstacle = null;
                }
            }
        }
        for (let index = views.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [views[index], views[swapIndex]] = [views[swapIndex], views[index]];
        }

        const animations: Promise<void>[] = [];
        let interval = 190;
        for (const view of views) {
            if (!view.destroyed) {
                this.audio.shatter();
                animations.push(this.shatterView(view));
            }
            await this.delay(interval);
            interval = Math.max(32, interval * 0.91);
        }
        await Promise.all(animations);
    }

    private async replaceWithDebugSpecial(gem: Gem, specialType: SpecialType): Promise<void> {
        this.state = BoardState.Clearing;
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        const cell = this.cells[gem.row][gem.column];
        gem.view.offAll();
        await this.tween(gem.view, { scaleX: .1, scaleY: .1, alpha: 0 }, 100);
        gem.view.destroy();
        const replacement = await this.createGem(gem.type, gem.row, gem.column, specialType);
        cell.gem = replacement;
        await this.effects.playSpecialCreated({
            row: replacement.row, column: replacement.column, type: replacement.type,
            specialType: replacement.specialType, texture: replacement.view.texture,
        }, replacement.view);
        this.state = BoardState.Idle;
        this.statusText.text = "DEBUG SPECIAL CREATED";
        this.restartHintTimer();
    }

    private async createGem(type: number, row: number, column: number, specialType = SpecialType.None): Promise<Gem> {
        const prefabPath = specialType === SpecialType.None
            ? GameConfig.gemPrefab
            : GameConfig.specialPrefabs[specialType];
        const view = await Laya.Prefab.instantiate<Laya.GImage>(prefabPath);
        if (specialType === SpecialType.None) view.src = ThemeConfig.texture(type);
        view.hitArea = new Laya.Rectangle(-GameConfig.tileInset, -GameConfig.tileInset,
            GameConfig.cellSize, GameConfig.cellSize);
        const gem = new Gem(this.nextGemId++, type, row, column, view, specialType);
        view.name = `Gem_${gem.id}`;
        if (specialType !== SpecialType.None) this.effects.attachBoardReceiver(view);
        gem.setGridPosition(row, column);
        view.on(Laya.Event.MOUSE_DOWN, this, () => this.onPointerDown(gem));
        this.gemLayer.addChild(view);
        return gem;
    }

    private async createObstacle(type: ObstacleType, hitPoints: number, row: number, column: number): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.GImage>(GameConfig.obstaclePrefab);
        view.name = `Obstacle_${ObstacleType[type]}`;
        view.src = GameConfig.obstacleTextures[type];
        view.alpha = type === ObstacleType.Ice && hitPoints <= 1 ? 0.65 : 1;
        view.mouseEnabled = false;
        view.pos(column * GameConfig.cellSize + GameConfig.tileInset,
            row * GameConfig.cellSize + GameConfig.tileInset);
        const obstacle = new Obstacle(type, hitPoints, view);
        this.cells[row][column].obstacle = obstacle;
        this.gemLayer.addChild(view);
    }

    private onPointerDown(gem: Gem): void {
        if (this.state !== BoardState.Idle) return;
        if (this.armedProp) {
            if (this.armedProp.type === "magic" && this.cells[gem.row][gem.column].obstacle) {
                this.statusText.text = "CHOOSE AN UNBLOCKED GEM";
                return;
            }
            const prop = this.armedProp;
            this.armedProp = null;
            void (prop.type === "hammer" ? this.useHammer(gem, prop.onUsed) : this.useMagic(gem, prop.onUsed));
            return;
        }
        if (this.cells[gem.row][gem.column].obstacle?.type === ObstacleType.Chain) {
            this.statusText.text = "CHAINED GEMS CANNOT MOVE";
            this.shakeBlockedTile(gem.row, gem.column);
            return;
        }
        this.restartHintTimer();
        this.audio.interact();
        this.dragGem = gem;
        this.dragStartX = Laya.stage.mouseX;
        this.dragStartY = Laya.stage.mouseY;
        this.dragOriginX = gem.view.x;
        this.dragOriginY = gem.view.y;
        this.dragAxis = null;
        this.dragPreviewTarget = null;
        this.dragBlockedCellKey = null;
        this.effects.showSpecialTip(gem);
        Laya.Tween.clearAll(gem.view);
        gem.view.scale(1, 1);
        Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
        Laya.stage.once(Laya.Event.MOUSE_UP, this, this.onPointerUp);
    }

    private async useHammer(gem: Gem, onUsed: () => void): Promise<void> {
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        this.audio.interact();
        this.statusText.text = "HAMMER SMASH!";
        await this.clear([{ row: gem.row, column: gem.column }], true);
        await this.collapseAndRefill();
        const groups = this.findMatchGroups();
        if (groups.length) await this.resolveMatches(groups);
        await this.ensurePlayable();
        onUsed();
        this.finishTurn();
    }

    private async useMagic(gem: Gem, onUsed: () => void): Promise<void> {
        this.state = BoardState.Clearing;
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        this.audio.interact();
        this.statusText.text = "MAGIC ROCKET!";
        const cell = this.cells[gem.row][gem.column];
        const specialType = Math.random() < 0.5 ? SpecialType.RocketHorizontal : SpecialType.RocketVertical;
        gem.view.offAll();
        await this.tween(gem.view, { scaleX: 0.1, scaleY: 0.1, alpha: 0 }, 150);
        gem.view.destroy();
        const replacement = await this.createGem(gem.type, gem.row, gem.column, specialType);
        cell.gem = replacement;
        await this.effects.playSpecialCreated({
            row: replacement.row, column: replacement.column, type: replacement.type,
            specialType: replacement.specialType, texture: replacement.view.texture,
        }, replacement.view);
        onUsed();
        this.finishTurn();
    }

    private async refreshBoard(onUsed: () => void): Promise<void> {
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        this.statusText.text = "REFRESHING BOARD...";
        await this.shuffle();
        onUsed();
        this.state = BoardState.Idle;
        this.statusText.text = "BOARD REFRESHED!";
        this.restartHintTimer();
    }

    private onPointerMove(): void {
        const gem = this.dragGem;
        if (!gem || this.state !== BoardState.Idle) return;
        const deltaX = Laya.stage.mouseX - this.dragStartX;
        const deltaY = Laya.stage.mouseY - this.dragStartY;
        if (!this.dragAxis) {
            if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < GameConfig.dragAxisThreshold) return;
            this.dragAxis = Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
        }
        const limit = GameConfig.cellSize;
        const horizontal = this.dragAxis === "horizontal";
        const direction = Math.sign(horizontal ? deltaX : deltaY);
        const targetRow = gem.row + (horizontal ? 0 : direction);
        const targetColumn = gem.column + (horizontal ? direction : 0);
        const targetCell = this.cells[targetRow]?.[targetColumn];
        const blockedTarget = direction !== 0 && targetCell
            && (targetCell.isBlocked || targetCell.obstacle?.type === ObstacleType.Chain) ? targetCell : null;
        const blockedKey = blockedTarget ? `${targetRow}:${targetColumn}` : null;
        if (blockedKey !== this.dragBlockedCellKey) {
            this.dragBlockedCellKey = blockedKey;
            if (blockedTarget) {
                this.statusText.text = blockedTarget.obstacle?.type === ObstacleType.Chain
                    ? "CHAINED GEMS CANNOT MOVE" : "THIS TILE IS BLOCKED";
                this.shakeBlockedTile(targetRow, targetColumn);
            }
        }
        const previewTarget = direction !== 0 && targetCell?.gem && !targetCell.isBlocked
            && targetCell.obstacle?.type !== ObstacleType.Chain ? targetCell.gem : null;
        if (this.dragPreviewTarget !== previewTarget) {
            if (this.dragPreviewTarget) this.snapGemToCell(this.dragPreviewTarget);
            this.dragPreviewTarget = previewTarget;
        }
        const dragLimit = blockedTarget ? GameConfig.swipeThreshold * 0.6 : limit;
        const distance = Math.min(dragLimit, Math.abs(horizontal ? deltaX : deltaY));
        if (this.dragAxis === "horizontal") {
            gem.view.pos(this.dragOriginX + Math.max(-dragLimit, Math.min(dragLimit, deltaX)), this.dragOriginY);
        } else {
            gem.view.pos(this.dragOriginX, this.dragOriginY + Math.max(-dragLimit, Math.min(dragLimit, deltaY)));
        }
        if (previewTarget) {
            previewTarget.view.pos(
                previewTarget.column * GameConfig.cellSize + GameConfig.tileInset - (horizontal ? direction * distance : 0),
                previewTarget.row * GameConfig.cellSize + GameConfig.tileInset - (horizontal ? 0 : direction * distance),
            );
        }
    }

    private onPointerUp(): void {
        this.effects.clearSpecialTip();
        const gem = this.dragGem;
        const previewTarget = this.dragPreviewTarget;
        const blockedCellKey = this.dragBlockedCellKey;
        this.dragGem = null;
        this.dragPreviewTarget = null;
        this.dragBlockedCellKey = null;
        Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
        if (!gem || this.state !== BoardState.Idle) return;
        const deltaX = Laya.stage.mouseX - this.dragStartX;
        const deltaY = Laya.stage.mouseY - this.dragStartY;
        const axis = this.dragAxis ?? (Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical");
        this.dragAxis = null;
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < GameConfig.swipeThreshold) {
            this.statusText.text = "HOLD AND SWIPE IN ANY DIRECTION";
            this.returnDraggedGem(gem);
            if (previewTarget) this.returnDraggedGem(previewTarget);
            return;
        }
        const rowOffset = axis === "vertical" ? Math.sign(deltaY) : 0;
        const columnOffset = rowOffset === 0 ? Math.sign(deltaX) : 0;
        const targetRow = gem.row + rowOffset;
        const targetColumn = gem.column + columnOffset;
        if (targetRow < 0 || targetRow >= this.level.rows || targetColumn < 0 || targetColumn >= this.level.columns) {
            this.statusText.text = "CANNOT SWIPE OFF THE BOARD";
            GameSave.vibrate(35);
            this.returnDraggedGem(gem);
            if (previewTarget) this.returnDraggedGem(previewTarget);
            return;
        }
        const targetCell = this.cells[targetRow][targetColumn];
        if (targetCell.isBlocked || targetCell.obstacle?.type === ObstacleType.Chain) {
            this.statusText.text = targetCell.obstacle?.type === ObstacleType.Chain
                ? "CHAINED GEMS CANNOT MOVE" : "THIS TILE IS BLOCKED";
            GameSave.vibrate(35);
            if (blockedCellKey !== `${targetRow}:${targetColumn}`) this.shakeBlockedTile(targetRow, targetColumn);
            this.returnDraggedGem(gem);
            if (previewTarget) this.returnDraggedGem(previewTarget);
            return;
        }
        const target = targetCell.gem;
        if (target) void this.trySwap(gem, target);
        else {
            GameSave.vibrate(35);
            this.returnDraggedGem(gem);
            if (previewTarget) this.returnDraggedGem(previewTarget);
        }
    }

    private returnDraggedGem(gem: Gem): void {
        Laya.Tween.to(gem.view, {
            x: gem.column * GameConfig.cellSize + GameConfig.tileInset,
            y: gem.row * GameConfig.cellSize + GameConfig.tileInset,
        }, GameConfig.dragReturnDuration, Laya.Ease.quadOut);
    }

    private snapGemToCell(gem: Gem): void {
        gem.view.pos(gem.column * GameConfig.cellSize + GameConfig.tileInset,
            gem.row * GameConfig.cellSize + GameConfig.tileInset);
    }

    private shakeBlockedTile(row: number, column: number): void {
        const view = this.cells[row]?.[column]?.obstacle?.view;
        if (!view) return;
        const originX = column * GameConfig.cellSize + GameConfig.tileInset;
        Laya.Tween.clearAll(view);
        view.x = originX;
        Laya.Tween.to(view, { x: originX - 9 }, 45, Laya.Ease.quadOut, Laya.Handler.create(this, () => {
            Laya.Tween.to(view, { x: originX + 9 }, 70, Laya.Ease.quadInOut, Laya.Handler.create(this, () => {
                Laya.Tween.to(view, { x: originX }, 45, Laya.Ease.quadOut);
            }));
        }));
    }

    private async trySwap(first: Gem, second: Gem): Promise<void> {
        this.state = BoardState.Swapping;
        this.statusText.text = "SWAPPING...";
        await this.swap(first, second);
        if (first.specialType !== SpecialType.None && second.specialType !== SpecialType.None) {
            this.events.onMoveUsed();
            await this.resolveSpecialCombo(first, second);
            await this.finishSpecialSwap();
            return;
        }
        if (first.specialType === SpecialType.Rainbow || second.specialType === SpecialType.Rainbow) {
            this.events.onMoveUsed();
            await this.resolveRainbowSwap(first, second);
            await this.finishSpecialSwap();
            return;
        }
        if (first.specialType !== SpecialType.None || second.specialType !== SpecialType.None) {
            this.events.onMoveUsed();
            await this.resolveSingleSpecial(first.specialType !== SpecialType.None ? first : second);
            await this.finishSpecialSwap();
            return;
        }
        const groups = this.findMatchGroups().filter((group) => group.positions.some((position) =>
            (position.row === first.row && position.column === first.column)
            || (position.row === second.row && position.column === second.column)));
        if (!groups.length) {
            await this.swap(first, second);
            this.statusText.text = "NO MATCH - SWAP RESET";
            GameSave.vibrate(35);
            this.state = BoardState.Idle;
            this.restartHintTimer();
            return;
        }
        this.events.onMoveUsed();
        await this.resolveMatches(groups, { row: second.row, column: second.column });
        await this.ensurePlayable();
        this.finishTurn();
    }

    private async finishSpecialSwap(): Promise<void> {
        await this.ensurePlayable();
        this.finishTurn();
    }

    private finishTurn(): void {
        if (this.events.onBoardStable()) {
            this.state = BoardState.GameOver;
            this.clearHint();
            Laya.timer.clear(this, this.showHint);
            return;
        }
        this.statusText.text = "SWIPE A GEM TO SWAP";
        this.state = BoardState.Idle;
        this.restartHintTimer();
    }

    private async swap(first: Gem, second: Gem): Promise<void> {
        const a = { row: first.row, column: first.column };
        const b = { row: second.row, column: second.column };
        this.cells[a.row][a.column].gem = second;
        this.cells[b.row][b.column].gem = first;
        first.row = b.row; first.column = b.column;
        second.row = a.row; second.column = a.column;
        const firstTarget = {
            x: first.column * GameConfig.cellSize + GameConfig.tileInset,
            y: first.row * GameConfig.cellSize + GameConfig.tileInset,
        };
        const secondTarget = {
            x: second.column * GameConfig.cellSize + GameConfig.tileInset,
            y: second.row * GameConfig.cellSize + GameConfig.tileInset,
        };
        const remaining = Math.max(
            Math.abs(first.view.x - firstTarget.x), Math.abs(first.view.y - firstTarget.y),
            Math.abs(second.view.x - secondTarget.x), Math.abs(second.view.y - secondTarget.y),
        ) / GameConfig.cellSize;
        const duration = Math.max(GameConfig.minSwapDuration, GameConfig.swapDuration * Math.min(1, remaining));
        await Promise.all([
            this.tween(first.view, firstTarget, duration),
            this.tween(second.view, secondTarget, duration),
        ]);
    }

    private async resolveMatches(initialGroups: MatchGroup[], preferred?: GridPosition): Promise<void> {
        let groups = initialGroups;
        let cascade = 0;
        while (groups.length && cascade < GameConfig.maxCascade) {
            cascade++;
            const creation = this.chooseSpecial(groups, cascade === 1 ? preferred : undefined);
            const matched = this.uniquePositions(groups);
            const diagonal = this.expandMatchDiagonals(matched);
            const positions = this.expandSpecialEffects(diagonal);
            this.statusText.text = cascade === 1 ? `CLEARED ${positions.length}!` : `COMBO x${cascade}!`;
            await this.clear(positions, positions.length > diagonal.length, cascade);
            if (creation) {
                const special = await this.createGem(
                    creation.type, creation.position.row, creation.position.column, creation.specialType,
                );
                this.cells[creation.position.row][creation.position.column].gem = special;
                this.statusText.text = creation.specialType === SpecialType.Rainbow ? "RAINBOW GEM CREATED!"
                    : creation.specialType === SpecialType.Bomb ? "CRYSTAL BOMB CREATED!" : "ROCKET CREATED!";
                await this.effects.playSpecialCreated({
                    row: special.row, column: special.column, type: special.type,
                    specialType: special.specialType, texture: special.view.texture,
                }, special.view);
            }
            await this.collapseAndRefill();
            groups = this.findMatchGroups();
        }
    }

    private async resolveRainbowSwap(first: Gem, second: Gem): Promise<void> {
        const rainbow = first.specialType === SpecialType.Rainbow ? first : second;
        const target = rainbow === first ? second : first;
        const positions: GridPosition[] = [{ row: rainbow.row, column: rainbow.column }];
        for (const row of this.cells) {
            for (const cell of row) {
                if (cell.gem?.type === target.type) positions.push({ row: cell.row, column: cell.column });
            }
        }
        const expanded = this.expandSpecialEffects(positions);
        this.statusText.text = `RAINBOW CLEARED ${expanded.length}!`;
        await this.clear(expanded, true);
        await this.collapseAndRefill();
        const groups = this.findMatchGroups();
        if (groups.length) await this.resolveMatches(groups);
    }

    private async resolveSingleSpecial(special: Gem): Promise<void> {
        const names = ["", "HORIZONTAL ROCKET!", "VERTICAL ROCKET!", "BOMB BLAST!"];
        const positions = this.expandSpecialEffects([{ row: special.row, column: special.column }]);
        this.statusText.text = names[special.specialType];
        await this.clear(positions, true);
        await this.collapseAndRefill();
        const groups = this.findMatchGroups();
        if (groups.length) await this.resolveMatches(groups);
    }

    private async resolveSpecialCombo(first: Gem, second: Gem): Promise<void> {
        const positions: GridPosition[] = [];
        const addRow = (row: number): void => {
            for (let column = 0; column < this.level.columns; column++) positions.push({ row, column });
        };
        const addColumn = (column: number): void => {
            for (let row = 0; row < this.level.rows; row++) positions.push({ row, column });
        };
        const addArea = (row: number, column: number, radius: number): void => {
            for (let targetRow = row - radius; targetRow <= row + radius; targetRow++) {
                for (let targetColumn = column - radius; targetColumn <= column + radius; targetColumn++) {
                    positions.push({ row: targetRow, column: targetColumn });
                }
            }
        };
        const isRocket = (gem: Gem): boolean => gem.specialType === SpecialType.RocketHorizontal
            || gem.specialType === SpecialType.RocketVertical;

        if (first.specialType === SpecialType.Rainbow && second.specialType === SpecialType.Rainbow) {
            for (let row = 0; row < this.level.rows; row++) addRow(row);
            this.statusText.text = "DOUBLE RAINBOW CLEAR!";
        } else if (first.specialType === SpecialType.Rainbow || second.specialType === SpecialType.Rainbow) {
            const target = first.specialType === SpecialType.Rainbow ? second : first;
            for (const row of this.cells) {
                for (const cell of row) {
                    if (cell.gem?.type !== target.type) continue;
                    if (target.specialType === SpecialType.Bomb) addArea(cell.row, cell.column, 1);
                    else if ((cell.row + cell.column) % 2 === 0) addRow(cell.row);
                    else addColumn(cell.column);
                }
            }
            positions.push({ row: first.row, column: first.column }, { row: second.row, column: second.column });
            this.statusText.text = target.specialType === SpecialType.Bomb ? "RAINBOW + BOMB!" : "RAINBOW + ROCKET!";
        } else if (first.specialType === SpecialType.Bomb && second.specialType === SpecialType.Bomb) {
            addArea(second.row, second.column, 2);
            this.statusText.text = "DOUBLE BOMB BLAST!";
        } else if ((first.specialType === SpecialType.Bomb && isRocket(second))
            || (second.specialType === SpecialType.Bomb && isRocket(first))) {
            const center = first.specialType === SpecialType.Bomb ? first : second;
            for (let offset = -1; offset <= 1; offset++) {
                addRow(center.row + offset);
                addColumn(center.column + offset);
            }
            this.statusText.text = "ROCKET + BOMB!";
        } else {
            addRow(first.row);
            addColumn(second.column);
            this.statusText.text = "DOUBLE ROCKET CROSS!";
        }

        const valid = positions.filter((position) => position.row >= 0 && position.row < this.level.rows
            && position.column >= 0 && position.column < this.level.columns);
        await this.clear(this.expandSpecialEffects(valid), true);
        await this.collapseAndRefill();
        const groups = this.findMatchGroups();
        if (groups.length) await this.resolveMatches(groups);
    }

    private uniquePositions(groups: MatchGroup[]): GridPosition[] {
        const positions = new Map<string, GridPosition>();
        for (const group of groups) {
            for (const position of group.positions) positions.set(`${position.row}:${position.column}`, position);
        }
        return [...positions.values()];
    }

    private expandMatchDiagonals(matched: GridPosition[]): GridPosition[] {
        const positions = new Map<string, GridPosition>();
        const add = (row: number, column: number): void => {
            if (row < 0 || row >= this.level.rows || column < 0 || column >= this.level.columns) return;
            if (!this.cells[row][column].gem) return;
            positions.set(`${row}:${column}`, { row, column });
        };
        for (const position of matched) {
            add(position.row, position.column);
            add(position.row - 1, position.column - 1);
            add(position.row - 1, position.column + 1);
            add(position.row + 1, position.column - 1);
            add(position.row + 1, position.column + 1);
        }
        return [...positions.values()];
    }

    private chooseSpecial(groups: MatchGroup[], preferred?: GridPosition): SpecialCreation | null {
        const choosePosition = (positions: GridPosition[]): GridPosition | null => {
            const available = positions.filter((position) =>
                this.cells[position.row][position.column].gem?.specialType === SpecialType.None);
            if (!available.length) return null;
            if (preferred) {
                const selected = available.find((position) =>
                    position.row === preferred.row && position.column === preferred.column);
                if (selected) return selected;
            }
            return available[Math.floor(available.length / 2)];
        };

        const shapedGroup = groups.find((group) => group.positions.length >= (this.level.matchLength ?? 3) + 1
            && new Set(group.positions.map((position) => position.row)).size > 1
            && new Set(group.positions.map((position) => position.column)).size > 1);
        if (shapedGroup) {
            const position = choosePosition(shapedGroup.positions);
            if (position) return { position, type: shapedGroup.type, specialType: SpecialType.Bomb };
        }

        const longGroup = groups.find((group) => group.positions.length >= (this.level.matchLength ?? 3) + 2);
        if (longGroup) {
            const position = choosePosition(longGroup.positions);
            if (position) return { position, type: -1, specialType: SpecialType.Rainbow };
        }

        const fourGroup = groups.find((group) => group.positions.length >= (this.level.matchLength ?? 3) + 1);
        if (fourGroup) {
            const position = choosePosition(fourGroup.positions);
            if (position) {
                const specialType = fourGroup.orientation === "horizontal"
                    ? SpecialType.RocketHorizontal : SpecialType.RocketVertical;
                return { position, type: fourGroup.type, specialType };
            }
        }
        return null;
    }

    private expandSpecialEffects(initial: GridPosition[]): GridPosition[] {
        const positions = new Map<string, GridPosition>();
        const queue: GridPosition[] = [];
        const add = (row: number, column: number): void => {
            if (row < 0 || row >= this.level.rows || column < 0 || column >= this.level.columns) return;
            const key = `${row}:${column}`;
            if (positions.has(key)) return;
            const position = { row, column };
            positions.set(key, position);
            queue.push(position);
        };
        for (const position of initial) add(position.row, position.column);

        for (let index = 0; index < queue.length; index++) {
            const position = queue[index];
            const specialType = this.cells[position.row][position.column].gem?.specialType ?? SpecialType.None;
            if (specialType === SpecialType.RocketHorizontal) {
                for (let column = 0; column < this.level.columns; column++) add(position.row, column);
            } else if (specialType === SpecialType.RocketVertical) {
                for (let row = 0; row < this.level.rows; row++) add(row, position.column);
            } else if (specialType === SpecialType.Bomb) {
                for (let row = position.row - 1; row <= position.row + 1; row++) {
                    for (let column = position.column - 1; column <= position.column + 1; column++) add(row, column);
                }
            } else if (specialType === SpecialType.Rainbow) {
                for (let row = 0; row < this.level.rows; row++) {
                    for (let column = 0; column < this.level.columns; column++) add(row, column);
                }
            }
        }
        return [...positions.values()];
    }

    private async clear(matches: GridPosition[], specialAttack = false, cascade = 1): Promise<void> {
        this.state = BoardState.Clearing;
        this.audio.clear(cascade, specialAttack, matches.length);
        this.damageObstacles(matches, specialAttack);
        const cleared = matches.flatMap((position) => {
            const gem = this.cells[position.row][position.column].gem;
            return gem ? [{
                row: position.row,
                column: position.column,
                type: gem.type,
                specialType: gem.specialType,
                texture: gem.view.texture,
            }] : [];
        });
        this.events.onCleared(cleared.map((item) => item.type), specialAttack);
        const animations = matches.map((position) => {
            const cell = this.cells[position.row][position.column];
            const gem = cell.gem;
            if (!gem) return Promise.resolve();
            cell.gem = null;
            gem.view.offAll();
            return this.tween(gem.view, { scaleX: 1.18, scaleY: 1.18 }, 70)
                .then(() => this.tween(gem.view, { scaleX: 0.08, scaleY: 0.08, alpha: 0 }, GameConfig.clearDuration - 70))
                .then(() => gem.view.destroy());
        });
        await Promise.all([...animations, this.effects.playClear(cleared, specialAttack, cascade)]);
    }

    private damageObstacles(matches: GridPosition[], specialAttack: boolean): void {
        const hit = new Set<string>();
        const damage = (row: number, column: number, directSpecial: boolean): void => {
            if (row < 0 || row >= this.level.rows || column < 0 || column >= this.level.columns) return;
            const key = `${row}:${column}`;
            if (hit.has(key)) return;
            const cell = this.cells[row][column];
            const obstacle = cell.obstacle;
            if (!obstacle) return;
            const canDamage = obstacle.type === ObstacleType.Ice || obstacle.type === ObstacleType.Chain
                || obstacle.type === ObstacleType.Crate || (obstacle.type === ObstacleType.Stone && directSpecial);
            if (!canDamage) return;
            hit.add(key);
            obstacle.hitPoints--;
            if (obstacle.hitPoints <= 0) {
                this.events.onObstacleDestroyed(obstacle.type);
                obstacle.view.destroy();
                cell.obstacle = null;
            } else {
                const crack = obstacle.view.getChildByName("DamageCrack") as Laya.GImage;
                if (crack) {
                    crack.blendMode = "normal";
                    crack.alpha = Math.min(1, 0.45 + 0.25 * (3 - obstacle.hitPoints));
                    crack.scale(0.55, 0.55);
                    Laya.Tween.to(crack, { scaleX: 1, scaleY: 1 }, 180, Laya.Ease.backOut);
                }
                Laya.Tween.clearAll(obstacle.view);
                obstacle.view.scale(1.18, 1.18);
                obstacle.view.rotation = directSpecial ? 8 : -6;
                if (obstacle.type === ObstacleType.Ice) obstacle.view.alpha = 0.65;
                Laya.Tween.to(obstacle.view, { scaleX: 1, scaleY: 1, rotation: 0 }, 180, Laya.Ease.backOut);
            }
        };

        for (const position of matches) {
            damage(position.row, position.column, specialAttack);
            for (const [rowOffset, columnOffset] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const row = position.row + rowOffset;
                const column = position.column + columnOffset;
                if (row < 0 || row >= this.level.rows || column < 0 || column >= this.level.columns) continue;
                if (this.cells[row][column].obstacle?.type === ObstacleType.Crate) damage(row, column, true);
            }
        }
    }

    private async collapseAndRefill(): Promise<void> {
        this.state = BoardState.Falling;
        const animations: Promise<void>[] = [];
        for (let column = 0; column < this.level.columns; column++) {
            let targetRow = this.level.rows - 1;
            for (let row = this.level.rows - 1; row >= 0; row--) {
                const cell = this.cells[row][column];
                if (cell.isBlocked) {
                    targetRow = row - 1;
                    continue;
                }
                const gem = cell.gem;
                if (!gem) continue;
                if (row !== targetRow) {
                    this.cells[targetRow][column].gem = gem;
                    cell.gem = null;
                    const distance = targetRow - row;
                    gem.row = targetRow;
                    animations.push(this.tween(gem.view, { y: targetRow * GameConfig.cellSize + GameConfig.tileInset },
                        GameConfig.fallBaseDuration + distance * GameConfig.fallPerCellDuration));
                }
                targetRow--;
            }
            let spawnOffset = 0;
            for (let row = 0; row < this.level.rows; row++) {
                const cell = this.cells[row][column];
                if (cell.isBlocked || cell.gem) continue;
                const type = Math.floor(Math.random() * this.level.gemTypes);
                const spawnIndex = ++spawnOffset;
                animations.push(this.createGem(type, row, column).then((gem) => {
                    gem.view.y = -spawnIndex * GameConfig.cellSize + GameConfig.tileInset;
                    cell.gem = gem;
                    return this.tween(gem.view, { y: row * GameConfig.cellSize + GameConfig.tileInset },
                        GameConfig.fallBaseDuration + spawnIndex * GameConfig.fallPerCellDuration);
                }));
            }
        }
        await Promise.all(animations);
    }

    private findMatches(): GridPosition[] {
        return MatchDetector.find(this.cells.map((row) => row.map((cell) => cell.gem?.type ?? -1)), this.level.matchLength);
    }

    private findMatchGroups(): MatchGroup[] {
        return MatchDetector.findGroups(this.cells.map((row) => row.map((cell) => cell.gem?.type ?? -1)), this.level.matchLength);
    }

    public findPossibleMove(): [Gem, Gem] | null {
        return this.possibleMoves(1)[0] ?? null;
    }

    public countPossibleMoves(): number {
        return this.possibleMoves().length;
    }

    private possibleMoves(limit = Number.POSITIVE_INFINITY): Array<[Gem, Gem]> {
        const grid = this.cells.map((row) => row.map((cell) => cell.gem?.type ?? -1));
        const directions = [[0, 1], [1, 0]] as const;
        const moves: Array<[Gem, Gem]> = [];
        for (let row = 0; row < this.level.rows; row++) {
            for (let column = 0; column < this.level.columns; column++) {
                for (const [rowOffset, columnOffset] of directions) {
                    const otherRow = row + rowOffset;
                    const otherColumn = column + columnOffset;
                    if (otherRow >= this.level.rows || otherColumn >= this.level.columns) continue;
                    const firstCell = this.cells[row][column];
                    const secondCell = this.cells[otherRow][otherColumn];
                    if (!firstCell.gem || !secondCell.gem || firstCell.isBlocked || secondCell.isBlocked
                        || firstCell.obstacle?.type === ObstacleType.Chain
                        || secondCell.obstacle?.type === ObstacleType.Chain) continue;
                    const firstGem = this.cells[row][column].gem;
                    const secondGem = this.cells[otherRow][otherColumn].gem;
                    if (firstGem?.specialType !== SpecialType.None || secondGem?.specialType !== SpecialType.None) {
                        if (firstGem && secondGem) moves.push([firstGem, secondGem]);
                        if (moves.length >= limit) return moves;
                        continue;
                    }
                    if (grid[row][column] === grid[otherRow][otherColumn]) continue;
                    [grid[row][column], grid[otherRow][otherColumn]] = [grid[otherRow][otherColumn], grid[row][column]];
                    const createsMatch = MatchDetector.find(grid, this.level.matchLength).length > 0;
                    [grid[row][column], grid[otherRow][otherColumn]] = [grid[otherRow][otherColumn], grid[row][column]];
                    if (createsMatch) {
                        const first = this.cells[row][column].gem;
                        const second = this.cells[otherRow][otherColumn].gem;
                        if (first && second) moves.push([first, second]);
                        if (moves.length >= limit) return moves;
                    }
                }
            }
        }
        return moves;
    }

    private async ensurePlayable(): Promise<void> {
        if (this.findPossibleMove()) return;
        await this.shuffle();
    }

    private async shuffle(): Promise<void> {
        this.state = BoardState.Shuffling;
        this.statusText.text = "NO MOVES - SHUFFLING...";
        const availableCells = this.cells.flatMap((row) => row.filter((cell) => !cell.isBlocked && cell.gem));
        const gems = availableCells.map((cell) => cell.gem as Gem);
        let playable = false;
        for (let attempt = 0; attempt < 120 && !playable; attempt++) {
            const shuffled = [...gems];
            for (let index = shuffled.length - 1; index > 0; index--) {
                const swapIndex = Math.floor(Math.random() * (index + 1));
                [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
            }
            for (let index = 0; index < availableCells.length; index++) {
                const cell = availableCells[index];
                const gem = shuffled[index];
                cell.gem = gem;
                gem.row = cell.row;
                gem.column = cell.column;
            }
            playable = this.findMatchGroups().length === 0 && this.findPossibleMove() !== null;
        }
        if (!playable) {
            throw new Error("Unable to create a playable shuffled board.");
        }
        await Promise.all(gems.map((gem) => this.tween(gem.view, {
            x: gem.column * GameConfig.cellSize + GameConfig.tileInset,
            y: gem.row * GameConfig.cellSize + GameConfig.tileInset,
        }, GameConfig.shuffleDuration)));
    }

    private restartHintTimer(): void {
        this.clearHint();
        Laya.timer.clear(this, this.showHint);
        if (this.guideActive) return;
        Laya.timer.once(GameConfig.hintDelay, this, this.showHint);
    }

    private guidePoint(gem: Gem): { x: number; y: number } {
        return {
            x: this.gemLayer.x + gem.view.x + GameConfig.tileSize / 2,
            y: this.gemLayer.y + gem.view.y + GameConfig.tileSize / 2,
        };
    }

    private showHint(): void {
        if (this.state !== BoardState.Idle || this.dragGem) return;
        const move = this.findPossibleMove();
        if (!move) {
            void this.shuffle().then(() => {
                this.state = BoardState.Idle;
                this.statusText.text = "SWIPE A GEM TO SWAP";
                this.restartHintTimer();
            });
            return;
        }
        this.hinted = [...move];
        this.statusText.text = "TRY THESE TWO GEMS";
        for (const gem of this.hinted) gem.setSelected(true);
        Laya.timer.once(650, this, this.clearHint);
    }

    private clearHint(): void {
        Laya.timer.clear(this, this.clearHint);
        for (const gem of this.hinted) gem.setSelected(false);
        this.hinted.length = 0;
    }

    private async shatterView(view: Laya.GImage): Promise<void> {
        const texture = view.texture;
        view.offAll();
        Laya.Tween.clearAll(view);
        if (!texture || texture.width <= 0 || texture.height <= 0) {
            await this.tween(view, { y: view.y + 260, rotation: 25, alpha: 0 }, 520);
            view.destroy();
            return;
        }

        const rows = 3;
        const columns = 3;
        const pieceWidth = view.width / columns;
        const pieceHeight = view.height / rows;
        const pieces: Laya.Sprite[] = [];
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const piece = new Laya.Sprite();
                piece.size(pieceWidth, pieceHeight);
                piece.scrollRect = new Laya.Rectangle(0, 0, pieceWidth, pieceHeight);
                piece.pivot(pieceWidth / 2, pieceHeight / 2);
                piece.pos(view.x + (column + 0.5) * pieceWidth,
                    view.y + (row + 0.5) * pieceHeight);
                piece.alpha = view.alpha;
                const image = new Laya.GImage();
                image.texture = texture;
                image.autoSize = false;
                image.size(view.width, view.height);
                image.pos(-column * pieceWidth, -row * pieceHeight);
                piece.addChild(image);
                this.effectLayer.addChild(piece);
                pieces.push(piece);
            }
        }
        view.destroy();

        await Promise.all(pieces.map((piece) => new Promise<void>((resolve) => {
            const horizontal = (Math.random() - 0.5) * 120;
            const fall = 220 + Math.random() * 150;
            const duration = 480 + Math.random() * 220;
            Laya.Tween.to(piece, {
                x: piece.x + horizontal,
                y: piece.y + fall,
                rotation: (Math.random() - 0.5) * 210,
                alpha: 0,
            }, duration, Laya.Ease.quadIn, Laya.Handler.create(null, resolve));
        })));
        for (const piece of pieces) piece.destroy();
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => Laya.timer.once(milliseconds, this, resolve));
    }

    private tween(target: object, properties: object, duration: number): Promise<void> {
        return new Promise((resolve) => {
            Laya.Tween.to(target, properties, duration, Laya.Ease.quadOut, Laya.Handler.create(null, resolve));
        });
    }
}
