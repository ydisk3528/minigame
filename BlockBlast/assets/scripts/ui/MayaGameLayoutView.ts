import { _decorator, Component, Label, Node, Sprite } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('MayaGameLayoutView')
export class MayaGameLayoutView extends Component {
    @property(Label) public bestScoreLabel: Label | null = null;
    @property(Label) public currentScoreLabel: Label | null = null;
    @property(Label) public levelTargetLabel: Label | null = null;
    @property(Label) public boosterStatusLabel: Label | null = null;
    @property([Label]) public boosterCountLabels: Label[] = [];
    @property([Node]) public boosterButtons: Node[] = [];
    @property([Sprite]) public boosterIcons: Sprite[] = [];
    @property([Node]) public boosterAdIcons: Node[] = [];
}
