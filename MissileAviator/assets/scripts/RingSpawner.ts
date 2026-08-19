import { Node, Prefab } from 'cc';
import { LevelConfig, RingKind } from './GameTypes';
import { ObjectPoolManager } from './ObjectPoolManager';
import { RingController } from './RingController';

export class RingSpawner {
  readonly active: RingController[] = [];
  private elapsed = 0;
  private serial = 0;

  constructor(private layer: Node, private prefab: Prefab, private pool: ObjectPoolManager) {}

  reset(): void {
    this.active.splice(0).forEach(ring => this.pool.release('ring', ring.node));
    this.elapsed = 0; this.serial = 0;
  }

  tick(dt: number, level: LevelConfig, score: number): void {
    this.elapsed += dt;
    const interval = Math.max(.85, level.ringSpawnInterval - Math.floor(score / level.difficultyEvery) * .06);
    if (this.elapsed < interval) return;
    this.elapsed = 0;
    const node = this.pool.acquire('ring', this.prefab, this.layer);
    node.setPosition(760, (Math.random() * 2 - 1) * level.ringRandomY);
    const ring = node.getComponent(RingController) ?? node.addComponent(RingController);
    const random = Math.random();
    const kind: RingKind = random < level.movingRingChance ? 'moving'
      : random < level.movingRingChance + level.shrinkingRingChance ? 'shrinking'
      : this.serial++ % 7 === 6 ? 'speed' : 'normal';
    ring.setup(level.ringRadius, level.ringSpeed + Math.floor(score / level.difficultyEvery) * level.difficultySpeedStep, kind);
    this.active.push(ring);
  }

  recycleOffscreen(): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].node.position.x > -760) continue;
      this.pool.release('ring', this.active[i].node);
      this.active.splice(i, 1);
    }
  }
}

