import { Board } from "./Board";
import { GameSession } from "./GameSession";
import { SpecialType } from "./Gem";
import { LevelData } from "./LevelData";
import { GameSave } from "./GameSave";

export class DebugPanel {
    private readonly panel = new Laya.Sprite();
    private readonly status = new Laya.GTextField();
    private readonly levelInput = new Laya.GTextInput();
    private frames = 0;
    private fps = 0;
    private lastSample = Date.now();

    public constructor(private readonly scene: Laya.Scene, private readonly level: LevelData,
        private readonly board: Board, private readonly session: GameSession,
        private readonly jumpToLevel: (level: number) => void) {}

    public initialize(): void {
        const toggle = this.button("调试", 16, 92, 118, 64);
        toggle.name = "DebugToggle";
        toggle.zOrder = 10000;
        this.scene.addChild(toggle);
        this.panel.name = "DebugPanel";
        this.panel.pos(16, 170);
        this.panel.size(420, 790);
        this.panel.zOrder = 10000;
        this.panel.graphics.drawRoundRect(0, 0, 420, 790, 20, 20, 20, 20, "#081226EE", "#55D6FF", 3);
        this.panel.visible = false;
        this.scene.addChild(this.panel);

        const title = this.text("调试面板（仅开发模式）", 22, 16, 376, 46, 24, "#72E7FF");
        this.panel.addChild(title);
        const inputBackground = new Laya.Sprite();
        inputBackground.pos(22, 72);
        inputBackground.size(176, 56);
        inputBackground.graphics.drawRoundRect(0, 0, 176, 56, 10, 10, 10, 10, "#15213A", "#52698F", 2);
        this.panel.addChild(inputBackground);
        this.levelInput.text = String(this.level.level);
        this.levelInput.fontSize = 24;
        this.levelInput.color = "#FFFFFF";
        this.levelInput.restrict = "0-9";
        this.levelInput.pos(22, 72);
        this.levelInput.size(176, 56);
        this.panel.addChild(this.levelInput);
        const jump = this.button("跳转关卡", 214, 72, 184, 56);
        this.panel.addChild(jump);

        const actions: Array<[string, () => void]> = [
            ["+10 步", () => this.session.debugAddMoves(10)],
            ["立即胜利", () => this.session.debugWin()],
            ["立即失败", () => this.session.debugLose()],
            ["洗牌", () => { this.board.debugShuffle(); }],
            ["生成火箭", () => { this.board.debugCreateSpecial(Math.random() < .5 ? SpecialType.RocketHorizontal : SpecialType.RocketVertical); }],
            ["生成炸弹", () => { this.board.debugCreateSpecial(SpecialType.Bomb); }],
            ["生成彩虹", () => { this.board.debugCreateSpecial(SpecialType.Rainbow); }],
            ["广告奖励", () => GameSave.debugResolveRewardVideo(true)],
            ["广告失败", () => GameSave.debugResolveRewardVideo(false)],
        ];
        actions.forEach(([label, action], index) => {
            const button = this.button(label, 22 + index % 2 * 192, 148 + Math.floor(index / 2) * 70, 176, 56);
            button.on(Laya.Event.CLICK, this, action);
            this.panel.addChild(button);
        });
        this.status.pos(22, 520);
        this.status.size(376, 240);
        this.status.fontSize = 22;
        this.status.leading = 8;
        this.status.color = "#E8F4FF";
        this.status.wordWrap = true;
        this.panel.addChild(this.status);
        toggle.on(Laya.Event.CLICK, this, () => { this.panel.visible = !this.panel.visible; this.refreshStatus(); });
        jump.on(Laya.Event.CLICK, this, () => {
            const target = Math.max(1, Math.floor(Number(this.levelInput.text) || 1));
            this.jumpToLevel(target);
        });
        Laya.timer.frameLoop(1, this, this.tick);
    }

    private tick(): void {
        this.frames++;
        const now = Date.now(), elapsed = now - this.lastSample;
        if (elapsed < 500) return;
        this.fps = Math.round(this.frames * 1000 / elapsed);
        this.frames = 0;
        this.lastSample = now;
        if (this.panel.visible) this.refreshStatus();
    }

    private refreshStatus(): void {
        this.status.text = [
            `关卡  ${this.level.level}  ·  帧率  ${this.fps}`,
            `可消除移动  ${this.board.countPossibleMoves()}`,
            ...this.session.debugStatus(),
        ].join("\n");
    }

    private button(label: string, x: number, y: number, width: number, height: number): Laya.Sprite {
        const button = new Laya.Sprite();
        button.pos(x, y);
        button.size(width, height);
        button.mouseEnabled = true;
        button.graphics.drawRoundRect(0, 0, width, height, 12, 12, 12, 12, "#24395F", "#79DBFF", 2);
        button.addChild(this.text(label, 0, 0, width, height, 20, "#FFFFFF"));
        return button;
    }

    private text(value: string, x: number, y: number, width: number, height: number,
        fontSize: number, color: string): Laya.GTextField {
        const text = new Laya.GTextField();
        text.text = value;
        text.pos(x, y);
        text.size(width, height);
        text.fontSize = fontSize;
        text.color = color;
        text.bold = true;
        text.align = "center";
        text.valign = "middle";
        text.mouseEnabled = false;
        return text;
    }
}
