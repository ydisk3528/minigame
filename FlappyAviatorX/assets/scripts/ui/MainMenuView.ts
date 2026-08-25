import { _decorator, Component, Node } from 'cc';
import { Events, gameEvents } from '../core/GameEvents';
const { ccclass, property } = _decorator;

@ccclass('MainMenuView')
export class MainMenuView extends Component {
    @property(Node) startButton: Node | null = null;
    @property(Node) levelButton: Node | null = null;
    @property(Node) quitButton: Node | null = null;

    onLoad() {
        this.startButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.START));
        this.levelButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.LEVEL_SELECT));
        this.quitButton?.on(Node.EventType.TOUCH_END, () => gameEvents.emit(Events.QUIT));
    }
}
