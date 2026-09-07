import { Board } from "./Board";
import { GameConfig } from "./GameConfig";
import { GameSave } from "./GameSave";
import { LevelData, PropType } from "./LevelData";
import { PropBar } from "./PropBar";

interface Point { x: number; y: number; }

export class FirstPlayGuide {
    private stage: "swap" | "prop" | "target" = "swap";
    private from: Point = { x: 0, y: 0 };
    private to: Point = { x: 0, y: 0 };

    private constructor(
        private readonly root: Laya.Sprite,
        private readonly blockers: Laya.GImage[],
        private readonly hand: Laya.GImage,
        private readonly board: Board,
        private readonly propBar: PropBar,
    ) {}

    public static async create(scene: Laya.Scene, board: Board, propBar: PropBar,
        level: LevelData): Promise<FirstPlayGuide | null> {
        if (level.level !== 1 || GameSave.tutorialCompleted()) return null;
        await Laya.loader.load(GameConfig.firstPlayGuidePrefab, Laya.Loader.HIERARCHY);
        const root = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.firstPlayGuidePrefab);
        const blockers = ["MaskTop", "MaskBottom", "MaskLeft", "MaskRight"]
            .map((name) => root.getChildByName(name) as Laya.GImage);
        const hand = root.getChildByName("Hand") as Laya.GImage;
        if (!hand || blockers.some((item) => !item)) throw new Error("First-play guide prefab bindings are missing.");
        for (const blocker of blockers) blocker.mouseEnabled = true;
        hand.mouseEnabled = false;
        scene.addChild(root);
        const guide = new FirstPlayGuide(root, blockers, hand, board, propBar);
        board.setGuideActive(true);
        guide.showSwap();
        return guide;
    }

    public onMoveUsed(): void {
        if (this.stage !== "swap") return;
        this.stage = "prop";
        this.coverAll();
        this.stopHand();
        Laya.timer.once(350, this, this.showProp);
    }

    public onPropSelected(type: PropType): void {
        if (this.stage !== "prop" || type !== "hammer") return;
        this.stage = "target";
        const target = this.board.guideGemPoint();
        if (target) this.pointAt(target);
        else this.complete();
    }

    public onPropUsed(type: PropType): void {
        if (this.stage === "target" && type === "hammer") this.complete();
    }

    private showSwap(): void {
        const move = this.board.guideMovePoints();
        if (!move) return this.complete();
        this.openSquare(move, GameConfig.tileSize + 28);
        this.moveBetween(move[0], move[1]);
    }

    private showProp(): void {
        if (this.stage !== "prop" || this.root.destroyed) return;
        const target = this.propBar.guidePoint("hammer");
        if (target) this.pointAt(target);
        else this.complete();
    }

    private pointAt(target: Point): void {
        this.openSquare([target], 184);
        this.moveBetween({ x: target.x + 28, y: target.y + 38 }, target);
    }

    private openSquare(points: Point[], padding: number): void {
        const minX = Math.min(...points.map((point) => point.x));
        const maxX = Math.max(...points.map((point) => point.x));
        const minY = Math.min(...points.map((point) => point.y));
        const maxY = Math.max(...points.map((point) => point.y));
        const side = Math.max(160, maxX - minX + padding, maxY - minY + padding);
        const left = Math.max(0, Math.min(this.root.width - side, (minX + maxX - side) / 2));
        const top = Math.max(0, Math.min(this.root.height - side, (minY + maxY - side) / 2));
        const right = left + side;
        const bottom = top + side;
        this.setBlocker(this.blockers[0], 0, 0, this.root.width, top);
        this.setBlocker(this.blockers[1], 0, bottom, this.root.width, this.root.height - bottom);
        this.setBlocker(this.blockers[2], 0, top, left, side);
        this.setBlocker(this.blockers[3], right, top, this.root.width - right, side);
    }

    private coverAll(): void {
        this.setBlocker(this.blockers[0], 0, 0, this.root.width, this.root.height);
        for (let index = 1; index < this.blockers.length; index++) this.setBlocker(this.blockers[index], 0, 0, 0, 0);
    }

    private setBlocker(view: Laya.GImage, x: number, y: number, width: number, height: number): void {
        view.pos(Math.floor(x), Math.floor(y));
        view.size(Math.ceil(width), Math.ceil(height));
    }

    private moveBetween(from: Point, to: Point): void {
        this.stopHand();
        this.from = from;
        this.to = to;
        this.hand.visible = true;
        this.animateHand();
    }

    private animateHand(): void {
        if (this.root.destroyed) return;
        this.hand.pos(this.from.x, this.from.y);
        this.hand.alpha = 1;
        Laya.Tween.to(this.hand, { x: this.to.x, y: this.to.y }, 620, Laya.Ease.sineInOut,
            Laya.Handler.create(this, () => Laya.Tween.to(this.hand, { alpha: 0 }, 150, Laya.Ease.quadOut,
                Laya.Handler.create(this, () => Laya.timer.once(260, this, this.animateHand)))));
    }

    private stopHand(): void {
        Laya.timer.clear(this, this.animateHand);
        Laya.timer.clear(this, this.showProp);
        Laya.Tween.clearAll(this.hand);
        this.hand.visible = false;
    }

    private complete(): void {
        GameSave.setTutorialCompleted();
        this.board.setGuideActive(false);
        this.stopHand();
        this.root.destroy();
    }
}
