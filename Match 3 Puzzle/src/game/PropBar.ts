import { Board } from "./Board";
import { GameConfig } from "./GameConfig";
import { LevelData, LevelProp, PropType } from "./LevelData";
import { GameSession } from "./GameSession";
import { GameSave } from "./GameSave";

interface PropView {
    config: LevelProp;
    button: Laya.Sprite;
    selected: boolean;
    rewardClaimed: boolean;
}

export class PropBar {
    private readonly views: PropView[] = [];
    private adPending = false;

    public constructor(
        private readonly root: Laya.Sprite,
        private readonly board: Board,
        private readonly session: GameSession,
        private readonly level: LevelData,
        private readonly onSelected?: (type: PropType) => void,
        private readonly onUsed?: (type: PropType) => void,
    ) {}

    public async initialize(): Promise<void> {
        const configs = this.level.props?.filter((prop) => prop.count > 0) ?? [];
        this.root.visible = configs.length > 0;
        if (!this.root.visible) return;
        await Laya.loader.load(GameConfig.propPrefabs.hammer, Laya.Loader.HIERARCHY);
        const gap = 24;
        const totalWidth = configs.length * 180 + (configs.length - 1) * gap;
        for (let index = 0; index < configs.length; index++) {
            const config = configs[index];
            const button = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.propPrefabs.hammer);
            const view: PropView = { config, button, selected: false, rewardClaimed: false };
            button.pos((this.root.width - totalWidth) / 2 + index * (180 + gap), 0);
            button.on(Laya.Event.CLICK, this, () => this.use(view));
            this.root.addChild(button);
            this.views.push(view);
            this.updateView(view);
        }
    }

    private use(view: PropView): void {
        if (view.config.count <= 0) {
            if (!view.rewardClaimed) void this.rewardFromAd(view);
            return;
        }
        if (view.config.type === "hammer" || view.config.type === "magic") {
            const next = !view.selected;
            if (!this.board.setTargetedProp(next ? view.config.type : null, () => this.consume(view))) return;
            for (const item of this.views) item.selected = item === view && next;
            this.updateAll();
            if (next) this.onSelected?.(view.config.type);
        } else if (view.config.type === "refresh") {
            this.clearSelection();
            this.board.useRefresh(() => this.consume(view));
        } else if (this.session.enableInfiniteMoves()) {
            this.clearSelection();
            this.consume(view);
        }
    }

    private consume(view: PropView): void {
        view.config.count--;
        view.selected = false;
        this.updateView(view);
        this.onUsed?.(view.config.type);
    }

    private async rewardFromAd(view: PropView): Promise<void> {
        if (this.adPending) return;
        this.adPending = true;
        view.button.mouseEnabled = false;
        (view.button.getChildByName("AdIcon") as Laya.GImage).alpha = 0.45;
        GameSave.hideBanner();
        const rewarded = await GameSave.showRewardVideo();
        GameSave.showBanner();
        this.adPending = false;
        if (view.button.destroyed) return;
        view.button.mouseEnabled = true;
        if (rewarded) {
            view.rewardClaimed = true;
            view.config.count++;
            GameSave.vibrate(35);
        }
        this.updateView(view);
    }

    public guidePoint(type: PropType): { x: number; y: number } | null {
        const view = this.views.find((item) => item.config.type === type);
        return view ? {
            x: this.root.x + view.button.x + view.button.width / 2,
            y: this.root.y + view.button.y + view.button.height / 2,
        } : null;
    }

    private clearSelection(): void {
        this.board.setTargetedProp(null, () => {});
        for (const view of this.views) view.selected = false;
        this.updateAll();
    }

    private updateAll(): void {
        for (const view of this.views) this.updateView(view);
    }

    private updateView(view: PropView): void {
        const names: Record<PropType, string> = { hammer: "HAMMER", magic: "MAGIC", refresh: "REFRESH", infinite: "INFINITE" };
        const available = view.config.count > 0;
        for (const type of Object.keys(names) as PropType[]) {
            const icon = view.button.getChildByName(`Icon${names[type][0]}${names[type].slice(1).toLowerCase()}`) as Laya.GImage;
            icon.visible = type === view.config.type;
            icon.color = available ? "#FFFFFF" : "#707070";
        }
        const nameText = view.button.getChildByName("NameText") as Laya.GTextField;
        nameText.text = names[view.config.type];
        nameText.color = available ? "#FFFFFF" : "#888888";
        (view.button.getChildByName("ButtonImage") as Laya.GImage).color = available ? "#FFFFFF" : "#686868";
        const countText = view.button.getChildByName("CountText") as Laya.GTextField;
        countText.text = `x${view.config.count}`;
        countText.visible = available;
        const adIcon = view.button.getChildByName("AdIcon") as Laya.GImage;
        adIcon.visible = !available && !view.rewardClaimed;
        adIcon.color = "#FFFFFF";
        adIcon.alpha = 1;
        view.button.mouseEnabled = available || !view.rewardClaimed;
        (view.button.getChildByName("SelectedGlow") as Laya.GImage).alpha = view.selected ? 1 : 0;
        view.button.alpha = 1;
    }
}
