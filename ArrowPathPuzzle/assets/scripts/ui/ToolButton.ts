import { _decorator, Button, Color, Component, Graphics, Label, Node, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToolButton')
export class ToolButton extends Component {
    @property labelText = '提示';
    @property(Color) fillColor = new Color(237, 174, 111, 255);
    private label: Label | null = null;

    onLoad(): void {
        const transform = this.getComponent(UITransform)!;
        transform.setContentSize(230, 120);
        const graphics = this.getComponent(Graphics)!;
        graphics.fillColor = this.fillColor;
        graphics.roundRect(-115, -60, 230, 120, 34);
        graphics.fill();
        const labelNode = new Node('Label');
        labelNode.layer = this.node.layer;
        labelNode.parent = this.node;
        labelNode.setPosition(Vec3.ZERO);
        labelNode.addComponent(UITransform).setContentSize(210, 80);
        this.label = labelNode.addComponent(Label);
        this.label.fontSize = 38;
        this.label.lineHeight = 44;
        this.label.color = new Color(74, 51, 43, 255);
        this.label.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.label.verticalAlign = Label.VerticalAlign.CENTER;
        this.label.string = this.labelText;
    }

    setup(text: string, onClick: () => void): void {
        this.labelText = text;
        if (this.label) this.label.string = text;
        this.node.on(Button.EventType.CLICK, onClick);
    }
}
