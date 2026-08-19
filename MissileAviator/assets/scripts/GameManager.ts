import { _decorator, Camera, Canvas, Color, Component, EventMouse, EventTouch, input, Input, Layers, Node, Prefab, resources, UITransform, Vec3, view, ResolutionPolicy } from 'cc';
import { BackgroundScroller } from './BackgroundScroller';
import { EffectManager } from './EffectManager';
import { GameState, LevelConfig, PowerUpKind } from './GameTypes';
import { LevelManager } from './LevelManager';
import { ObjectPoolManager } from './ObjectPoolManager';
import { PlayerController } from './PlayerController';
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
  private ui!: UIManager;
  private speedScale = 1;
  private slowTimer = 0;
  private canvas!: Node;
  private dragging = false;

  async start(): Promise<void> {
    view.setDesignResolutionSize(1280, 720, ResolutionPolicy.SHOW_ALL);
    const canvas = this.createCanvas();
    const backgroundLayer = this.layer('BackgroundLayer');
    const ringLayer = this.layer('RingLayer');
    this.layer('ObstacleLayer');
    const effectLayer = this.layer('EffectLayer');
    const playerLayer = this.layer('PlayerLayer');
    const uiLayer = this.layer('UILayer');
    backgroundLayer.setSiblingIndex(0);
    this.background = backgroundLayer.addComponent(BackgroundScroller);
    this.effects = new EffectManager(effectLayer);
    this.ui = new UIManager(uiLayer, () => this.startGame(), () => this.toMenu());
    await this.levelManager.load(); this.level = this.levelManager.get(1);
    const [playerPrefab, ringPrefab] = await Promise.all([this.loadPrefab('prefabs/Player'), this.loadPrefab('prefabs/Ring')]);
    const playerNode = this.pool.acquire('player', playerPrefab, playerLayer);
    this.player = playerNode.getComponent(PlayerController) ?? playerNode.addComponent(PlayerController);
    this.rings = new RingSpawner(ringLayer, ringPrefab, this.pool);
    this.toMenu();
    input.on(Input.EventType.TOUCH_START, this.onTouch, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouch, this);
    input.on(Input.EventType.TOUCH_END, this.onRelease, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.onRelease, this);
  }

  update(dt: number): void {
    this.background?.scroll(dt, this.level?.backgroundSpeed ?? 45);
    if (this.state !== GameState.Playing) return;
    if (this.player.fly(dt, -292, 292)) return this.endGame();
    if (this.slowTimer > 0 && (this.slowTimer -= dt) <= 0) this.speedScale = 1;
    this.rings.tick(dt, this.level, this.score.score);
    for (const ring of this.rings.active) {
      ring.move(dt, this.speedScale);
      const dx = ring.node.position.x - this.player.node.position.x;
      const dy = ring.node.position.y - this.player.node.position.y;
      const distance = Math.hypot(dx, dy);
      if (!ring.passed && Math.abs(dx) < Math.max(14, ring.speed * dt)) {
        ring.passed = true;
        if (Math.abs(dy) >= ring.radius - 25) { if (this.player.hit()) return this.endGame(); }
        else this.onPass(Math.abs(dy) <= ring.radius * .23, ring.node.position.clone());
      } else if (!ring.passed && Math.abs(distance - ring.radius) < 21 && Math.abs(dx) < ring.radius + 24) {
        if (this.player.hit()) return this.endGame();
      }
    }
    this.rings.recycleOffscreen();
  }

  onDestroy(): void {
    input.off(Input.EventType.TOUCH_START, this.onTouch, this); input.off(Input.EventType.TOUCH_MOVE, this.onTouch, this);
    input.off(Input.EventType.TOUCH_END, this.onRelease, this); input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this); input.off(Input.EventType.MOUSE_UP, this.onRelease, this);
    this.pool.clear();
  }

  applyPowerUp(kind: PowerUpKind): void {
    if (kind === 'shield') this.player.shield++;
    if (kind === 'slow') { this.speedScale = .55; this.slowTimer = 4; }
    if (kind === 'dash') this.effects.text('DASH!', this.player.node.position.clone());
    // magnet is intentionally a no-op until collectible coins are enabled.
  }

  private startGame(): void {
    this.rings.reset(); this.score.reset(); this.speedScale = 1; this.slowTimer = 0;
    this.player.node.active = true; this.player.node.setPosition(-350, 20); this.player.reset();
    this.state = GameState.Playing; this.ui.showPlaying(); this.ui.updateScore(0, 0);
  }

  private endGame(): void {
    if (this.state !== GameState.Playing) return;
    this.state = GameState.GameOver; this.score.fail();
    this.effects.burst(this.player.node.position.clone(), true); this.player.node.active = false;
    this.ui.showGameOver(this.score.score, this.score.best);
  }

  private toMenu(): void { this.state = GameState.Menu; this.rings?.reset(); if (this.player) this.player.node.active = false; this.ui.showMenu(); }

  private onPass(perfect: boolean, position: Vec3): void {
    const gained = this.score.pass(perfect); this.ui.updateScore(this.score.score, this.score.combo);
    this.effects.burst(position, perfect);
    this.effects.text(perfect ? `PERFECT! +${gained}` : '+1', position, undefined, perfect ? 40 : 30);
  }

  private onTouch(event: EventTouch): void {
    if (this.state !== GameState.Playing) return;
    this.player.steerTo(event.getUILocation().y / view.getScaleY() - 360);
  }
  private onMouseDown(event: EventMouse): void { this.dragging = true; this.steerScreenY(event.getLocationY()); }
  private onMouseMove(event: EventMouse): void { if (this.dragging) this.steerScreenY(event.getLocationY()); }
  private onRelease(): void { this.dragging = false; this.player?.release(); }
  private steerScreenY(y: number): void { if (this.state === GameState.Playing) this.player.steerTo(y / view.getScaleY() - 360); }
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
}
