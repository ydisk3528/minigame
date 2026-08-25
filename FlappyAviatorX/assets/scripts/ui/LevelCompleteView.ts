import { _decorator, Component, Label, Node } from 'cc';
import { Events, gameEvents } from '../core/GameEvents';
const { ccclass, property } = _decorator;

@ccclass('LevelCompleteView')
export class LevelCompleteView extends Component {
    @property(Label) titleLabel: Label | null = null;
    @property(Label) scoreLabel: Label | null = null;
    @property(Node) nextButton: Node | null = null;
    @property(Node) selectButton: Node | null = null;
    @property(Node) menuButton: Node | null = null;

    onLoad() {
        this.nextButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.NEXT_LEVEL));
        this.selectButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.LEVEL_SELECT));
        this.menuButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.MENU));
    }

    show(levelId: number, value: number, hasNext: boolean) {
        if (this.titleLabel) this.titleLabel.string = `MISSION ${levelId} COMPLETE`;
        if (this.scoreLabel) this.scoreLabel.string = `SCORE ${value}`;
        if (this.nextButton) this.nextButton.active = hasNext;
    }
}
