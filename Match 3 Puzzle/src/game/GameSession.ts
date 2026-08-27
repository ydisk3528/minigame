import { LevelData, LevelGoal } from "./LevelData";
import { GameAudio } from "./GameAudio";
import { ObstacleType } from "./Obstacle";
import { GameSave } from "./GameSave";
import { ThemeConfig } from "./ThemeConfig";

export class GameSession {
    private readonly progress: number[];
    private moves: number;
    private score = 0;
    private ended = false;
    private infiniteMoves = false;
    private continued = false;
    private adPending = false;

    public constructor(
        private readonly scene: Laya.Scene,
        private readonly level: LevelData,
        private readonly levelText: Laya.GTextField,
        private readonly scoreText: Laya.GTextField,
        private readonly movesText: Laya.GTextField,
        private readonly goalDisplays: Laya.Sprite[],
        private readonly audio: GameAudio,
        private readonly onRestart: () => void,
        private readonly onNext: (() => void) | null,
        private readonly onLevelSelect: () => void,
        private readonly onContinued: () => void,
        private readonly onBeforeWin: () => Promise<void>,
        private readonly onCompleted: (score: number) => void,
    ) {
        this.moves = level.moveLimit;
        this.progress = level.goals.map(() => 0);
    }

    public async initialize(): Promise<void> {
        await Promise.all([
            Laya.loader.load("resources/prefabs/ui/ResultPanel.lh", Laya.Loader.HIERARCHY),
            Laya.loader.load("resources/prefabs/ui/LevelCompletePanel.lh", Laya.Loader.HIERARCHY),
            Laya.loader.load("resources/prefabs/effects/MatchBurst.lh", Laya.Loader.HIERARCHY),
        ]);
        this.createGameControls();
        this.updateHud();
    }

    public useMove(): void {
        if (this.infiniteMoves) return;
        this.moves = Math.max(0, this.moves - 1);
        this.updateHud();
    }

    public enableInfiniteMoves(): boolean {
        if (this.ended || this.infiniteMoves) return false;
        this.infiniteMoves = true;
        this.updateHud();
        return true;
    }

    public debugAddMoves(count: number): void {
        if (this.ended || this.infiniteMoves) return;
        this.moves += Math.max(0, Math.floor(count));
        this.updateHud();
    }

    public debugWin(): void {
        if (this.ended) return;
        this.level.goals.forEach((goal, index) => { this.progress[index] = goal.count; });
        this.updateHud();
        this.finishTurn();
    }

    public debugLose(): void {
        if (this.ended) return;
        this.moves = 0;
        this.updateHud();
        this.finishTurn();
    }

    public debugStatus(): string[] {
        return [
            `剩余步数  ${this.infiniteMoves ? "∞" : this.moves}  ·  分数  ${this.score}`,
            ...this.level.goals.map((goal, index) => this.debugGoalLabel(goal, index)),
        ];
    }

    private debugGoalLabel(goal: LevelGoal, index: number): string {
        const value = Math.min(goal.count, this.progress[index]);
        if (goal.type === "collectGem") return `收集元素 ${Number(goal.gemType ?? 0) + 1}  ${value}/${goal.count}`;
        if (goal.type === "breakIce") return `破坏冰块  ${value}/${goal.count}`;
        if (goal.type === "breakCrate") return `破坏木箱  ${value}/${goal.count}`;
        return `目标分数  ${value}/${goal.count}`;
    }

    public recordCleared(types: number[], specialAttack: boolean): void {
        const previous = this.progress.join(",");
        this.score += types.length * (specialAttack ? 160 : 100);
        for (let index = 0; index < this.level.goals.length; index++) {
            const goal = this.level.goals[index];
            if (goal.type === "collectGem") {
                this.progress[index] += types.filter((type) => type === goal.gemType).length;
            } else if (goal.type === "score") {
                this.progress[index] = this.score;
            }
        }
        this.updateHud();
        if (this.progress.join(",") !== previous) this.pulseGoals(previous);
    }

    public recordObstacleDestroyed(type: ObstacleType): void {
        const previous = this.progress.join(",");
        for (let index = 0; index < this.level.goals.length; index++) {
            const goal = this.level.goals[index];
            if ((goal.type === "breakIce" && type === ObstacleType.Ice)
                || (goal.type === "breakCrate" && type === ObstacleType.Crate)) {
                this.progress[index]++;
            }
        }
        this.updateHud();
        if (this.progress.join(",") !== previous) this.pulseGoals(previous);
    }

    private pulseGoals(previous: string): void {
        const values = previous.split(",").map(Number);
        this.goalDisplays.forEach((display, index) => {
            if (values[index] === this.progress[index]) return;
            Laya.Tween.clearAll(display);
            display.scale(1, 1);
            Laya.Tween.to(display, { scaleX: 1.1, scaleY: 1.1 }, 100, Laya.Ease.backOut,
                Laya.Handler.create(null, () => Laya.Tween.to(display,
                    { scaleX: 1, scaleY: 1 }, 150, Laya.Ease.backOut)));
        });
    }

    public finishTurn(): boolean {
        if (this.ended) return true;
        const won = this.level.goals.every((goal, index) => this.progress[index] >= goal.count);
        if (!won && (this.infiniteMoves || this.moves > 0)) return false;
        this.ended = true;
        void this.showResult(won);
        return true;
    }

    private updateHud(): void {
        this.levelText.text = `LEVEL ${this.level.level}`;
        this.scoreText.text = `SCORE ${this.score}`;
        this.movesText.text = this.infiniteMoves ? "MOVES ∞" : `MOVES ${this.moves}`;
        this.level.goals.forEach((goal, index) => {
            const display = this.goalDisplays[index];
            if (!display) return;
            const iconName = goal.type === "collectGem" ? `IconGem${goal.gemType ?? 0}`
                : goal.type === "breakIce" ? "IconIce" : goal.type === "breakCrate" ? "IconCrate" : "IconScore";
            for (let childIndex = 0; childIndex < display.numChildren; childIndex++) {
                const child = display.getChildAt(childIndex);
                if (child.name.startsWith("Icon")) child.visible = child.name === iconName;
            }
            const nameText = display.getChildByName("GoalNameText") as Laya.GTextField;
            const countText = display.getChildByName("GoalCountText") as Laya.GTextField;
            nameText.text = goal.type === "collectGem" ? this.gemName(goal.gemType ?? 0)
                : goal.type === "breakIce" ? "BREAK ICE" : goal.type === "breakCrate" ? "BREAK CRATES" : "TARGET SCORE";
            countText.text = `${Math.min(goal.count, this.progress[index])} / ${goal.count}`;
        });
    }

    private goalLabel(goal: LevelGoal, index: number): string {
        const value = Math.min(goal.count, this.progress[index]);
        if (goal.type === "collectGem") return `${this.gemName(goal.gemType ?? 0)} ${value}/${goal.count}`;
        if (goal.type === "breakIce") return `ICE ${value}/${goal.count}`;
        if (goal.type === "breakCrate") return `CRATES ${value}/${goal.count}`;
        return `SCORE ${value}/${goal.count}`;
    }

    private gemName(type: number): string {
        return ThemeConfig.label(type);
    }

    private async showResult(won: boolean): Promise<void> {
        if (won) await this.onBeforeWin();
        this.audio.result(won);
        GameSave.showBanner();
        if (won) {
            GameSave.vibrate(120);
            this.onCompleted(this.score);
            await this.showLevelComplete();
            return;
        }
        const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/ResultPanel.lh");
        const title = panel.getChildByName("ResultTitle") as Laya.GTextField;
        const score = panel.getChildByName("ResultScore") as Laya.GTextField;
        const goals = panel.getChildByName("ResultGoal") as Laya.GTextField;
        const button = panel.getChildByName("PrimaryButton") as Laya.Sprite;
        const retry = panel.getChildByName("RetryButton") as Laya.Sprite;
        const adStatus = panel.getChildByName("AdStatus") as Laya.GTextField;
        const adIcon = button.getChildByName("AdIcon") as Laya.GImage;
        const label = button.getChildByName("ButtonLabel") as Laya.GTextField;
        title.text = "OUT OF MOVES";
        title.color = "#E5D9FF";
        score.text = `FINAL SCORE  ${this.score}`;
        goals.text = this.level.goals.map((goal, index) => this.goalLabel(goal, index)).join("\n");
        label.text = this.continued ? "TRY AGAIN" : "WATCH AD  +5 MOVES";
        adIcon.visible = !this.continued;
        adStatus.text = this.continued ? "CONTINUE ALREADY USED" : "ONE CONTINUE AVAILABLE THIS ROUND";
        retry.visible = !this.continued;
        panel.pivot(540, 960);
        panel.pos(540, 960);
        panel.scale(0.72, 0.72);
        panel.alpha = 0;
        this.scene.addChild(panel);
        await this.tween(panel, { scaleX: 1, scaleY: 1, alpha: 1 }, 260);
        if (this.continued) {
            button.on(Laya.Event.CLICK, this, () => { button.offAll(); this.onRestart(); });
            return;
        }
        retry.on(Laya.Event.CLICK, this, () => { retry.offAll(); this.onRestart(); });
        button.on(Laya.Event.CLICK, this, async () => {
            if (this.adPending || this.continued) return;
            this.adPending = true;
            button.mouseEnabled = false;
            label.text = "LOADING AD...";
            adStatus.text = "WATCH THE FULL VIDEO TO RECEIVE +5 MOVES";
            GameSave.hideBanner();
            const rewarded = await GameSave.showRewardVideo();
            this.adPending = false;
            if (panel.destroyed) return;
            if (!rewarded) {
                button.mouseEnabled = true;
                label.text = "TRY AD AGAIN";
                adStatus.text = "AD CLOSED OR NOT READY";
                GameSave.showBanner();
                return;
            }
            this.continued = true;
            this.ended = false;
            this.moves += 5;
            this.updateHud();
            panel.destroy();
            GameSave.showBanner();
            GameSave.vibrate(55);
            this.onContinued();
        });
    }

    private async showLevelComplete(): Promise<void> {
        const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/LevelCompletePanel.lh");
        const score = panel.getChildByName("CompleteScore") as Laya.GTextField;
        const next = panel.getChildByName("NextButton") as Laya.Sprite;
        const levels = panel.getChildByName("LevelsButton") as Laya.Sprite;
        next.visible = this.onNext !== null;
        const thresholds = this.level.starScores ?? [3000, 6000, 9000];
        const stars = 1 + thresholds.slice(1).filter((value) => this.score >= value).length;
        score.text = `SCORE ${this.score}  ·  ${stars}/3 STARS`;
        panel.pivot(540, 960);
        panel.pos(540, 960);
        panel.scale(0.72, 0.72);
        panel.alpha = 0;
        this.scene.addChild(panel);
        await this.tween(panel, { scaleX: 1, scaleY: 1, alpha: 1 }, 280);
        for (let index = 1; index <= stars; index++) {
            const star = panel.getChildByName(`StarEarned${index}`) as Laya.GImage;
            star.alpha = 1;
            star.scale(1.65, 1.65);
            await Promise.all([this.tween(star, { scaleX: 1, scaleY: 1 }, 260), this.playStarBurst(panel, star)]);
        }
        if (this.onNext) next.on(Laya.Event.CLICK, this, () => { next.offAll(); this.onNext?.(); });
        levels.on(Laya.Event.CLICK, this, () => { levels.offAll(); this.onLevelSelect(); });
    }

    private createGameControls(): void {
        const pause = this.button("Ⅱ", 904, 92, 104, 72, 34);
        this.scene.addChild(pause);
        pause.on(Laya.Event.CLICK, this, () => {
            this.audio.interact();
            this.showPausePanel();
        });
    }

    private showPausePanel(): void {
        if (this.scene.getChildByName("PausePanel")) return;
        const panel = new Laya.Sprite();
        panel.name = "PausePanel";
        panel.size(1080, 1920);
        panel.mouseEnabled = true;
        panel.graphics.drawRect(0, 0, 1080, 1920, "#000000B3");

        const title = new Laya.GTextField();
        title.text = "PAUSED";
        title.fontSize = 64;
        title.bold = true;
        title.color = "#FFF1B8";
        title.align = "center";
        title.valign = "middle";
        title.pos(240, 430);
        title.size(600, 100);
        panel.addChild(title);

        const resume = this.button("RESUME", 260, 610, 560, 120, 38);
        const restart = this.button("RESTART", 260, 760, 560, 120, 38);
        const levels = this.button("LEVELS", 260, 910, 560, 120, 38);
        const music = this.button("", 260, 1090, 560, 105, 31);
        const sound = this.button("", 260, 1220, 560, 105, 31);
        const updateSettings = (): void => {
            this.buttonLabel(music).text = `MUSIC  ${GameSave.musicEnabled() ? "ON" : "OFF"}`;
            this.buttonLabel(sound).text = `SOUND  ${GameSave.soundEnabled() ? "ON" : "OFF"}`;
        };
        updateSettings();
        for (const control of [resume, restart, levels, music, sound]) panel.addChild(control);
        this.scene.addChild(panel);
        Laya.timer.scale = 0;

        resume.on(Laya.Event.CLICK, this, () => { Laya.timer.scale = 1; panel.destroy(); });
        restart.on(Laya.Event.CLICK, this, () => { Laya.timer.scale = 1; this.onRestart(); });
        levels.on(Laya.Event.CLICK, this, () => { Laya.timer.scale = 1; this.onLevelSelect(); });
        music.on(Laya.Event.CLICK, this, () => {
            const enabled = !GameSave.musicEnabled();
            GameSave.setMusicEnabled(enabled);
            this.audio.setMusicEnabled(enabled);
            updateSettings();
        });
        sound.on(Laya.Event.CLICK, this, () => {
            const enabled = !GameSave.soundEnabled();
            GameSave.setSoundEnabled(enabled);
            this.audio.setSoundEnabled(enabled);
            updateSettings();
        });
    }

    private button(text: string, x: number, y: number, width: number, height: number, fontSize: number): Laya.Sprite {
        const button = new Laya.Sprite();
        button.pos(x, y);
        button.size(width, height);
        button.mouseEnabled = true;
        button.graphics.drawRect(0, 0, width, height, "#6C4FD8", "#C9B9FF", 4);
        const label = new Laya.GTextField();
        label.name = "Label";
        label.text = text;
        label.fontSize = fontSize;
        label.bold = true;
        label.color = "#FFFFFF";
        label.align = "center";
        label.valign = "middle";
        label.size(width, height);
        label.mouseEnabled = false;
        button.addChild(label);
        return button;
    }

    private buttonLabel(button: Laya.Sprite): Laya.GTextField {
        return button.getChildByName("Label") as Laya.GTextField;
    }

    private async playStarBurst(panel: Laya.Sprite, star: Laya.GImage): Promise<void> {
        const burst = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/effects/MatchBurst.lh");
        burst.pos(star.x - 54, star.y - 54);
        panel.addChild(burst);
        const animations: Promise<void>[] = [];
        for (let index = 0; index < burst.numChildren; index++) {
            const child = burst.getChildAt(index) as Laya.Sprite;
            if (!(child instanceof Laya.GImage)) continue;
            child.alpha = 1;
            child.scale(0.35, 0.35);
            animations.push(this.tween(child, { alpha: 0, scaleX: 1.7, scaleY: 1.7 }, 420));
        }
        await Promise.all(animations);
        burst.destroy();
    }

    private tween(target: object, properties: object, duration: number): Promise<void> {
        return new Promise((resolve) => {
            Laya.Tween.to(target, properties, duration, Laya.Ease.backOut, Laya.Handler.create(null, resolve));
        });
    }
}
