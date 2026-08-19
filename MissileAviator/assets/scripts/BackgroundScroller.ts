import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
const { ccclass } = _decorator;

@ccclass('BackgroundScroller')
export class BackgroundScroller extends Component {
  private offset = 0;
  private graphics!: Graphics;
  private art: Node | null = null;

  onLoad(): void {
    this.getComponent(UITransform) ?? this.addComponent(UITransform).setContentSize(1280, 720);
    this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    this.draw();
    this.loadArt();
  }

  scroll(dt: number, speed: number): void { this.offset = (this.offset + speed * dt) % 320; this.draw(); }

  private draw(): void {
    const g = this.graphics; g.clear();
    g.fillColor = new Color('#65b9e8'); g.rect(-640, -360, 1280, 720); g.fill();
    g.fillColor = new Color('#9bdcf1'); g.rect(-640, -70, 1280, 90); g.fill();
    g.fillColor = new Color('#547ca0');
    for (let x = -760 - this.offset * .35; x < 760; x += 210) {
      g.moveTo(x, -270); g.lineTo(x + 90, -120); g.lineTo(x + 180, -270); g.fill();
    }
    g.fillColor = new Color('#325a63'); g.rect(-640, -310, 1280, 45); g.fill();
    g.fillColor = new Color('#dff8ff');
    for (let x = -750 - this.offset; x < 760; x += 320) {
      g.rect(x, 160, 95, 22); g.rect(x + 22, 181, 55, 18); g.rect(x + 12, 148, 120, 15);
    }
    g.fill();
    g.fillColor = new Color('#23434b'); g.rect(-640, -360, 1280, 50); g.fill();
    g.fillColor = new Color('#4f7f5d'); g.rect(-640, -310, 1280, 16); g.fill();
  }

  private loadArt(): void {
    const art = new Node('SkyBackgroundSprite'); art.layer = this.node.layer; art.setParent(this.node); art.setSiblingIndex(0);
    art.addComponent(UITransform).setContentSize(1280, 720);
    const sprite = art.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load('art/sky-background/texture', Texture2D, (error, texture) => {
      if (error || !this.isValid) return art.destroy();
      texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
      const frame = new SpriteFrame(); frame.texture = texture;
      sprite.spriteFrame = frame; this.art = art; this.graphics.enabled = false;
    });
  }
}
