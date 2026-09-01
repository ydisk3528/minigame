import { BlockSystem } from "./BlockSystem";
import { LevelConfig, TilePlacement, loadLevel } from "./LevelData";
import { MahjongSave, SaveData } from "./MahjongSave";
import { MatchKind, MatchSystem } from "./MatchSystem";
import { GamePlatform } from "../platform/GamePlatform";
import { localizeTree, uiText, usesEnglishUi } from "../platform/UiText";
import { ThemeSystem } from "./ThemeSystem";
import { GuideSystem } from "./GuideSystem";

interface TileState extends TilePlacement { view: Laya.Sprite; }
interface Navigation { home: () => void; levels: () => void; restart: () => void; next: (() => void) | null; goTo: (level: number) => void; }
export interface GameContext { displayTitle?: string; completeTitle?: string; complete?: (stars: number) => number; primaryLabel?: string; primaryAction?: () => void; hideSecondary?: boolean; }

export class MahjongGame {
    private contentRoot: Laya.Sprite;
    private level: LevelConfig;
    private board: TileState[] = [];
    private slots: TileState[] = [];
    private extra: TileState[] = [];
    private blocked = new Set<number>();
    private busy = false;
    private score = 0;
    private combo = 0;
    private lastSelected: TileState | null = null;
    private boardLayer: Laya.Sprite;
    private effectLayer: Laya.Sprite;
    private mergeEffectTemplate: Laya.Sprite;
    private mergeSparkTargets: Array<{ x: number; y: number }>;
    private slotLayer: Laya.Sprite;
    private extraLayer: Laya.Sprite;
    private statusText: Laya.GTextField;
    private scoreText: Laya.GTextField;
    private limitText: Laya.GTextField;
    private debugLabelsVisible = false;
    private debugAutoRunning = false;
    private adPending = false;
    private reviveUsed = false;
    private propAdClaimed = false;
    private finished = false;
    private failureReason: "slots" | "time" | "moves" = "slots";
    private timeLeft = 0;
    private movesLeft = 0;
    private freezeSeconds = 0;
    private freezeOverlay: Laya.GImage;
    private freePropCounts: SaveData["props"];
    private propCounts: SaveData["props"];

    public constructor(private scene: Laya.Scene, private levelPath: string, private navigation: Navigation, private context?: GameContext) {
        this.contentRoot = scene.getChildByName("ContentRoot") as Laya.Sprite;
        this.boardLayer = this.node("BoardLayer") as Laya.Sprite;
        if (this.boardLayer) this.boardLayer.mouseThrough = true;
        this.effectLayer = this.node("EffectLayer") as Laya.Sprite;
        this.mergeEffectTemplate = this.effectLayer?.getChildByName("MergeEffectTemplate") as Laya.Sprite;
        if (this.effectLayer) { this.effectLayer.zOrder = 100000; this.effectLayer.mouseEnabled = false; this.effectLayer.mouseThrough = true; }
        this.mergeSparkTargets = this.mergeEffectTemplate
            ? Array.from({ length: this.mergeEffectTemplate.numChildren }, (_, index) => {
                const spark = this.mergeEffectTemplate.getChildAt(index) as Laya.Sprite;
                return { x: spark.x, y: spark.y };
            })
            : [];
        this.slotLayer = this.node("SlotLayer") as Laya.Sprite;
        this.extraLayer = this.node("ExtraLayer") as Laya.Sprite;
        this.statusText = this.node("StatusText") as Laya.GTextField;
        this.scoreText = this.node("ScoreText") as Laya.GTextField;
        this.limitText = this.node("LimitText") as Laya.GTextField;
        this.freezeOverlay = this.node("FreezeOverlay") as Laya.GImage;
    }

    public async initialize(): Promise<void> {
        BlockSystem.selfCheck(); MatchSystem.selfCheck();
        this.requireBindings();
        this.level = await loadLevel(this.levelPath);
        this.timeLeft = this.level.timeLimit ?? 180;
        this.movesLeft = this.level.moveLimit ?? Math.ceil(this.level.layout.length * 1.5);
        this.freePropCounts = { undo: this.level.props?.undo ?? 3, shuffle: this.level.props?.shuffle ?? 3, move: this.level.props?.move ?? 3, hint: this.level.props?.hint ?? 3, freeze: this.level.props?.freeze ?? 1 };
        const bonus = ThemeSystem.bonusProp(); if (bonus) this.freePropCounts[bonus]++;
        this.propCounts = { undo: this.freePropCounts.undo + MahjongSave.prop("undo"), shuffle: this.freePropCounts.shuffle + MahjongSave.prop("shuffle"), move: this.freePropCounts.move + MahjongSave.prop("move"), hint: this.freePropCounts.hint + MahjongSave.prop("hint"), freeze: this.freePropCounts.freeze + MahjongSave.prop("freeze") };
        (this.node("LevelText") as Laya.GTextField).text = this.context?.displayTitle ?? `${uiText("LEVEL")} ${this.level.level}`;
        await Laya.loader.load("resources/prefabs/game/MahjongTile.lh", Laya.Loader.HIERARCHY);
        await Laya.loader.load("resources/prefabs/ui/ResultPanel.lh", Laya.Loader.HIERARCHY);
        this.createSlotBackplates();
        for (const data of [...this.level.layout].sort((a, b) => a.layer - b.layer)) await this.addBoardTile(data);
        this.recalculateBlocked();
        this.bindButton("HomeButton", this.navigation.home);
        this.bindButton("RestartButton", this.navigation.restart);
        this.bindButton("UndoButton", () => this.activateProp("undo", () => this.undo()));
        this.bindButton("ShuffleButton", () => this.activateProp("shuffle", () => this.shuffle()));
        this.bindButton("MoveButton", () => this.activateProp("move", () => this.moveOut()));
        this.bindButton("HintButton", () => this.activateProp("hint", () => this.hint()));
        this.bindButton("FreezeButton", () => this.activateProp("freeze", () => this.freezeTime()));
        this.refreshPropLabels(); this.refreshScore(); this.refreshLimit();
        const debugMode = typeof location !== "undefined" && typeof URLSearchParams !== "undefined" && new URLSearchParams(location.search).get("debug") === "1";
        if (debugMode) await this.initializeDebugPanel();
        else await GuideSystem.attach("game", this.scene, (name, value) => name === "matching_tile"
            ? this.board.find(tile => tile.type === value && !this.blocked.has(tile.id))?.view ?? null
            : this.node(name) as Laya.Sprite);
        if (this.level.limitType === "time") Laya.timer.loop(1000, this, this.tickLimit);
    }

    private async addBoardTile(data: TilePlacement): Promise<void> {
        const view = Laya.Pool.getItem("mahjong-tile") as Laya.Sprite
            ?? await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/game/MahjongTile.lh");
        const tile: TileState = { ...data, view };
        view.name = `Tile_${data.id}`; view.pos(data.x, data.y); view.zOrder = data.layer * 10000 + data.id; view.alpha = 1; view.scale(1, 1); view.visible = true;
        view.offAll();
        view.mouseEnabled = true; view.mouseThrough = false; view.hitArea = new Laya.Rectangle(0, 0, view.width, view.height);
        (view.getChildByName("Face") as Laya.GImage).src = `resources/images/tiles/${data.type}.png`;
        ThemeSystem.applyTile(view);
        view.on(Laya.Event.CLICK, null, (): void => { void this.selectTile(tile); });
        this.boardLayer.addChild(view); this.board.push(tile);
    }

    private async selectTile(tile: TileState): Promise<void> {
        if (this.busy || this.finished || (this.level.limitType === "moves" && this.movesLeft <= 0) || this.blocked.has(tile.id) || this.board.indexOf(tile) < 0) return;
        this.playSound("TileClick");
        this.busy = true; this.lastSelected = tile;
        this.board.splice(this.board.indexOf(tile), 1);
        this.recalculateBlocked();
        this.slots.push(tile);
        if (this.level.limitType === "moves") { this.movesLeft--; this.refreshLimit(); }
        this.reparentAtSamePosition(tile.view, this.slotLayer);
        await this.tween(tile.view, { scaleX: 1.08, scaleY: 1.08 }, 80, Laya.Ease.quadOut);
        await this.arrangeSlots();
        tile.view.scale(1, 1);
        await this.resolveMatches();
        GuideSystem.trigger("tile_selected", tile.type);
        this.busy = false;
        if (!this.board.length && !this.slots.length && !this.extra.length) await this.finish(true);
        else if (this.level.limitType === "moves" && this.movesLeft <= 0) { this.failureReason = "moves"; await this.finish(false); }
        else if (this.slots.length >= this.level.slotCount) { this.failureReason = "slots"; await this.finish(false); }
    }

    private async resolveMatches(): Promise<void> {
        const match = MatchSystem.find(this.slots.map((tile) => tile.type), this.level.enableSequence, this.level.enableSpecialCombo);
        if (!match) return;
        const matched = match.indices.sort((a, b) => b - a).map((index) => this.slots.splice(index, 1)[0]);
        const centers = matched.map((tile) => tile.view.localToGlobal(new Laya.Point(tile.view.width / 2, tile.view.height / 2)));
        const center = centers.reduce((point, item) => new Laya.Point(point.x + item.x, point.y + item.y), new Laya.Point());
        this.playMergeBurst(center.x / centers.length, center.y / centers.length);
        this.lastSelected = null; this.combo++;
        MahjongSave.recordMatch(this.combo);
        Laya.timer.clear(this, this.resetCombo);
        Laya.timer.once(2500, this, this.resetCombo);
        this.score += match.kind === "special" ? 600 : match.kind === "sequence" ? 300 : 200;
        this.showStatus(match.kind === "special" ? "SPECIAL DRAGONS" : this.combo > 1 ? `${uiText("COMBO")} ×${this.combo}` : match.kind === "sequence" ? "SEQUENCE" : "MATCH 3");
        await Promise.all(matched.map(async (tile) => {
            await this.tween(tile.view, { scaleX: 1.18, scaleY: 1.18, alpha: 0.4 }, 120, Laya.Ease.backOut);
            await this.tween(tile.view, { scaleX: 0.15, scaleY: 0.15, alpha: 0 }, 130, Laya.Ease.quadIn);
            this.recycleTile(tile.view);
        }));
        if (match.kind === "special") await this.clearThreeFreeTiles();
        await this.arrangeSlots(); this.refreshScore();
    }

    private async clearThreeFreeTiles(): Promise<void> {
        this.recalculateBlocked();
        const groups = new Map<string, TileState[]>();
        this.board.filter((tile) => !this.blocked.has(tile.id)).forEach((tile) => groups.set(tile.type, [...(groups.get(tile.type) ?? []), tile]));
        const choices = [...groups.values()].filter((tiles) => tiles.length >= 3);
        const targets = choices.length ? choices[Math.floor(Math.random() * choices.length)].slice(0, 3) : [];
        for (const tile of targets) {
            this.board.splice(this.board.indexOf(tile), 1);
            const center = tile.view.localToGlobal(new Laya.Point(tile.view.width / 2, tile.view.height / 2));
            this.playMergeBurst(center.x, center.y);
            await this.tween(tile.view, { alpha: 0, scaleX: 0.2, scaleY: 0.2 }, 120);
            this.recycleTile(tile.view);
        }
        this.recalculateBlocked();
    }

    private async undo(): Promise<void> {
        if (this.busy || !this.lastSelected || this.slots.indexOf(this.lastSelected) < 0 || !this.useProp("undo")) return;
        this.playSound("Undo");
        this.busy = true; const tile = this.lastSelected; this.lastSelected = null;
        this.slots.splice(this.slots.indexOf(tile), 1); this.board.push(tile);
        this.reparentAtSamePosition(tile.view, this.boardLayer);
        await Promise.all([this.arrangeSlots(), this.tween(tile.view, { x: tile.x, y: tile.y }, 220, Laya.Ease.quadOut)]);
        if (this.level.limitType === "moves") { this.movesLeft++; this.refreshLimit(); }
        this.recalculateBlocked(); this.refreshPropLabels(); this.busy = false;
    }

    private async shuffle(): Promise<void> {
        if (this.busy || this.board.length < 2 || !this.useProp("shuffle")) return;
        this.playSound("Shuffle");
        this.busy = true; const positions = this.board.map((tile) => ({ x: tile.x, y: tile.y, layer: tile.layer }));
        for (let i = positions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [positions[i], positions[j]] = [positions[j], positions[i]]; }
        await Promise.all(this.board.map((tile, index) => { Object.assign(tile, positions[index]); tile.view.zOrder = tile.layer * 10000 + tile.id; return this.tween(tile.view, { x: tile.x, y: tile.y }, 300, Laya.Ease.sineInOut); }));
        this.recalculateBlocked(); this.refreshPropLabels(); this.busy = false;
    }

    private async moveOut(): Promise<void> {
        if (this.busy || !this.slots.length || this.extra.length >= 3 || !this.useProp("move")) return;
        this.playSound("MoveOut");
        this.busy = true; const count = Math.min(3 - this.extra.length, this.slots.length);
        const moved = this.slots.splice(Math.max(0, this.slots.length - count), count); this.extra.push(...moved);
        moved.forEach((tile) => {
            this.reparentAtSamePosition(tile.view, this.extraLayer);
            tile.view.offAll(Laya.Event.CLICK);
            tile.view.on(Laya.Event.CLICK, null, (): void => { void this.returnFromExtra(tile); });
        });
        await Promise.all([this.arrangeSlots(), ...this.extra.map((tile, index) => this.tween(tile.view, { x: index * 78, y: 0, scaleX: 0.78, scaleY: 0.78 }, 180))]);
        this.lastSelected = null; this.refreshPropLabels(); this.busy = false;
    }

    private async returnFromExtra(tile: TileState): Promise<void> {
        if (this.busy || this.slots.length >= this.level.slotCount || this.extra.indexOf(tile) < 0) return;
        this.busy = true;
        this.extra.splice(this.extra.indexOf(tile), 1);
        this.slots.push(tile);
        tile.view.offAll(Laya.Event.CLICK);
        this.reparentAtSamePosition(tile.view, this.slotLayer);
        await Promise.all([
            this.arrangeSlots(),
            ...this.extra.map((item, index) => this.tween(item.view, { x: index * 78, y: 0 }, 140, Laya.Ease.quadOut)),
        ]);
        await this.resolveMatches();
        this.busy = false;
        if (!this.board.length && !this.slots.length && !this.extra.length) await this.finish(true);
        else if (this.slots.length >= this.level.slotCount) await this.finish(false);
    }

    private async hint(): Promise<void> {
        if (this.busy || !this.useProp("hint")) return;
        this.playSound("Hint");
        this.recalculateBlocked(); const free = this.board.filter((tile) => !this.blocked.has(tile.id));
        const groups = new Map<string, TileState[]>(); free.forEach((tile) => groups.set(tile.type, [...(groups.get(tile.type) ?? []), tile]));
        const targets = [...groups.values()].find((items) => items.length >= 3)?.slice(0, 3) ?? free.slice(0, 1);
        targets.forEach((tile) => { const y = tile.view.y; Laya.Tween.to(tile.view, { y: y - 14, alpha: 0.65 }, 300, Laya.Ease.sineOut, Laya.Handler.create(null, () => Laya.Tween.to(tile.view, { y, alpha: 1 }, 420, Laya.Ease.sineIn))); });
        this.refreshPropLabels();
        GuideSystem.trigger("prop_used", "hint");
    }

    private async freezeTime(): Promise<void> {
        if (this.busy || this.level.limitType !== "time") { this.showStatus("TIME LEVELS ONLY"); return; }
        if (!this.useProp("freeze")) return;
        this.playSound("Freeze"); this.freezeSeconds = 20; this.refreshPropLabels();
        this.freezeOverlay.visible = true; this.freezeOverlay.alpha = 0; this.freezeOverlay.zOrder = 800000;
        Laya.Tween.clearAll(this.freezeOverlay); Laya.Tween.to(this.freezeOverlay, { alpha: 0.72 }, 260, Laya.Ease.sineOut);
        this.showStatus("TIME FROZEN · 20S");
    }

    private activateProp(type: keyof SaveData["props"], action: () => Promise<void>): void {
        if (this.busy) return;
        if (this.propCounts[type] > 0) { void action(); return; }
        void this.rewardProp(type);
    }

    private async rewardProp(type: keyof SaveData["props"]): Promise<void> {
        if (this.adPending || this.propAdClaimed) return;
        this.adPending = true;
        const icon = this.node(`${type[0].toUpperCase()}${type.slice(1)}AdIcon`) as Laya.GImage;
        if (icon) icon.alpha = 0.45;
        GamePlatform.hideBanner();
        const rewarded = await GamePlatform.showRewardVideo();
        GamePlatform.showBanner();
        this.adPending = false;
        if (this.scene.destroyed) return;
        if (rewarded) {
            this.propAdClaimed = true;
            this.freePropCounts[type]++;
            this.propCounts[type]++;
            this.showStatus("FREE PROP +1");
        }
        this.refreshPropLabels();
    }

    private recalculateBlocked(): void {
        this.blocked = BlockSystem.calculate(this.board);
        for (const tile of this.board) {
            const isBlocked = this.blocked.has(tile.id); tile.view.alpha = isBlocked ? 0.48 : 1; tile.view.mouseEnabled = !isBlocked;
            const debugText = tile.view.getChildByName("DebugText") as Laya.GTextField;
            if (debugText) { debugText.visible = this.debugLabelsVisible; debugText.text = `#${tile.id}\nL${tile.layer} ${isBlocked ? "BLOCKED" : "FREE"}`; }
        }
    }

    private arrangeSlots(): Promise<void> {
        return Promise.all(this.slots.map((tile, index) => this.tween(tile.view, { x: index * 88, y: 0 }, 150, Laya.Ease.quadOut))).then((): void => undefined);
    }

    private createSlotBackplates(): void {
        const tray = this.node("SlotBackplates") as Laya.Sprite;
        for (let index = 0; index < this.level.slotCount; index++) { const image = new Laya.GImage(); image.src = "resources/images/ui/slot.png"; image.pos(index * 88, 0); image.size(82, 108); tray.addChild(image); }
    }

    private async finish(won: boolean): Promise<void> {
        if (this.finished) return;
        this.finished = true;
        Laya.timer.clear(this, this.tickLimit);
        this.freezeSeconds = 0; Laya.Tween.clearAll(this.freezeOverlay); this.freezeOverlay.visible = false;
        this.playSound(won ? "Victory" : "Failure");
        if (won) this.playMergeBurst(375, 520);
        if (won) Laya.timer.once(320, this, () => this.playSound("CoinReward"));
        const stars = won ? this.calculateStars() : 0;
        let earned = this.level.rewardCoins;
        this.busy = true; if (won) { if (this.context?.complete) earned = this.context.complete(stars); else MahjongSave.completeLevel(this.level.level, this.level.rewardCoins, stars); }
        const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/ResultPanel.lh");
        localizeTree(panel);
        const failureTitle = this.failureReason === "time" ? "TIME UP" : this.failureReason === "moves" ? "OUT OF MOVES" : "NO SPACE";
        const failureDetail = this.failureReason === "time" ? "TIME UP. TRY AGAIN" : this.failureReason === "moves" ? "OUT OF MOVES. TRY AGAIN" : "NO SPACE. TRY AGAIN";
        (panel.getChildByName("TitleText") as Laya.GTextField).text = won && this.context?.completeTitle ? this.context.completeTitle : uiText(won ? "LEVEL COMPLETE" : failureTitle);
        (panel.getChildByName("StarsText") as Laya.GTextField).text = won ? `${"★  ".repeat(stars)}${"☆  ".repeat(3 - stars)}`.trim() : "☆  ☆  ☆";
        (panel.getChildByName("DetailText") as Laya.GTextField).text = won ? (usesEnglishUi() ? `${earned} COINS EARNED` : `获得 ${earned} 金币`) : uiText(failureDetail);
        const primary = panel.getChildByName("PrimaryButton") as Laya.Sprite;
        const secondary = panel.getChildByName("SecondaryButton") as Laya.Sprite;
        const levelSelect = panel.getChildByName("LevelSelectButton") as Laya.Sprite;
        if (won) {
            (primary.getChildByName("Label") as Laya.GTextField).text = this.context?.primaryLabel ?? uiText(this.navigation.next ? "NEXT LEVEL" : "RESTART");
            (secondary.getChildByName("Label") as Laya.GTextField).text = uiText("LEVEL SELECT");
            levelSelect.visible = false; secondary.visible = !this.context?.hideSecondary;
            primary.on(Laya.Event.CLICK, null, () => { this.playSound("ButtonClick"); (this.context?.primaryAction ?? this.navigation.next ?? this.navigation.restart)(); });
            secondary.on(Laya.Event.CLICK, null, () => { this.playSound("ButtonClick"); this.navigation.levels(); });
        } else {
            const continueLabel = this.failureReason === "moves" ? "WATCH AD · +2 MOVES" : this.failureReason === "time" ? "WATCH AD · +30 SECONDS" : "WATCH AD · CONTINUE";
            (primary.getChildByName("Label") as Laya.GTextField).text = uiText(this.reviveUsed ? "NO MORE CONTINUES" : continueLabel);
            (secondary.getChildByName("Label") as Laya.GTextField).text = uiText("RESTART");
            primary.alpha = this.reviveUsed ? 0.55 : 1;
            primary.mouseEnabled = !this.reviveUsed;
            primary.on(Laya.Event.CLICK, null, () => { this.playSound("ButtonClick"); void this.revive(panel); });
            secondary.on(Laya.Event.CLICK, null, () => { this.playSound("ButtonClick"); this.navigation.restart(); });
            levelSelect.on(Laya.Event.CLICK, null, () => { this.playSound("ButtonClick"); this.navigation.levels(); });
        }
        this.contentRoot.addChild(panel); panel.alpha = 0; panel.scale(0.9, 0.9); await this.tween(panel, { alpha: 1, scaleX: 1, scaleY: 1 }, 220, Laya.Ease.backOut);
    }

    private async revive(panel: Laya.Sprite): Promise<void> {
        if (this.adPending || this.reviveUsed || panel.destroyed) return;
        this.adPending = true;
        const primary = panel.getChildByName("PrimaryButton") as Laya.Sprite, detail = panel.getChildByName("DetailText") as Laya.GTextField;
        primary.mouseEnabled = false; primary.alpha = 0.55; detail.text = uiText("LOADING REWARDED AD...");
        GamePlatform.hideBanner(); const rewarded = await GamePlatform.showRewardVideo(); GamePlatform.showBanner();
        this.adPending = false;
        if (this.scene.destroyed || panel.destroyed) return;
        if (!rewarded) { primary.mouseEnabled = true; primary.alpha = 1; detail.text = uiText("AD NOT AVAILABLE. TRY AGAIN"); return; }
        this.reviveUsed = true; this.lastSelected = null; this.playSound("MoveOut");
        const returned = this.failureReason === "slots" ? this.slots.splice(Math.max(0, this.slots.length - 3), 3) : [];
        if (this.failureReason === "moves") this.movesLeft += 2;
        if (this.failureReason === "time") this.timeLeft += 30;
        returned.forEach((tile) => { this.reparentAtSamePosition(tile.view, this.boardLayer); this.board.push(tile); });
        await Promise.all([this.arrangeSlots(), ...returned.map((tile) => this.tween(tile.view, { x: tile.x, y: tile.y, alpha: 1, scaleX: 1, scaleY: 1 }, 220, Laya.Ease.quadOut))]);
        this.failureReason = "slots"; this.finished = false;
        this.recalculateBlocked(); this.refreshLimit(); panel.destroy(); this.busy = false; this.showStatus("CONTINUE");
        if (this.level.limitType === "time") Laya.timer.loop(1000, this, this.tickLimit);
    }

    private async initializeDebugPanel(): Promise<void> {
        await Laya.loader.load("resources/prefabs/ui/DebugPanel.lh", Laya.Loader.HIERARCHY);
        const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/DebugPanel.lh");
        this.contentRoot.addChild(panel); Laya.Stat.show(0, 0);
        this.bindPanelButton(panel, "WinButton", () => void this.forceFinish(true));
        this.bindPanelButton(panel, "FailButton", () => void this.forceFinish(false));
        this.bindPanelButton(panel, "PrevButton", () => this.navigation.goTo(this.level.level - 1));
        this.bindPanelButton(panel, "NextButton", () => this.navigation.goTo(this.level.level + 1));
        this.bindPanelButton(panel, "CoinButton", () => { MahjongSave.addCoins(100); this.showStatus("金币 +100"); });
        this.bindPanelButton(panel, "StateButton", () => { this.debugLabelsVisible = !this.debugLabelsVisible; this.recalculateBlocked(); });
        this.bindPanelButton(panel, "SequenceButton", () => void this.debugCombo(["wan_1", "wan_2", "wan_3"]));
        this.bindPanelButton(panel, "SpecialButton", () => void this.debugCombo(["honor_zhong", "honor_fa", "honor_bai"]));
        this.bindPanelButton(panel, "AutoButton", () => void this.debugAutoSolve());
    }

    private bindPanelButton(panel: Laya.Sprite, name: string, action: () => void): void {
        const button = panel.getChildByName(name) as Laya.Sprite;
        button.mouseEnabled = true; button.hitArea = new Laya.Rectangle(0, 0, button.width, button.height);
        button.on(Laya.Event.CLICK, null, action);
    }

    private async forceFinish(won: boolean): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        [...this.board, ...this.slots, ...this.extra].forEach((tile) => this.recycleTile(tile.view));
        this.board.length = this.slots.length = this.extra.length = 0;
        await this.finish(won);
    }

    private async debugCombo(types: string[]): Promise<void> {
        if (this.busy) return;
        const targets = types.map((type) => this.board.find((tile) => tile.type === type));
        if (targets.some((tile) => !tile)) { this.showStatus("当前关卡缺少测试牌"); return; }
        this.busy = true;
        for (const tile of targets as TileState[]) {
            this.board.splice(this.board.indexOf(tile), 1);
            this.slots.push(tile);
            this.reparentAtSamePosition(tile.view, this.slotLayer);
        }
        await this.arrangeSlots();
        await this.resolveMatches();
        this.recalculateBlocked(); this.busy = false;
    }

    private async debugAutoSolve(): Promise<void> {
        if (this.debugAutoRunning || this.busy) return;
        this.debugAutoRunning = true;
        while (this.board.length) {
            this.recalculateBlocked();
            const groups = new Map<string, TileState[]>();
            this.board.filter((tile) => !this.blocked.has(tile.id)).forEach((tile) => groups.set(tile.type, [...(groups.get(tile.type) ?? []), tile]));
            const group = [...groups.values()].find((tiles) => tiles.length >= 3);
            if (!group) { this.showStatus("自动通关：当前无可消组"); break; }
            for (const tile of group.slice(0, 3)) await this.selectTile(tile);
        }
        this.debugAutoRunning = false;
    }

    private refreshScore(): void { this.scoreText.text = String(this.score); }
    private refreshLimit(): void { this.limitText.text = this.level.limitType === "moves" ? `${uiText("MOVES")} ${this.movesLeft}` : `${uiText("TIME")} ${this.formatTime(this.timeLeft)}`; }
    private formatTime(seconds: number): string { const safe = Math.max(0, Math.floor(seconds)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`; }
    private tickLimit(): void {
        if (this.scene.destroyed) { Laya.timer.clear(this, this.tickLimit); return; }
        if (this.finished || this.adPending || GuideSystem.isBlockingGame()) return;
        if (this.freezeSeconds > 0) {
            this.freezeSeconds--;
            if (this.freezeSeconds === 0) Laya.Tween.to(this.freezeOverlay, { alpha: 0 }, 320, Laya.Ease.sineIn, Laya.Handler.create(null, () => { this.freezeOverlay.visible = false; }));
            return;
        }
        this.timeLeft = Math.max(0, this.timeLeft - 1); this.refreshLimit();
        if (this.timeLeft === 0) { this.failureReason = "time"; void this.finish(false); }
    }
    private calculateStars(): number { const scores = this.level.starScores ?? [0, 800, 1200]; return this.score >= scores[2] ? 3 : this.score >= scores[1] ? 2 : 1; }
    private useProp(type: keyof SaveData["props"]): boolean {
        if (this.propCounts[type] <= 0) return false;
        if (this.freePropCounts[type] > 0) this.freePropCounts[type]--;
        else if (!MahjongSave.useProp(type)) return false;
        this.propCounts[type]--; MahjongSave.recordProp(type); return true;
    }
    private playMergeBurst(globalX: number, globalY: number): void {
        const point = this.effectLayer.globalToLocal(new Laya.Point(globalX, globalY));
        const effect = this.mergeEffectTemplate;
        Laya.timer.clearAll(effect);
        effect.visible = true;
        effect.pos(point.x - effect.width / 2, point.y - effect.height / 2);
        effect.zOrder = 100000;
        for (let index = 0; index < effect.numChildren; index++) {
            const spark = effect.getChildAt(index) as Laya.Sprite;
            Laya.Tween.clearAll(spark);
            const { x: targetX, y: targetY } = this.mergeSparkTargets[index];
            spark.pos(effect.width / 2 - spark.width / 2, effect.height / 2 - spark.height / 2);
            spark.alpha = 1;
            spark.scale(0.55, 0.55);
            Laya.Tween.to(spark, { x: targetX, y: targetY, alpha: 0, scaleX: 1.25, scaleY: 1.25 }, 300, Laya.Ease.quadOut);
        }
        Laya.timer.once(340, effect, () => { effect.visible = false; });
    }
    private resetCombo(): void { this.combo = 0; }
    private refreshPropLabels(): void { for (const type of ["undo", "shuffle", "move", "hint", "freeze"] as Array<keyof SaveData["props"]>) { const pascal = `${type[0].toUpperCase()}${type.slice(1)}`; const count = this.propCounts[type]; const text = this.node(`${pascal}Count`) as Laya.GTextField; if (text) { text.text = `×${count}`; text.visible = count > 0; } const icon = this.node(`${pascal}AdIcon`) as Laya.GImage; if (icon) { icon.visible = count <= 0 && !this.propAdClaimed; icon.alpha = 1; } const button = this.node(`${pascal}Button`) as Laya.Sprite; if (button) button.mouseEnabled = count > 0 || !this.propAdClaimed; } }
    private showStatus(text: string): void { this.statusText.text = uiText(text); this.statusText.alpha = 1; this.statusText.scale(0.75, 0.75); Laya.Tween.to(this.statusText, { scaleX: 1, scaleY: 1 }, 150, Laya.Ease.backOut, Laya.Handler.create(null, () => Laya.Tween.to(this.statusText, { alpha: 0 }, 500, null, null, 450))); }
    private bindButton(name: string, action: () => void): void { const button = this.node(name) as Laya.Sprite; if (!button) throw new Error(`Button is missing: ${name}`); button.mouseEnabled = true; button.mouseThrough = false; button.hitArea = new Laya.Rectangle(0, 0, button.width, button.height); button.on(Laya.Event.CLICK, null, () => { this.playSound("ButtonClick"); action(); }); }
    private playSound(name: string): void { const sound = this.node(name) as Laya.SoundNode; if (!sound) throw new Error(`Game audio binding is missing: ${name}`); sound.play(); }
    private node(name: string): Laya.Node | null { return this.contentRoot?.getChildByName(name) ?? this.scene.getChildByName(name); }
    private recycleTile(view: Laya.Sprite): void { Laya.Tween.clearAll(view); view.offAll(); view.removeSelf(); Laya.Pool.recover("mahjong-tile", view); }
    private reparentAtSamePosition(view: Laya.Sprite, parent: Laya.Sprite): void { const point = view.localToGlobal(new Laya.Point(0, 0)); parent.addChild(view); const local = parent.globalToLocal(point); view.pos(local.x, local.y); }
    private tween(target: Laya.Sprite, props: Record<string, number>, duration: number, ease?: Laya.EaseFunction): Promise<void> { return new Promise((resolve) => Laya.Tween.to(target, props, duration, ease, Laya.Handler.create(null, resolve))); }
    private requireBindings(): void { if (!this.contentRoot) throw new Error("Game.ls ContentRoot binding is missing"); for (const node of [this.boardLayer, this.effectLayer, this.mergeEffectTemplate, this.slotLayer, this.extraLayer, this.statusText, this.scoreText, this.limitText, this.freezeOverlay]) if (!node) throw new Error("Game.ls node binding is missing"); for (const name of ["GameBgm", "ButtonClick", "TileClick", "Undo", "Hint", "Shuffle", "MoveOut", "Freeze", "CoinReward", "Victory", "Failure"]) if (!this.node(name)) throw new Error(`Game.ls audio binding is missing: ${name}`); }
}
