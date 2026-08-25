import { _decorator, Component, Label, Node } from 'cc';
import { Events, gameEvents } from '../core/GameEvents';
const { ccclass, property } = _decorator;

@ccclass('GameOverView')
export class GameOverView extends Component {
    @property(Label) scoreLabel: Label | null = null;
    @property(Label) bestLabel: Label | null = null;
    @property(Node) restartButton: Node | null = null;
    @property(Node) menuButton: Node | null = null;
    onLoad() {
        this.restartButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.RESTART));
        this.menuButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.MENU));
    }
    show(score: number, best: number) {
        if (this.scoreLabel) this.scoreLabel.string = `SCORE  ${score}`;
        if (this.bestLabel) this.bestLabel.string = `BEST  ${best}`;
    }
}
