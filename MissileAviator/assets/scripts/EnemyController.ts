import { _decorator, Component, dragonBones, Vec3 } from 'cc';
const { ccclass } = _decorator;

export type EnemyKind = 'truck' | 'fighter' | 'bomber' | 'diveBomber' | 'tank' | 'rocketTruck' | 'interceptor';

const STATS: Record<EnemyKind, { health: number; speed: number; halfWidth: number; halfHeight: number }> = {
  truck: { health: 3, speed: 95, halfWidth: 60, halfHeight: 30 },
  fighter: { health: 2, speed: 155, halfWidth: 56, halfHeight: 27 },
  bomber: { health: 7, speed: 72, halfWidth: 88, halfHeight: 32 },
  diveBomber: { health: 3, speed: 185, halfWidth: 62, halfHeight: 30 },
  tank: { health: 8, speed: 58, halfWidth: 72, halfHeight: 39 },
  rocketTruck: { health: 5, speed: 82, halfWidth: 68, halfHeight: 42 },
  interceptor: { health: 4, speed: 205, halfWidth: 48, halfHeight: 55 },
};

@ccclass('EnemyController')
export class EnemyController extends Component {
  kind: EnemyKind = 'truck';
  health = 1;
  halfWidth = 55;
  halfHeight = 28;
  private speed = 100;
  private fireIn = 1;
  private originY = 0;
  private age = 0;

  setup(kind: EnemyKind, position: Vec3): void {
    this.kind = kind;
    const stats = STATS[kind]; this.health = stats.health; this.speed = stats.speed; this.halfWidth = stats.halfWidth; this.halfHeight = stats.halfHeight;
    this.fireIn = .8 + Math.random() * .8;
    this.originY = position.y;
    this.age = 0;
    this.node.setPosition(position);
    if (kind === 'interceptor') this.getComponent(dragonBones.ArmatureDisplay)?.playAnimation('idle', -1);
  }

  tick(dt: number, worldSpeed: number, speedScale = 1, fireRateScale = 1): boolean {
    this.age += dt;
    let y = this.originY;
    if (this.kind === 'fighter') y += Math.sin(this.age * 2.2) * 34;
    if (this.kind === 'bomber') y += Math.sin(this.age * 1.25) * 18;
    if (this.kind === 'diveBomber') y += Math.sin(this.age * 2.8) * 82;
    if (this.kind === 'interceptor') y += Math.sin(this.age * 3.4) * 48;
    this.node.setPosition(this.node.position.x - (this.speed + worldSpeed * .12) * speedScale * dt, y);
    this.fireIn -= dt * fireRateScale;
    if (this.fireIn > 0 || this.node.position.x < -180) return false;
    this.fireIn = this.kind === 'truck' || this.kind === 'tank' ? 1.8 + Math.random() : 1.15 + Math.random() * .8;
    return true;
  }

  hit(damage = 1): boolean { return (this.health -= damage) <= 0; }
}
