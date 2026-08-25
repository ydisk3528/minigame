import { Color, instantiate, Label, Node, Prefab, Sprite, SpriteFrame, tween, UITransform, Vec3 } from 'cc';

export class EffectManager {
  private explosionPrefab: Prefab | null = null;
  private explosionFrames: SpriteFrame[] = [];

  constructor(private layer: Node) {}

  setEnemyExplosionAssets(prefab: Prefab, frames: SpriteFrame[]): void { this.explosionPrefab = prefab; this.explosionFrames = frames; }

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

  explosion(position: Vec3): void {
    const colors = [new Color('#fff18a'), new Color('#ff9b42'), new Color('#e7472e')];
    for (let i = 0; i < 18; i++) {
      const node = new Node('ExplosionPixel'); node.setParent(this.layer); node.setPosition(position); node.layer = this.layer.layer;
      node.addComponent(UITransform).setContentSize(12, 12);
      const label = node.addComponent(Label); label.string = '■'; label.fontSize = i % 3 === 0 ? 24 : 16; label.color = colors[i % colors.length];
      const angle = i * Math.PI * 2 / 18; const distance = 45 + i % 4 * 18;
      tween(node).by(.38, { position: new Vec3(Math.cos(angle) * distance, Math.sin(angle) * distance), scale: new Vec3(.45, .45) })
        .to(.12, { scale: new Vec3(.05, .05) }).call(() => node.destroy()).start();
    }
  }

  enemyExplosion(position: Vec3): void {
    if (!this.explosionPrefab || !this.explosionFrames.length) { this.burst(position, true); return; }
    const node = instantiate(this.explosionPrefab); node.layer = this.layer.layer; node.setParent(this.layer); node.setPosition(position);
    const sprite = node.getComponent(Sprite); if (!sprite) { node.destroy(); return; }
    let frame = 0; const advance = (): void => {
      if (!node.isValid) return;
      if (frame >= this.explosionFrames.length) { node.destroy(); return; }
      sprite.spriteFrame = this.explosionFrames[frame++]; tween(node).delay(.045).call(advance).start();
    }; advance();
  }
}
