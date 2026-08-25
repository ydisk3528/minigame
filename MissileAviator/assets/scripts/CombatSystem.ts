import { Node, Prefab, resources, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { EnemyController, EnemyKind } from './EnemyController';
import { FormationPattern, PowerUpKind, PowerUpWeights, WaveConfig } from './GameTypes';
import { ObjectPoolManager } from './ObjectPoolManager';

type Enemy = { controller: EnemyController; poolKey: string };
export type PlayerBulletKind = 'normal' | 'laser' | 'plasma' | 'rocket';
type Bullet = { node: Node; velocity: Vec3; friendly: boolean; poolKey: string; damage: number };
type PowerUp = { node: Node; kind: PowerUpKind };
export type CombatResult = { playerHit: boolean; playerShot: boolean; enemyShot: boolean; destroyed: Vec3[]; powerUps: PowerUpKind[] };

const ENEMY_KINDS: EnemyKind[] = ['truck', 'fighter', 'bomber', 'diveBomber', 'tank', 'rocketTruck', 'interceptor'];
const DEFAULT_WAVE: WaveConfig = { id: 1, truckCount: 3, fighterCount: 3, bomberCount: 1, diveBomberCount: 1, tankCount: 1, rocketTruckCount: 1, interceptorCount: 1, spawnInterval: 1.4, enemySpeedScale: 1, fireRateScale: 1, formationChance: .5, formationSize: 3, formationPattern: 'auto' };
const DEFAULT_POWER_UP_WEIGHTS: PowerUpWeights = { repair: 2, shield: 2, rapid: 3, spread: 3, laser: 2, plasma: 2, rocket: 2 };

export class CombatSystem {
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private powerUps: PowerUp[] = [];
  private powerFrames = new Map<PowerUpKind, SpriteFrame>();
  private waves: WaveConfig[] = [DEFAULT_WAVE];
  private waveIndex = 0;
  private remaining = {} as Record<EnemyKind, number>;
  private spawnIn = 1;
  private fireIn = .15;
  private rapidTimer = 0;
  private spreadTimer = 0;
  private weapon: PlayerBulletKind = 'normal';
  private baseWeapon: PlayerBulletKind = 'normal';
  private weaponTimer = 0;
  private dropChance = .12;
  private powerUpWeights: PowerUpWeights = DEFAULT_POWER_UP_WEIGHTS;

  constructor(
    private readonly layer: Node,
    private readonly enemyPrefabs: Record<EnemyKind, Prefab>,
    private readonly playerBulletPrefabs: Record<PlayerBulletKind, Prefab>,
    private readonly enemyBulletPrefab: Prefab,
    private readonly powerUpPrefab: Prefab,
    private readonly pool: ObjectPoolManager,
  ) {
    resources.loadDir('art/gameplay', SpriteFrame, (_error, frames) => {
      for (const kind of ['repair', 'shield', 'rapid', 'spread', 'laser', 'plasma', 'rocket'] as PowerUpKind[]) {
        const frame = frames?.find(item => item.name === `${kind === 'laser' || kind === 'plasma' || kind === 'rocket' ? 'weapon' : 'powerup'}-${kind}`);
        if (frame) this.powerFrames.set(kind, frame);
      }
    });
  }

  tick(dt: number, worldSpeed: number, player: Vec3): CombatResult {
    const result: CombatResult = { playerHit: false, playerShot: false, enemyShot: false, destroyed: [], powerUps: [] };
    const wave = this.waves[this.waveIndex] ?? DEFAULT_WAVE;
    this.rapidTimer = Math.max(0, this.rapidTimer - dt); this.spreadTimer = Math.max(0, this.spreadTimer - dt);
    if (this.weaponTimer > 0 && (this.weaponTimer -= dt) <= 0) this.weapon = this.baseWeapon;
    this.spawnIn -= dt;
    const available = ENEMY_KINDS.filter(kind => this.remaining[kind] > 0);
    if (this.spawnIn <= 0 && available.length) {
      const kind = available[Math.floor(Math.random() * available.length)];
      const groupSize = Math.random() < wave.formationChance ? Math.min(this.remaining[kind], Math.max(2, wave.formationSize)) : 1;
      this.remaining[kind] -= groupSize; this.spawnFormation(kind, groupSize, wave.formationPattern); this.spawnIn = wave.spawnInterval * (groupSize > 1 ? 1.7 : 1);
    } else if (!available.length && this.enemies.length === 0) {
      this.waveIndex = (this.waveIndex + 1) % this.waves.length; this.beginWave();
    }

    this.fireIn -= dt;
    if (this.fireIn <= 0) {
      const origin = new Vec3(player.x + 78, player.y);
      if (this.weapon === 'laser') this.spawnPlayerBullet(origin, new Vec3(760, 0), 'laser');
      else if (this.weapon === 'plasma') {
        this.spawnPlayerBullet(origin, new Vec3(660, 0), 'plasma'); this.spawnPlayerBullet(origin, new Vec3(650, 135), 'plasma'); this.spawnPlayerBullet(origin, new Vec3(650, -135), 'plasma');
      } else if (this.weapon === 'rocket') this.spawnPlayerBullet(origin, new Vec3(620, 0), 'rocket');
      else if (this.rapidTimer > 0 && this.spreadTimer > 0) {
        this.spawnPlayerBullet(origin, new Vec3(620, 0), 'rocket'); this.spawnPlayerBullet(origin, new Vec3(660, 145), 'plasma'); this.spawnPlayerBullet(origin, new Vec3(660, -145), 'plasma');
      } else if (this.spreadTimer > 0) {
        this.spawnPlayerBullet(origin, new Vec3(660, 0), 'plasma'); this.spawnPlayerBullet(origin, new Vec3(650, 135), 'plasma'); this.spawnPlayerBullet(origin, new Vec3(650, -135), 'plasma');
      } else this.spawnPlayerBullet(origin, new Vec3(700, 0), this.rapidTimer > 0 ? 'laser' : 'normal');
      result.playerShot = true;
      this.fireIn = this.weapon === 'laser' ? .1 : this.weapon === 'rocket' ? .42 : this.rapidTimer > 0 ? .1 : .2;
    }

    for (const enemy of this.enemies) {
      if (enemy.controller.tick(dt, worldSpeed, wave.enemySpeedScale, wave.fireRateScale)) { this.enemyFire(enemy.controller, player); result.enemyShot = true; }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.node.setPosition(bullet.node.position.x + bullet.velocity.x * dt, bullet.node.position.y + bullet.velocity.y * dt);
      if (bullet.friendly) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j].controller;
          if (Math.abs(bullet.node.position.x - enemy.node.position.x) >= enemy.halfWidth || Math.abs(bullet.node.position.y - enemy.node.position.y) >= enemy.halfHeight) continue;
          this.releaseBullet(i);
          if (enemy.hit(bullet.damage)) {
            const position = enemy.node.position.clone(); result.destroyed.push(position); this.releaseEnemy(j);
            if (Math.random() < this.dropChance) this.spawnPowerUp(position);
          }
          break;
        }
      } else {
        const dx = bullet.node.position.x - player.x; const dy = bullet.node.position.y - player.y;
        if (dx * dx + dy * dy < 25 * 25) { result.playerHit = true; this.releaseBullet(i); }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i].controller;
      if (Math.abs(enemy.node.position.x - player.x) < enemy.halfWidth + 42 && Math.abs(enemy.node.position.y - player.y) < enemy.halfHeight + 22) { result.playerHit = true; this.releaseEnemy(i); }
      else if (enemy.node.position.x < -760) this.releaseEnemy(i);
    }
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const item = this.powerUps[i]; item.node.setPosition(item.node.position.x - 105 * dt, item.node.position.y);
      const dx = item.node.position.x - player.x; const dy = item.node.position.y - player.y;
      if (dx * dx + dy * dy < 48 * 48) { result.powerUps.push(item.kind); this.releasePowerUp(i); }
      else if (item.node.position.x < -720) this.releasePowerUp(i);
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const p = this.bullets[i].node.position; if (p.x < -720 || p.x > 720 || Math.abs(p.y) > 390) this.releaseBullet(i);
    }
    return result;
  }

  reset(waves: WaveConfig[] = [DEFAULT_WAVE], dropChance = .12, powerUpWeights: PowerUpWeights = DEFAULT_POWER_UP_WEIGHTS, baseWeapon: PlayerBulletKind = 'normal'): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) this.releaseEnemy(i);
    for (let i = this.bullets.length - 1; i >= 0; i--) this.releaseBullet(i);
    for (let i = this.powerUps.length - 1; i >= 0; i--) this.releasePowerUp(i);
    this.waves = waves.length ? waves : [DEFAULT_WAVE]; this.waveIndex = 0; this.dropChance = dropChance; this.powerUpWeights = powerUpWeights;
    this.fireIn = .15; this.rapidTimer = 0; this.spreadTimer = 0; this.baseWeapon = baseWeapon; this.weapon = baseWeapon; this.weaponTimer = 0; this.beginWave();
  }

  applyPowerUp(kind: PowerUpKind): void {
    if (kind === 'rapid') this.rapidTimer = 8;
    if (kind === 'spread') this.spreadTimer = 8;
    if (kind === 'laser' || kind === 'plasma' || kind === 'rocket') { this.weapon = kind; this.weaponTimer = 10; }
  }

  spawnTestPowerUps(player: Vec3): void {
    (['repair', 'shield', 'rapid', 'spread', 'laser', 'plasma', 'rocket'] as PowerUpKind[])
      .forEach((kind, index) => this.spawnPowerUp(new Vec3(player.x + 180 + index * 90, player.y), kind));
  }

  private beginWave(): void {
    const wave = this.waves[this.waveIndex] ?? DEFAULT_WAVE;
    if (wave.formationPattern === 'custom' && wave.customFormation?.length) {
      this.remaining = { truck: 0, fighter: 0, bomber: 0, diveBomber: 0, tank: 0, rocketTruck: 0, interceptor: 0 };
      for (const slot of wave.customFormation) this.spawnEnemy(slot.kind, new Vec3(720 + Math.max(0, Math.min(7, slot.col)) * 86, 220 - Math.max(0, Math.min(4, slot.row)) * 105));
      this.spawnIn = .8; return;
    }
    this.remaining = {
      truck: Math.max(0, wave.truckCount), fighter: Math.max(0, wave.fighterCount), bomber: Math.max(0, wave.bomberCount ?? 0),
      diveBomber: Math.max(0, wave.diveBomberCount ?? 0), tank: Math.max(0, wave.tankCount ?? 0), rocketTruck: Math.max(0, wave.rocketTruckCount ?? 0), interceptor: Math.max(0, wave.interceptorCount ?? 0),
    }; this.spawnIn = .8;
  }

  private spawnFormation(kind: EnemyKind, count: number, configured: FormationPattern): void {
    const ground = kind === 'truck' || kind === 'tank' || kind === 'rocketTruck';
    const pattern: FormationPattern = ground ? 'convoy' : configured === 'auto' ? (['v', 'line', 'echelon'] as FormationPattern[])[Math.floor(Math.random() * 3)] : configured === 'custom' ? 'line' : configured;
    const baseY = ground ? -270 : (kind === 'bomber' ? 140 + Math.random() * 70 : (Math.random() * 2 - 1) * 130);
    for (let i = 0; i < count; i++) {
      const slot = i - (count - 1) / 2;
      const x = pattern === 'v' ? 720 + Math.abs(slot) * 78 : 720 + i * (pattern === 'convoy' ? 115 : 78);
      const offsetY = pattern === 'v' ? slot * 58 : pattern === 'echelon' ? slot * 45 : 0;
      this.spawnEnemy(kind, new Vec3(x, ground ? baseY : Math.max(-220, Math.min(220, baseY + offsetY))));
    }
  }

  private spawnEnemy(kind: EnemyKind, position?: Vec3): void {
    const poolKey = `enemy-${kind}`; const node = this.pool.acquire(poolKey, this.enemyPrefabs[kind], this.layer);
    const controller = node.getComponent(EnemyController) ?? node.addComponent(EnemyController);
    const ground = kind === 'truck' || kind === 'tank' || kind === 'rocketTruck'; const y = ground ? -270 : (kind === 'bomber' ? 140 + Math.random() * 80 : (Math.random() * 2 - 1) * 190);
    controller.setup(kind, position ?? new Vec3(720, y)); this.enemies.push({ controller, poolKey });
  }

  private enemyFire(enemy: EnemyController, player: Vec3): void {
    const gun = enemy.node.getChildByName('GunPoint');
    const origin = new Vec3(enemy.node.position.x + (gun?.position.x ?? -50), enemy.node.position.y + (gun?.position.y ?? 0));
    const dx = player.x - origin.x; const dy = player.y - origin.y; const length = Math.max(1, Math.hypot(dx, dy));
    this.spawnEnemyBullet(origin, new Vec3(dx / length * 290, dy / length * 290));
  }

  private spawnPlayerBullet(position: Vec3, velocity: Vec3, kind: PlayerBulletKind): void {
    const poolKey = `player-bullet-${kind}`; const node = this.pool.acquire(poolKey, this.playerBulletPrefabs[kind], this.layer); node.setPosition(position);
    node.setRotationFromEuler(0, 0, Math.atan2(velocity.y, velocity.x) * 180 / Math.PI); this.bullets.push({ node, velocity, friendly: true, poolKey, damage: kind === 'rocket' ? 3 : 1 });
  }

  private spawnEnemyBullet(position: Vec3, velocity: Vec3): void {
    const poolKey = 'enemy-bullet'; const node = this.pool.acquire(poolKey, this.enemyBulletPrefab, this.layer); node.setPosition(position);
    node.setRotationFromEuler(0, 0, Math.atan2(velocity.y, velocity.x) * 180 / Math.PI); this.bullets.push({ node, velocity, friendly: false, poolKey, damage: 1 });
  }

  private spawnPowerUp(position: Vec3, forcedKind?: PowerUpKind): void {
    const kinds = Object.keys(this.powerUpWeights) as PowerUpKind[]; const total = kinds.reduce((sum, kind) => sum + Math.max(0, this.powerUpWeights[kind]), 0);
    let roll = Math.random() * total; const kind = forcedKind ?? (total > 0 ? kinds.find(item => (roll -= Math.max(0, this.powerUpWeights[item])) <= 0) ?? 'repair' : 'repair');
    const node = this.pool.acquire('powerup', this.powerUpPrefab, this.layer); node.setPosition(position);
    const icon = node.getChildByName('Icon') ?? node; const sprite = icon.getComponent(Sprite) ?? icon.addComponent(Sprite);
    icon.getComponent(UITransform)?.setContentSize(52, 52); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = this.powerFrames.get(kind) ?? null;
    this.powerUps.push({ node, kind });
  }

  private releaseEnemy(index: number): void { const enemy = this.enemies[index]; this.pool.release(enemy.poolKey, enemy.controller.node); this.enemies.splice(index, 1); }
  private releaseBullet(index: number): void { const bullet = this.bullets[index]; this.pool.release(bullet.poolKey, bullet.node); this.bullets.splice(index, 1); }
  private releasePowerUp(index: number): void { this.pool.release('powerup', this.powerUps[index].node); this.powerUps.splice(index, 1); }
}
