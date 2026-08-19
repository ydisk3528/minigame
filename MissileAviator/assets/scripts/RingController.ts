import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { RingKind } from './GameTypes';
const { ccclass } = _decorator;

@ccclass('RingController')
export class RingController extends Component {
  radius = 92;
  speed = 260;
  kind: RingKind = 'normal';
  passed = false;
  private startY = 0;
  private age = 0;
  private graphics!: Graphics;
  private artSprite: Sprite | null = null;
  private artTransform: UITransform | null = null;

  onLoad(): void {
    this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    this.getComponent(UITransform) ?? this.addComponent(UITransform);
    this.loadArt();
  }

  setup(radius: number, speed: number, kind: RingKind): void {
    this.radius = radius;
    this.speed = speed;
    this.kind = kind;
    this.passed = false;
    this.age = 0;
    this.startY = this.node.position.y;
    this.updateArt();
    this.draw();
  }

  move(dt: number, speedScale = 1): void {
    this.age += dt;
    this.node.setPosition(this.node.position.x - this.speed * speedScale * dt,
      this.kind === 'moving' ? this.startY + Math.sin(this.age * 2.2) * 62 : this.node.position.y);
    if (this.kind === 'shrinking') {
      this.radius = Math.max(62, this.radius - dt * 7);
      this.updateArt();
      this.draw();
    }
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();
    if (this.artSprite?.spriteFrame) return;
    g.strokeColor = new Color('#442713'); g.lineWidth = 22; g.circle(0, 0, this.radius); g.stroke();
    g.strokeColor = this.kind === 'speed' ? new Color('#57e9ff') : new Color('#f6b83f');
    g.lineWidth = 14; g.circle(0, 0, this.radius); g.stroke();
    g.strokeColor = new Color('#fff18a'); g.lineWidth = 4; g.circle(0, 0, this.radius - 4); g.stroke();
    g.fillColor = new Color('#f6b83f');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      g.rect(Math.cos(a) * this.radius - 4, Math.sin(a) * this.radius - 4, 8, 8);
    }
    g.fill();
  }

  private loadArt(): void {
    const art = new Node('RingSprite'); art.layer = this.node.layer; art.setParent(this.node);
    this.artTransform = art.addComponent(UITransform);
    this.artSprite = art.addComponent(Sprite); this.artSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load('art/gold-ring/texture', Texture2D, (error, texture) => {
      if (error || !this.isValid || !this.artSprite) return art.destroy();
      texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
      const frame = new SpriteFrame(); frame.texture = texture;
      this.artSprite.spriteFrame = frame; this.updateArt(); this.draw();
    });
  }

  private updateArt(): void {
    this.artTransform?.setContentSize((this.radius + 14) * 3, (this.radius + 14) * 2);
    if (this.artSprite) this.artSprite.color = this.kind === 'speed' ? new Color('#79efff') : Color.WHITE;
  }
}
