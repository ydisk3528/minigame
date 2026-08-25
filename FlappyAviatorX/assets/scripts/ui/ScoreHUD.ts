import { _decorator, Component, Label } from 'cc';
import { Events, gameEvents } from '../core/GameEvents';
const { ccclass, property } = _decorator;

@ccclass('ScoreHUD')
export class ScoreHUD extends Component {
    @property(Label) scoreLabel: Label | null = null;
    onLoad() {
        gameEvents.on(Events.SCORE, this.setScore, this);
    }
    onDestroy() { gameEvents.off(Events.SCORE, this.setScore, this); }
    private setScore(score: number) { if (this.scoreLabel) this.scoreLabel.string = `${score}`; }
}
