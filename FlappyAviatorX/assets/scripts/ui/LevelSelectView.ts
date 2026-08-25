import { _decorator, Color, Component, director, instantiate, Label, Node, Sprite, sys } from 'cc';
import { LevelManager } from '../core/LevelManager';
const { ccclass, property } = _decorator;

@ccclass('LevelSelectView')
export class LevelSelectView extends Component {
    @property(Node) levelContainer: Node | null = null;
    @property(Node) levelButtonTemplate: Node | null = null;
    @property(Node) backButton: Node | null = null;
    @property(Node) prevButton: Node | null = null;
    @property(Node) nextButton: Node | null = null;
    @property(Node) pageLabel: Node | null = null;
    private page = 0;
    private levels: Awaited<ReturnType<typeof LevelManager.loadAll>> = [];

    onLoad() {
        this.backButton?.on(Node.EventType.TOUCH_END, () => director.loadScene('Game'));
        this.prevButton?.on(Node.EventType.TOUCH_END, () => { if (this.page > 0) { this.page--; this.render(); } });
        this.nextButton?.on(Node.EventType.TOUCH_END, () => { if ((this.page + 1) * 6 < this.levels.length) { this.page++; this.render(); } });
        if (this.levelButtonTemplate) this.levelButtonTemplate.active = false;
        LevelManager.loadAll().then(levels => {
            if (!this.node.isValid || !this.levelContainer || !this.levelButtonTemplate) return;
            this.levels = levels;
            this.render();
        });
    }

    private render() {
        if (!this.levelContainer || !this.levelButtonTemplate) return;
        for (const child of [...this.levelContainer.children]) if (child !== this.levelButtonTemplate) child.destroy();
        this.levels.slice(this.page * 6, this.page * 6 + 6).forEach((level, index) => {
                const button = instantiate(this.levelButtonTemplate!);
                button.name = `Level${level.id}`;
                button.parent = this.levelContainer;
                button.active = true;
                button.setPosition(index % 2 ? 158 : -158, 250 - Math.floor(index / 2) * 120);
                const unlocked = LevelManager.isUnlocked(level.id);
                const selected = level.id === LevelManager.selectedId;
                const rule = level.pipePattern.toUpperCase();
                const text = unlocked
                    ? `${selected ? '▶ ' : ''}MISSION ${level.id}  ★${level.targetScore}\n${level.theme.toUpperCase()} · ${rule} · PIPE ${level.pipeSpeed} · AIR ${level.flapVelocity}`
                    : `LOCKED  ${level.id}`;
                const label = button.getChildByName('Label')?.getComponent(Label);
                if (label) { label.string = text; label.fontSize = unlocked ? 17 : 24; label.lineHeight = 24; label.enableWrapText = true; }
                const sprite = button.getComponent(Sprite);
                if (sprite) sprite.color = !unlocked ? new Color(90, 98, 110) : selected ? new Color(255, 222, 112) : Color.WHITE;
                button.on(Node.EventType.TOUCH_END, () => {
                    if (!unlocked) return;
                    LevelManager.selectedId = level.id;
                    sys.localStorage.setItem('flappy-autostart', '1');
                    director.loadScene('Game');
                });
        });
        const pages = Math.max(1, Math.ceil(this.levels.length / 6));
        const page = this.pageLabel?.getComponent(Label); if (page) page.string = `${this.page + 1} / ${pages}`;
        const tint = (node: Node | null, enabled: boolean) => { const sprite = node?.getComponent(Sprite); if (sprite) sprite.color = enabled ? Color.WHITE : new Color(90, 98, 110); };
        tint(this.prevButton, this.page > 0); tint(this.nextButton, this.page + 1 < pages);
    }
}
