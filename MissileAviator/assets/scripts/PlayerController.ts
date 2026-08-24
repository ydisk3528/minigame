import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from 'cc';
const { ccclass } = _decorator;

type SmokeParticle = { node: Node; opacity: UIOpacity; age: number };

@ccclass('PlayerController')
export class PlayerController extends Component {
  velocityY = 0;
  private dragDeltaY = 0;
  shield = 0;
  private smokeTime = 0;
  private graphics!: Graphics;
  private smokeFrame: SpriteFrame | null = null;
  private smokeParticles: SmokeParticle[] = [];
  private smokeCursor = 0;
  private tilt = 0;
  private blinkTime = 0;
  private drawnShield = -1;
  private opacity!: UIOpacity;

  onLoad(): void {
    const hitArea = this.getComponent(UITransform);
    const graphics = this.getComponent(Graphics);
    const opacity = this.getComponent(UIOpacity);
    const art = this.node.getChildByName('PlayerSprite')?.getComponent(Sprite);
    if (!hitArea || !graphics || !opacity || !art) throw new Error('Player.prefab is incomplete');
    this.graphics = graphics; this.opacity = opacity;
    this.loadSmoke();
    this.draw();
  }

  reset(): void {
    this.velocityY = 0;
    this.dragDeltaY = 0;
    this.shield = 0;
    this.tilt = 0;
    this.blinkTime = 0;
    if (this.opacity) this.opacity.opacity = 255;
    this.node.setRotationFromEuler(0, 0, 0);
    this.clearSmoke(); this.draw();
  }

  moveTo(x: number, y: number, minX: number, maxX: number, minY: number, maxY: number): void {
    const position = this.node.position;
    const clampedY = Math.max(minY, Math.min(maxY, y));
    this.dragDeltaY += clampedY - position.y;
    this.node.setPosition(Math.max(minX, Math.min(maxX, x)), clampedY);
  }
  release(): void { this.velocityY = 0; this.dragDeltaY = 0; }
  startBlink(seconds: number): void { this.blinkTime = seconds; }

  onDisable(): void { this.clearSmoke(); }
  onDestroy(): void { for (const particle of this.smokeParticles) particle.node.destroy(); this.smokeParticles.length = 0; }

  fly(dt: number): void {
    this.blinkTime = Math.max(0, this.blinkTime - dt);
    this.opacity.opacity = this.blinkTime > 0 && Math.floor(this.blinkTime * 8) % 2 === 0 ? 70 : 255;
    const movedVelocity = dt > 0 ? this.dragDeltaY / dt : 0;
    this.velocityY += (movedVelocity - this.velocityY) * Math.min(1, dt * 18);
    this.dragDeltaY = 0;
    const targetTilt = Math.max(-18, Math.min(18, this.velocityY * 0.035));
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 12);
    this.node.setRotationFromEuler(0, 0, this.tilt);
    if (this.drawnShield !== this.shield) this.draw();
    this.updateSmoke(dt);
    this.smokeTime += dt;
    if (this.smokeTime > .18) { this.smokeTime = 0; this.emitSmoke(); }
  }

  hit(): boolean {
    if (this.shield > 0) { this.shield--; return false; }
    return true;
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();
    this.drawnShield = this.shield;
    if (this.shield) { g.strokeColor = new Color('#63e7ff'); g.lineWidth = 3; g.circle(0, 0, 79); g.stroke(); }
  }

  private loadSmoke(): void {
    resources.load('art/gameplay/smoke/spriteFrame', SpriteFrame, (error, frame) => {
      if (error || !this.isValid) return;
      this.smokeFrame = frame; this.prepareSmoke();
    });
  }

  private emitSmoke(): void {
    if (!this.smokeParticles.length) this.prepareSmoke();
    const particle = this.smokeParticles[this.smokeCursor++ % this.smokeParticles.length];
    if (!particle) return;
    particle.age = 0; particle.node.active = true; particle.opacity.opacity = 165;
    particle.node.setScale(.65, .65, 1);
    particle.node.setPosition(this.node.position.x - 118, this.node.position.y + (Math.random() - .5) * 12);
    particle.node.setSiblingIndex(Math.max(0, this.node.getSiblingIndex() - 1));
  }

  private prepareSmoke(): void {
    if (this.smokeParticles.length || !this.node.parent) return;
    for (let i = 0; i < 5; i++) {
      const node = new Node(`SmokePixel${i}`); node.layer = this.node.layer; node.setParent(this.node.parent); node.addComponent(UITransform).setContentSize(108, 72);
      const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = this.smokeFrame;
      const opacity = node.addComponent(UIOpacity); node.active = false;
      this.smokeParticles.push({ node, opacity, age: 0 });
    }
  }

  private updateSmoke(dt: number): void {
    for (const particle of this.smokeParticles) {
      if (!particle.node.active) continue;
      particle.age += dt;
      if (particle.age >= .7) { particle.node.active = false; continue; }
      const position = particle.node.position; const progress = particle.age / .7; const scale = .65 - progress * .4;
      particle.node.setPosition(position.x - 117 * dt, position.y + 17 * dt);
      particle.node.setScale(scale, scale, 1); particle.opacity.opacity = 165 * (1 - progress);
    }
  }

  private clearSmoke(): void {
    for (const particle of this.smokeParticles) particle.node.active = false;
  }
}
