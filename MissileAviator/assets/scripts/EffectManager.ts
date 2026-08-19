import { Color, Label, Node, tween, UITransform, Vec3 } from 'cc';

export class EffectManager {
  constructor(private layer: Node) {}

  text(message: string, position: Vec3, color = new Color('#fff18a'), size = 38): void {
    const node = new Node('Popup');
    node.layer = this.layer.layer;
    node.addComponent(UITransform).setContentSize(260, 60);
    const label = node.addComponent(Label);
    label.string = message; label.fontSize = size; label.lineHeight = size + 6;
    label.color = color; label.isBold = true;
    node.setParent(this.layer); node.setPosition(position);
    tween(node).by(.45, { position: new Vec3(0, 70), scale: new Vec3(.25, .25) })
      .to(.18, { scale: new Vec3(.1, .1) }).call(() => node.destroy()).start();
  }

  burst(position: Vec3, perfect = false): void {
    for (let i = 0; i < (perfect ? 12 : 7); i++) {
      const node = new Node('PixelSpark'); node.setParent(this.layer); node.setPosition(position);
      node.layer = this.layer.layer;
      const ui = node.addComponent(UITransform); ui.setContentSize(8, 8);
      const label = node.addComponent(Label); label.string = '▪'; label.fontSize = 18;
      label.color = perfect ? new Color('#fff18a') : new Color('#ffffff');
      const a = i * Math.PI * 2 / (perfect ? 12 : 7);
      tween(node).by(.35, { position: new Vec3(Math.cos(a) * 80, Math.sin(a) * 80) })
        .call(() => node.destroy()).start();
    }
  }
}
