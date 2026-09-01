import { MahjongSave } from "./MahjongSave";
import { usesEnglishUi } from "../platform/UiText";

interface GuideStep {
    id: string; scene: "game" | "home"; target: string; event: string; value?: string;
    repeat?: number; pauseAfter?: boolean; messageZh: string; messageEn: string;
}
interface GuideConfig { version: number; steps: GuideStep[]; }
type TargetResolver = (target: string, value?: string) => Laya.Sprite | null;

export class GuideSystem {
    private static config: GuideConfig = { version: 0, steps: [] };
    private static scene: Laya.Scene | null = null;
    private static sceneType: GuideStep["scene"] | null = null;
    private static resolveTarget: TargetResolver | null = null;
    private static overlay: Laya.Sprite | null = null;
    private static renderGeneration = 0;

    public static async initialize(): Promise<void> {
        const resource = await Laya.loader.load("resources/config/guide.json", Laya.Loader.JSON) as Laya.TextResource;
        const data = resource.data as GuideConfig;
        this.config = { version: Math.max(1, Math.floor(data.version)), steps: (data.steps ?? []).filter(step => !!step.id && !!step.scene && !!step.target && !!step.event) };
        if (MahjongSave.guideVersion() !== this.config.version) MahjongSave.resetGuide(this.config.version);
    }
    public static needsGameGuide(): boolean { return this.current()?.scene === "game"; }
    public static isBlockingGame(): boolean { return this.sceneType === "game" && !!this.overlay && !this.overlay.destroyed; }
    public static async attach(sceneType: GuideStep["scene"], scene: Laya.Scene, resolver: TargetResolver): Promise<void> {
        this.detach(); this.sceneType = sceneType; this.scene = scene; this.resolveTarget = resolver; await this.show();
    }
    public static detach(): void { this.renderGeneration++; this.overlay?.destroy(); this.overlay = null; this.scene = null; this.sceneType = null; this.resolveTarget = null; }
    public static trigger(event: string, value?: string): boolean {
        const step = this.current();
        if (!step || step.event !== event || (step.value && step.value !== value)) return false;
        const progress = MahjongSave.guideProgress() + 1, repeat = Math.max(1, step.repeat ?? 1);
        this.overlay?.destroy(); this.overlay = null;
        if (progress < repeat) MahjongSave.setGuideState(MahjongSave.guideStep(), progress, this.config.version);
        else MahjongSave.setGuideState(MahjongSave.guideStep() + 1, 0, this.config.version);
        if (!step.pauseAfter) Laya.timer.once(80, this, () => void this.show());
        return true;
    }
    public static async show(): Promise<void> {
        const generation = ++this.renderGeneration, step = this.current(), scene = this.scene, resolver = this.resolveTarget;
        this.overlay?.destroy(); this.overlay = null;
        if (!step || !scene || scene.destroyed || step.scene !== this.sceneType || !resolver) return;
        const target = resolver(step.target, step.value); if (!target || target.destroyed || !target.visible) return;
        await Laya.loader.load("resources/prefabs/ui/GuideOverlay.lh", Laya.Loader.HIERARCHY);
        if (generation !== this.renderGeneration || scene.destroyed) return;
        const overlay = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/GuideOverlay.lh");
        if (generation !== this.renderGeneration || scene.destroyed) { overlay.destroy(); return; }
        const root = scene.getChildByName("ContentRoot") as Laya.Sprite;
        const topLeft = root.globalToLocal(target.localToGlobal(new Laya.Point(0, 0)));
        const bottomRight = root.globalToLocal(target.localToGlobal(new Laya.Point(target.width, target.height)));
        const padding = 12, x = Math.max(0, topLeft.x - padding), y = Math.max(0, topLeft.y - padding);
        const right = Math.min(root.width, bottomRight.x + padding), bottom = Math.min(root.height, bottomRight.y + padding);
        this.addBlocker(overlay, 0, 0, root.width, y);
        this.addBlocker(overlay, 0, y, x, bottom - y);
        this.addBlocker(overlay, right, y, root.width - right, bottom - y);
        this.addBlocker(overlay, 0, bottom, root.width, root.height - bottom);
        const hand = overlay.getChildByName("HandImage") as Laya.Sprite;
        hand.pos(Math.max(10, Math.min(root.width - hand.width - 10, x + (right - x - hand.width) / 2)), Math.max(8, y - hand.height + 18));
        const message = overlay.getChildByName("MessagePanel") as Laya.Sprite;
        message.x = Math.max(20, Math.min(root.width - message.width - 20, (x + right - message.width) / 2));
        message.y = bottom + message.height + 25 < root.height ? bottom + 25 : Math.max(25, y - message.height - 25);
        (message.getChildByName("MessageText") as Laya.GTextField).text = usesEnglishUi() ? step.messageEn : step.messageZh;
        overlay.zOrder = 900000; overlay.mouseEnabled = true; overlay.mouseThrough = true;
        hand.mouseEnabled = false; hand.mouseThrough = true; message.mouseEnabled = false; message.mouseThrough = true;
        root.addChild(overlay); this.overlay = overlay;
        const handY = hand.y, animate = (): void => { hand.y = handY; Laya.Tween.to(hand, { y: handY - 16 }, 420, Laya.Ease.sineOut, Laya.Handler.create(null, () => Laya.Tween.to(hand, { y: handY }, 420, Laya.Ease.sineIn))); };
        animate(); Laya.timer.loop(950, overlay, animate);
    }
    private static current(): GuideStep | undefined { return MahjongSave.guideVersion() === this.config.version ? this.config.steps[MahjongSave.guideStep()] : undefined; }
    private static addBlocker(parent: Laya.Sprite, x: number, y: number, width: number, height: number): void {
        if (width <= 0 || height <= 0) return;
        const blocker = new Laya.Sprite(); blocker.pos(x, y); blocker.size(width, height); blocker.graphics.drawRect(0, 0, width, height, "#14251F"); blocker.alpha = 0.62;
        blocker.mouseEnabled = true; blocker.mouseThrough = false; blocker.hitArea = new Laya.Rectangle(0, 0, width, height); parent.addChildAt(blocker, 0);
    }
}
