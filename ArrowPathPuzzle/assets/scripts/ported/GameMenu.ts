import { _decorator, Component, Label, Node } from 'cc';
const { ccclass } = _decorator;

/** Runtime-only port of GameMenu.js; SDK/ad calls intentionally stay outside the game clone. */
@ccclass('GameMenu')
export class GameMenu extends Component {
    private timeLabel: Label | null = null;
    private heartNodes: Node[] = [];
    private countDown = 0;
    private running = false;

    setup(timeLabel: Label, hearts: Node[], seconds: number): void {
        this.timeLabel = timeLabel;
        this.heartNodes = hearts;
        this.countDown = seconds;
        this.refreshTime();
    }

    startCountDown(): void { this.running = true; }
    pauseCountDown(): void { this.running = false; }
    breakHeart(remaining: number): void {
        this.heartNodes.forEach((heart, index) => { heart.active = index < remaining; });
    }

    update(dt: number): void {
        if (!this.running || this.countDown <= 0) return;
        this.countDown = Math.max(0, this.countDown - dt);
        this.refreshTime();
    }

    private refreshTime(): void {
        if (!this.timeLabel) return;
        const seconds = Math.ceil(this.countDown);
        this.timeLabel.string = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
}
