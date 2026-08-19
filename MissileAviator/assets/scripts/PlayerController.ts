import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, Texture2D, tween, UIOpacity, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
  velocityY = 0;
  targetY: number | null = null;
  shield = 0;
  private propellerTime = 0;
  private smokeTime = 0;
  private graphics!: Graphics;
  private artReady = false;

  onLoad(): void {
    this.getComponent(UITransform) ?? this.addComponent(UITransform).setContentSize(116, 56);
    this.graphics = this.getComponent(Graphics) ?? this.addComponent(Graphics);
    this.loadArt();
    this.draw();
  }

  reset(): void {
    this.velocityY = 0;
    this.targetY = null;
    this.shield = 0;
    this.node.setRotationFromEuler(0, 0, 0);
  }

  steerTo(y: number): void { this.targetY = y; }
  release(): void { this.targetY = null; }

  fly(dt: number, minY: number, maxY: number): boolean {
    if (this.targetY === null) this.velocityY -= 760 * dt;
    else this.velocityY += (this.targetY - this.node.position.y) * 13 * dt - this.velocityY * 8 * dt;
    this.velocityY = Math.max(-390, Math.min(390, this.velocityY));
    this.node.setPosition(this.node.position.x, this.node.position.y + this.velocityY * dt);
    this.node.setRotationFromEuler(0, 0, Math.max(-18, Math.min(18, this.velocityY * 0.045)));
    this.propellerTime += dt;
    if (this.propellerTime > 0.07) { this.propellerTime = 0; this.draw(); }
    this.smokeTime += dt;
    if (this.smokeTime > .12) { this.smokeTime = 0; this.emitSmoke(); }
    return this.node.position.y < minY || this.node.position.y > maxY;
  }

  hit(): boolean {
    if (this.shield > 0) { this.shield--; return false; }
    return true;
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();
    if (this.artReady) {
      g.strokeColor = new Color('#ffe66d'); g.lineWidth = 3;
      const tall = Math.floor(this.propellerTime * 100) % 2 === 0;
      g.moveTo(76, tall ? -29 : -20); g.lineTo(76, tall ? 29 : 20); g.stroke();
      if (this.shield) { g.strokeColor = new Color('#63e7ff'); g.lineWidth = 3; g.circle(0, 0, 79); g.stroke(); }
      return;
    }
    g.fillColor = new Color('#162947');
    g.rect(-49, -12, 80, 24); g.fill();
    g.fillColor = new Color('#718348');
    g.rect(-44, -9, 74, 18); g.fill();
    g.moveTo(-40, 8); g.lineTo(-55, 24); g.lineTo(-33, 16); g.lineTo(-18, 8); g.fill();
    g.moveTo(-6, 8); g.lineTo(8, 24); g.lineTo(25, 22); g.lineTo(14, 7); g.fill();
    g.fillColor = new Color('#d9f3ff'); g.rect(-6, 7, 18, 8); g.fill();
    g.fillColor = new Color('#d85832'); g.rect(28, -12, 8, 24); g.fill();
    g.strokeColor = new Color('#ffe66d'); g.lineWidth = 4;
    const tall = Math.floor(this.propellerTime * 100) % 2 === 0;
    g.moveTo(40, tall ? -25 : -17); g.lineTo(40, tall ? 25 : 17); g.stroke();
    g.fillColor = new Color('#ffffff'); g.rect(-27, -3, 7, 7); g.fill();
    if (this.shield) { g.strokeColor = new Color('#63e7ff'); g.lineWidth = 3; g.circle(-3, 0, 58); g.stroke(); }
  }

  private loadArt(): void {
    const art = new Node('PlayerSprite'); art.layer = this.node.layer; art.setParent(this.node); art.setSiblingIndex(0);
    art.addComponent(UITransform).setContentSize(158, 79);
    const sprite = art.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    resources.load('art/player-plane/texture', Texture2D, (error, texture) => {
      if (error || !this.isValid) return art.destroy();
      texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
      const frame = new SpriteFrame(); frame.texture = texture;
      sprite.spriteFrame = frame; this.artReady = true; this.draw();
    });
  }

  private emitSmoke(): void {
    if (!this.node.parent) return;
    const smoke = new Node('SmokePixel'); smoke.layer = this.node.layer; smoke.setParent(this.node.parent);
    smoke.setSiblingIndex(Math.max(0, this.node.getSiblingIndex() - 1));
    smoke.setPosition(this.node.position.x - 56, this.node.position.y + (Math.random() - .5) * 8);
    smoke.addComponent(UITransform).setContentSize(12, 12);
    const g = smoke.addComponent(Graphics); g.fillColor = new Color(210, 225, 232, 190); g.rect(-6, -6, 12, 12); g.fill();
    const opacity = smoke.addComponent(UIOpacity);
    tween(smoke).by(.55, { position: new Vec3(-55, 14), scale: new Vec3(.8, .8) }).call(() => smoke.destroy()).start();
    tween(opacity).to(.55, { opacity: 0 }).start();
  }
}
