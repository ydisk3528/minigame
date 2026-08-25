import { _decorator, BlockInputEvents, Button, Color, Component, Graphics, Label, Node, tween, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('LevelCompletePanel')
export class LevelCompletePanel extends Component {
    onLoad(): void {
        this.node.active = false;
        this.node.addComponent(BlockInputEvents);
        this.getComponent(UITransform)!.setContentSize(1080, 1920);
        const shade = this.getComponent(Graphics)!;
        shade.fillColor = new Color(52, 36, 31, 150);
        shade.rect(-540, -960, 1080, 1920);
        shade.fill();

        const card = new Node('Card');
        card.layer = this.node.layer;
        card.parent = this.node;
        card.addComponent(UITransform).setContentSize(760, 600);
        const cardGraphics = card.addComponent(Graphics);
        cardGraphics.fillColor = new Color(255, 248, 232, 255);
        cardGraphics.roundRect(-380, -300, 760, 600, 60);
        cardGraphics.fill();
        this.makeLabel(card, '通关啦！', 90, 64);
        this.makeLabel(card, '所有箭头都找到出口', 5, 34);
    }

    show(onNext: () => void, onReplay: () => void): void {
        this.node.active = true;
        const card = this.node.getChildByName('Card')!;
        if (!card.getChildByName('Next')) this.makeButton(card, '下一关', -105, onNext, 'Next');
        if (!card.getChildByName('Replay')) this.makeButton(card, '重玩', -225, onReplay, 'Replay');
        card.setScale(0.65, 0.65, 1);
        tween(card).to(0.28, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private makeLabel(parent: Node, text: string, y: number, size: number): void {
        const node = new Node(text);
        node.layer = parent.layer;
        node.parent = parent;
        node.setPosition(0, y);
        node.addComponent(UITransform).setContentSize(680, 100);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 10;
        label.color = new Color(74, 51, 43, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
    }

    private makeButton(parent: Node, text: string, y: number, callback: () => void, name: string): void {
        const node = new Node(name);
        node.layer = parent.layer;
        node.parent = parent;
        node.setPosition(0, y);
        node.addComponent(UITransform).setContentSize(430, 95);
        const g = node.addComponent(Graphics);
        g.fillColor = name === 'Next' ? new Color(224, 139, 77, 255) : new Color(218, 205, 183, 255);
        g.roundRect(-215, -47, 430, 94, 30);
        g.fill();
        node.addComponent(Button);
        node.on(Button.EventType.CLICK, callback);
        this.makeLabel(node, text, 0, 36);
    }
}
