import { Color, Graphics, Label, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

export function addLabel(parent: Node, name: string, text: string, y: number, size = 36, color = Color.WHITE) {
    const node = new Node(name); node.layer = parent.layer; node.parent = parent; node.setPosition(0, y);
    node.addComponent(UITransform).setContentSize(660, size + 20);
    const label = node.addComponent(Label);
    label.string = text; label.fontSize = size; label.lineHeight = size + 6;
    label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER; label.enableWrapText = false;
    label.fontFamily = 'Courier New';
    return label;
}

export function addButton(parent: Node, name: string, text: string, y: number, color: Color, onClick: () => void) {
    const node = new Node(name); node.layer = parent.layer; node.parent = parent; node.setPosition(0, y);
    node.addComponent(UITransform).setContentSize(300, 82);
    const g = node.addComponent(Graphics);
    g.fillColor = new Color(18, 31, 42, 245); g.rect(-150, -41, 300, 82); g.fill();
    g.fillColor = color; g.rect(-142, -33, 284, 66); g.fill();
    addArtwork(node, 'art/ui-button/spriteFrame', 320, 92);
    addLabel(node, 'Label', text, 0, 30, new Color(25, 34, 42));
    node.on(Node.EventType.TOUCH_END, onClick);
    return node;
}

export function drawPanel(node: Node, width: number, height: number) {
    node.getComponent(UITransform)?.setContentSize(width, height);
    const g = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    g.clear(); g.fillColor = new Color(14, 27, 40, 238); g.rect(-width / 2, -height / 2, width, height); g.fill();
    g.fillColor = new Color(225, 186, 82); g.rect(-width / 2 + 8, -height / 2 + 8, width - 16, 8); g.fill();
    addArtwork(node, 'art/ui-panel/spriteFrame', width, height);
}

function addArtwork(parent: Node, path: string, width: number, height: number) {
    resources.load(path, SpriteFrame, (error, frame) => {
        if (error || !parent.isValid) return;
        const node = new Node('PixelArtwork'); node.layer = parent.layer; node.parent = parent; node.setSiblingIndex(0);
        const transform = node.addComponent(UITransform);
        const sprite = node.addComponent(Sprite); sprite.spriteFrame = frame; sprite.type = Sprite.Type.SLICED; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        transform.setContentSize(width, height);
    });
}
