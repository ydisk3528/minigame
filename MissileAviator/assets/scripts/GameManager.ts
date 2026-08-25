import { _decorator, AudioClip, AudioSource, Camera, Canvas, Color, Component, director, EventMouse, EventTouch, input, Input, Layers, Node, Prefab, resources, ResolutionPolicy, SpriteFrame, sys, UITransform, Vec2, Vec3, view } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';
import { BackgroundScroller } from './BackgroundScroller';
import { CombatSystem } from './CombatSystem';
import { EffectManager } from './EffectManager';
import { GameState, LevelConfig, PowerUpKind } from './GameTypes';
import { LevelManager } from './LevelManager';
import { LevelSelectUI } from './LevelSelectUI';
import { NativeAds } from './NativeAds';
import { ObjectPoolManager } from './ObjectPoolManager';
import { PlayerController } from './PlayerController';
import { PlayerProfile } from './PlayerProfile';
import { RingSpawner } from './RingSpawner';
import { ScoreManager } from './ScoreManager';
import { UIManager } from './UIManager';
const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
  private state = GameState.Menu;
  private levelManager = new LevelManager();
  private pool = new ObjectPoolManager();
  private score = new ScoreManager();
  private level!: LevelConfig;
  private player!: PlayerController;
  private rings!: RingSpawner;
  private background!: BackgroundScroller;
  private effects!: EffectManager;
  private combat!: CombatSystem;
  private ui!: UIManager;
  private speedScale = 1;
  private canvas!: Node;
  private dragging = false;
  private activeTouchId: number | null = null;
  private readonly dragDelta = new Vec2();
  private lives = 3;
  private readonly maxHealth = 100;
  private health = 100;
  private readonly hitDamage = 34;
  private adReviveUsed = false;
  private invulnerable = 0;
  private audio!: AudioSource;
  private sfx = new Map<string, AudioClip>();
  private readonly ringsEnabled = false;
  private levelScreen: LevelSelectUI | null = null;

  async start(): Promise<void> {
    view.setDesignResolutionSize(1280, 720, ResolutionPolicy.SHOW_ALL);
    if (this.node.name === 'LevelSelectBootstrap') {
      for (const sibling of this.node.parent?.children ?? []) if (sibling !== this.node) sibling.active = false;
      this.createCanvas(); this.levelScreen = new LevelSelectUI(this.canvas); await this.levelScreen.init(); return;
    }
    const canvas = this.createCanvas();
    const backgroundLayer = this.layer('BackgroundLayer');
    const ringLayer = this.layer('RingLayer');
    const obstacleLayer = this.layer('ObstacleLayer');
    const effectLayer = this.layer('EffectLayer');
    const playerLayer = this.layer('PlayerLayer');
    const uiLayer = this.layer('UILayer');
    backgroundLayer.setSiblingIndex(0);
    this.background = backgroundLayer.addComponent(BackgroundScroller);
    this.effects = new EffectManager(effectLayer);
    this.ui = new UIManager(uiLayer, () => this.startGame(), () => this.toMenu(), () => this.reviveFromAd());
    await this.levelManager.load(); this.level = this.levelManager.get(Number(sys.localStorage.getItem('selectedLevelId')) || 1);
    this.background.setTheme(this.level.backgroundTheme);
    this.audio = this.node.getComponent(AudioSource) ?? this.node.addComponent(AudioSource);
    await Promise.all(['enemyDied', 'enemyShoot', 'playerShoot', 'prop', 'planeDied'].map(async name => this.sfx.set(name, await this.loadAudio(`music/${name}`))));
    this.audio.stop(); this.audio.clip = await this.loadAudio('music/bg'); this.audio.loop = true; this.audio.volume = .35; if (PlayerProfile.load().musicEnabled) this.audio.play();
    const [playerPrefab, ringPrefab, truckPrefab, fighterPrefab, bomberPrefab, diveBomberPrefab, tankPrefab, rocketTruckPrefab, interceptorPrefab,
      playerBulletPrefab, laserBulletPrefab, plasmaBulletPrefab, rocketBulletPrefab, enemyBulletPrefab, powerUpPrefab, healthBarPrefab, testPowerUpsButtonPrefab] = await Promise.all([
      this.loadPrefab('prefabs/Player'), this.loadPrefab('prefabs/Ring'), this.loadPrefab('prefabs/EnemyTruck'),
      this.loadPrefab('prefabs/EnemyFighter'), this.loadPrefab('prefabs/EnemyBomber'), this.loadPrefab('prefabs/EnemyDiveBomber'),
      this.loadPrefab('prefabs/EnemyTank'), this.loadPrefab('prefabs/EnemyRocketTruck'), this.loadPrefab('prefabs/EnemyInterceptor'), this.loadPrefab('prefabs/Bullet'),
      this.loadPrefab('prefabs/LaserBullet'), this.loadPrefab('prefabs/PlasmaBullet'), this.loadPrefab('prefabs/RocketBullet'), this.loadPrefab('prefabs/EnemyBullet'),
      this.loadPrefab('prefabs/PowerUp'), this.loadPrefab('prefabs/HealthBar'), this.loadPrefab('prefabs/TestPowerUpsButton'),
    ]);
    const [revivePanelPrefab, enemyExplosionPrefab, enemyExplosionFrames] = await Promise.all([
      this.loadPrefab('prefabs/RevivePanel'), this.loadPrefab('prefabs/EnemyExplosion'), this.loadFrames('art/effects/enemy-explosion'),
    ]);
    this.effects.setEnemyExplosionAssets(enemyExplosionPrefab, enemyExplosionFrames);
    const playerNode = this.pool.acquire('player', playerPrefab, playerLayer);
    const player = playerNode.getComponent(PlayerController); if (!player) throw new Error('Player.prefab missing PlayerController'); this.player = player;
    playerNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    playerNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    playerNode.on(Node.EventType.TOUCH_END, this.onTouchRelease, this);
    playerNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchRelease, this);
    playerNode.on(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
    this.rings = new RingSpawner(ringLayer, ringPrefab, this.pool);
    this.combat = new CombatSystem(obstacleLayer,
      { truck: truckPrefab, fighter: fighterPrefab, bomber: bomberPrefab, diveBomber: diveBomberPrefab, tank: tankPrefab, rocketTruck: rocketTruckPrefab, interceptor: interceptorPrefab },
      { normal: playerBulletPrefab, laser: laserBulletPrefab, plasma: plasmaBulletPrefab, rocket: rocketBulletPrefab },
      enemyBulletPrefab, powerUpPrefab, this.pool);
    this.ui.attachHealthBar(healthBarPrefab);
    this.ui.attachRevivePanel(revivePanelPrefab);
    if (EDITOR || PREVIEW) this.ui.attachTestButton(testPowerUpsButtonPrefab, () => { if (this.state === GameState.Playing) this.combat.spawnTestPowerUps(this.player.node.position); });
    if (sys.localStorage.getItem('autoStart') === '1') { sys.localStorage.removeItem('autoStart'); this.startGame(); } else director.loadScene('Start');
    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseRelease, this);
  }

  update(dt: number): void {
    this.background?.scroll(dt, this.level?.backgroundSpeed ?? 45);
    if (this.state !== GameState.Playing) return;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.player.fly(dt);
    if (this.ringsEnabled) {
      this.rings.tick(dt, this.level, this.score.score);
      for (const ring of this.rings.active) {
        ring.move(dt, this.speedScale);
        const dx = ring.node.position.x - this.player.node.position.x;
        const dy = ring.node.position.y - this.player.node.position.y;
        if (!ring.passed && Math.abs(dx) < Math.max(14, ring.speed * dt)) {
          ring.passed = true;
          if (Math.abs(dy) >= ring.radius - 25) { if (this.takeDamage()) return; }
          else this.onPass(Math.abs(dy) <= ring.radius * .23, ring.node.position.clone());
        }
      }
      this.rings.recycleOffscreen();
    }
    const combat = this.combat.tick(dt, this.level.ringSpeed * this.speedScale, this.player.node.position);
    if (combat.playerShot) this.playSfx('playerShoot', .22);
    if (combat.enemyShot) this.playSfx('enemyShoot', .28);
    for (const position of combat.destroyed) this.onEnemyDestroyed(position);
    for (const kind of combat.powerUps) this.applyPowerUp(kind);
    if (combat.playerHit) this.takeDamage();
  }

  onDestroy(): void {
    this.levelScreen?.destroy();
    const playerNode = this.player?.node;
    playerNode?.off(Node.EventType.TOUCH_START, this.onTouchStart, this); playerNode?.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    playerNode?.off(Node.EventType.TOUCH_END, this.onTouchRelease, this); playerNode?.off(Node.EventType.TOUCH_CANCEL, this.onTouchRelease, this);
    playerNode?.off(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this); input.off(Input.EventType.MOUSE_UP, this.onMouseRelease, this);
    this.combat?.reset();
    this.pool.clear();
  }

  applyPowerUp(kind: PowerUpKind): void {
    if (kind === 'repair') { this.health = Math.min(this.maxHealth, this.health + 40); this.ui.updateHealth(this.health, this.maxHealth); }
    if (kind === 'shield') this.player.shield++;
    this.combat.applyPowerUp(kind);
    this.playSfx('prop', .75);
    this.effects.text(kind.toUpperCase(), this.player.node.position.clone());
  }

  private startGame(): void {
    NativeAds.hideBanner();
    this.unscheduleAllCallbacks();
    const profile = PlayerProfile.load();
    this.rings.reset(); this.combat.reset(this.level.waves, this.level.powerUpChance, this.level.powerUpWeights, profile.equippedWeapon); this.score.reset(); this.speedScale = 1; this.lives = 3; this.health = this.maxHealth; this.adReviveUsed = false; this.invulnerable = 0; this.dragging = false; this.activeTouchId = null;
    this.player.node.active = true; this.player.node.setPosition(-350, 20); this.player.reset();
    this.ui.updateHealth(this.health, this.maxHealth);
    this.state = GameState.Playing; this.ui.showPlaying(); this.ui.updateScore(0, 0); this.ui.updateLives(this.lives);
  }

  private endGame(): void {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.GameOver; this.score.fail();
    this.player.node.active = false;
    this.ui.showGameOver(this.score.score, this.score.best, !this.adReviveUsed);
    NativeAds.showBanner();
  }

  private toMenu(): void { director.loadScene('Start'); }

  private onPass(perfect: boolean, position: Vec3): void {
    const gained = this.score.pass(perfect); this.ui.updateScore(this.score.score, this.score.combo);
    this.effects.burst(position, perfect);
    this.effects.text(perfect ? `PERFECT! +${gained}` : '+1', position, undefined, perfect ? 40 : 30);
    if (this.score.score >= this.level.targetScore) this.completeLevel();
  }

  private onEnemyDestroyed(position: Vec3): void {
    this.score.pass(false); this.ui.updateScore(this.score.score, this.score.combo);
    PlayerProfile.addCoins(1); this.effects.enemyExplosion(position); this.effects.text('+1', position, undefined, 28); this.playSfx('enemyDied', .6);
    if (this.score.score >= this.level.targetScore) this.completeLevel();
  }

  private completeLevel(): void {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.GameOver; this.score.fail(); PlayerProfile.completeLevel(this.level.id); this.player.node.active = false;
    const levels = this.levelManager.all(); const nextLevel = levels[levels.indexOf(this.level) + 1];
    this.ui.showLevelComplete(this.score.score, this.score.best, nextLevel?.id);
    if (!nextLevel) return;
    sys.localStorage.setItem('selectedLevelId', String(nextLevel.id)); sys.localStorage.setItem('autoStart', '1');
    this.scheduleOnce(() => director.loadScene('Main'), 1.8);
  }

  private takeDamage(): boolean {
    if (this.invulnerable > 0) return false;
    if (!this.player.hit()) { this.invulnerable = .6; return false; }
    this.health = Math.max(0, this.health - this.hitDamage); this.ui.updateHealth(this.health, this.maxHealth);
    this.invulnerable = .55; this.player.startBlink(.2);
    this.effects.text(`-${this.hitDamage} HP`, this.player.node.position.clone(), new Color('#ff8a74'), 24);
    if (this.health > 0) return false;
    const deathPosition = this.player.node.position.clone(); this.playSfx('planeDied', .85); this.effects.explosion(deathPosition);
    this.lives--; this.ui.updateLives(this.lives);
    if (this.lives <= 0) { this.endGame(); return true; }
    this.health = this.maxHealth; this.ui.updateHealth(this.health, this.maxHealth);
    this.dragging = false; this.activeTouchId = null; this.invulnerable = 5;
    this.player.node.setPosition(-350, 20); this.player.reset(); this.player.startBlink(5);
    this.effects.text('READY!', this.player.node.position.clone(), new Color('#63e7ff'), 32);
    return false;
  }

  private reviveFromAd(): void {
    if (this.state !== GameState.GameOver || this.adReviveUsed) return;
    this.ui.setReviveBusy(true);
    NativeAds.showVideo(success => {
      if (this.state !== GameState.GameOver) return;
      if (!success) { this.ui.setReviveBusy(false, true); return; }
      const profile = PlayerProfile.load(); this.adReviveUsed = true; this.lives = 1; this.health = this.maxHealth; this.invulnerable = 5;
      NativeAds.hideBanner();
      this.combat.reset(this.level.waves, this.level.powerUpChance, this.level.powerUpWeights, profile.equippedWeapon);
      this.player.node.active = true; this.player.node.setPosition(-350, 20); this.player.reset(); this.player.startBlink(5);
      this.state = GameState.Playing; this.ui.showPlaying(); this.ui.updateLives(this.lives); this.ui.updateHealth(this.health, this.maxHealth); this.ui.setReviveBusy(false);
    });
  }

  private onTouchStart(event: EventTouch): void {
    if (this.state !== GameState.Playing || this.activeTouchId !== null) return;
    this.activeTouchId = event.getID(); this.dragging = true;
  }
  private onTouchMove(event: EventTouch): void {
    if (!this.dragging || event.getID() !== this.activeTouchId) return;
    this.movePlayerTo(event);
  }
  private onTouchRelease(event: EventTouch): void {
    if (event.getID() !== this.activeTouchId) return;
    this.activeTouchId = null; this.endDrag();
  }
  private onMouseDown(): void { if (this.state === GameState.Playing && this.activeTouchId === null) this.dragging = true; }
  private onMouseMove(event: EventMouse): void {
    if (!this.dragging || this.activeTouchId !== null) return;
    this.movePlayerTo(event);
  }
  private onMouseRelease(): void { if (this.activeTouchId === null) this.endDrag(); }
  private endDrag(): void { this.dragging = false; this.player?.release(); }
  private movePlayerTo(event: EventTouch | EventMouse): void {
    const delta = event.getUIDelta(this.dragDelta); const position = this.player.node.position;
    this.player.moveTo(position.x + delta.x, position.y + delta.y, -540, 120, -270, 270);
  }
  private layer(name: string): Node { const node = new Node(name); node.layer = Layers.Enum.UI_2D; node.setParent(this.canvas); node.addComponent(UITransform).setContentSize(1280, 720); return node; }
  private createCanvas(): Node {
    this.canvas = new Node('Canvas'); this.canvas.layer = Layers.Enum.UI_2D; this.canvas.setParent(this.node);
    this.canvas.addComponent(UITransform).setContentSize(1280, 720);
    const cameraNode = new Node('Camera'); cameraNode.layer = Layers.Enum.UI_2D; cameraNode.setParent(this.canvas); cameraNode.setPosition(0, 0, 1000);
    const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO; camera.orthoHeight = 360;
    camera.visibility = Layers.Enum.UI_2D; camera.clearColor = new Color('#65b9e8');
    this.canvas.addComponent(Canvas).cameraComponent = camera;
    return this.canvas;
  }
  private loadPrefab(path: string): Promise<Prefab> { return new Promise((resolve, reject) => resources.load(path, Prefab, (e, asset) => e ? reject(e) : resolve(asset))); }
  private loadAudio(path: string): Promise<AudioClip> { return new Promise((resolve, reject) => resources.load(path, AudioClip, (e, asset) => e ? reject(e) : resolve(asset))); }
  private loadFrame(path: string): Promise<SpriteFrame> { return new Promise((resolve, reject) => resources.load(`${path}/spriteFrame`, SpriteFrame, (e, asset) => e ? reject(e) : resolve(asset))); }
  private loadFrames(path: string): Promise<SpriteFrame[]> { return new Promise((resolve, reject) => resources.loadDir(path, SpriteFrame, (e, assets) => e ? reject(e) : resolve(assets.sort((a, b) => a.name.localeCompare(b.name))))); }
  private playSfx(name: string, volume = 1): void { const clip = this.sfx.get(name); if (clip && PlayerProfile.load().sfxEnabled) this.audio.playOneShot(clip, volume); }
}
