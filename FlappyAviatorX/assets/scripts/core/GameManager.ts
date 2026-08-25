import { _decorator, AudioClip, AudioSource, Camera, Canvas, Color, Component, director, game, Graphics, instantiate, Layers, Node, NodePool, Prefab, ResolutionPolicy, resources, Sprite, SpriteFrame, sys, UITransform, Vec3, view } from 'cc';
import { Events, gameEvents } from './GameEvents';
import { GAME_HEIGHT, GAME_WIDTH, GameState, GROUND_Y, LevelConfig } from './GameTypes';
import { PlayerController } from '../gameplay/PlayerController';
import { PipeController } from '../gameplay/PipeController';
import { DashItem } from '../gameplay/DashItem';
import { EffectManager } from '../gameplay/EffectManager';
import { GameOverView } from '../ui/GameOverView';
import { LevelManager } from './LevelManager';
import { LevelCompleteView } from '../ui/LevelCompleteView';
const { ccclass, property } = _decorator;

const FALLBACK_LEVEL: LevelConfig = {
    id: 1, theme: 'day', pipePattern: 'random', pipeSpeed: 205, spawnInterval: 1.7, gapSize: 320,
    gapCenterMin: -220, gapCenterMax: 260, backgroundSpeed: 35,
    patternAmplitude: 220, patternStep: .9, gravity: -1500, flapVelocity: 520, maxFallSpeed: -760,
    itemSpawnChance: .18, dashDuration: 2.4, targetScore: 20, specialObstacles: false,
};

@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager | null = null;

    @property(Prefab) playerPrefab: Prefab | null = null;
    @property(Prefab) pipePrefab: Prefab | null = null;
    @property(Prefab) dashItemPrefab: Prefab | null = null;
    @property(Prefab) scorePrefab: Prefab | null = null;
    @property(Prefab) mainMenuPrefab: Prefab | null = null;
    @property(Prefab) gameOverPrefab: Prefab | null = null;
    @property(Prefab) levelCompletePrefab: Prefab | null = null;
    @property(Prefab) backgroundPrefab: Prefab | null = null;
    @property(AudioClip) propellerClip: AudioClip | null = null;

    state = GameState.Menu;
    level = FALLBACK_LEVEL;
    score = 0;
    dashLeft = 0;

    private canvas!: Node;
    private backgroundLayer!: Node;
    private skyNode: Node | null = null;
    private cloudTiles: Node[] = [];
    private treeTiles: Node[] = [];
    private grassTiles: Node[] = [];
    private pipeLayer!: Node;
    private itemLayer!: Node;
    private roleLayer!: Node;
    private uiLayer!: Node;
    private menuLayer!: Node;
    private player!: PlayerController;
    effects!: EffectManager;
    private pipePool = new NodePool();
    private itemPool = new NodePool();
    private spawnClock = 0;
    private spawnIndex = 0;
    private menuNode: Node | null = null;
    private hudNode: Node | null = null;
    private gameOverNode: Node | null = null;
    private levelCompleteNode: Node | null = null;
    private propellerAudio!: AudioSource;
    private themeLoadToken = 0;
    private defaultBackgroundFrames: Record<string, SpriteFrame | null> = {};

    get isPlaying() { return this.state === GameState.Playing; }
    get worldSpeed() { return this.level.pipeSpeed * (this.dashLeft > 0 ? 2.35 : 1); }

    onLoad() {
        GameManager.instance = this;
        this.propellerAudio = this.node.addComponent(AudioSource);
        this.propellerAudio.clip = this.propellerClip;
        this.propellerAudio.loop = true;
        this.propellerAudio.playOnAwake = false;
        this.buildScene();
        this.bindEvents();
        LevelManager.load(LevelManager.selectedId).then(level => this.level = level, () => this.level = FALLBACK_LEVEL).then(() => {
            this.applyBackgroundTheme(this.level.theme);
            const autoStart = sys.localStorage.getItem('flappy-autostart') === '1';
            sys.localStorage.removeItem('flappy-autostart');
            autoStart ? this.startGame() : this.showMenu();
        });
    }

    onDestroy() {
        this.propellerAudio?.stop();
        if (GameManager.instance === this) GameManager.instance = null;
        gameEvents.targetOff(this);
    }

    update(dt: number) {
        const speed = this.level.backgroundSpeed * (this.dashLeft > 0 ? 2.8 : 1);
        this.scrollTiles(this.cloudTiles, speed * .35, dt);
        this.scrollTiles(this.treeTiles, speed * .7, dt);
        this.scrollTiles(this.grassTiles, speed * 2.2, dt);
        if (!this.isPlaying) return;
        this.spawnClock += dt;
        if (this.spawnClock >= this.level.spawnInterval) { this.spawnClock = 0; this.spawnPipe(); }
        if (this.dashLeft > 0) {
            this.dashLeft -= dt;
            if (this.dashLeft <= 0) this.setDash(false);
        }
        this.checkCollisionsAndScore();
    }

    startGame() {
        this.clearWorld();
        this.state = GameState.Playing; this.score = 0; this.spawnIndex = 0; this.spawnClock = this.level.spawnInterval * .35;
        this.hidePanels();
        this.hudNode && (this.hudNode.active = true); gameEvents.emit(Events.SCORE, 0);
        this.player.configure(this.level); this.player.resetPlayer();
        if (this.propellerClip) this.propellerAudio.play();
    }

    gameOver() {
        if (!this.isPlaying) return;
        this.propellerAudio.stop();
        this.state = GameState.GameOver; this.setDash(false); this.player.velocity = 0;
        const best = Math.max(this.score, Number(sys.localStorage.getItem('flappy-aviatorx-best') || 0));
        sys.localStorage.setItem('flappy-aviatorx-best', `${best}`);
        if (!this.gameOverNode) { this.gameOverNode = this.make(this.gameOverPrefab, this.menuLayer, 'GameOverPanel'); }
        this.gameOverNode.active = true;
        this.gameOverNode.getComponent(GameOverView)?.show(this.score, best);
    }

    recyclePipe(node: Node) { if (node.isValid && node.parent) this.pipePool.put(node); }
    recycleItem(node: Node) { if (node.isValid && node.parent) this.itemPool.put(node); }

    private bindEvents() {
        gameEvents.on(Events.START, this.startGame, this);
        gameEvents.on(Events.RESTART, this.startGame, this);
        gameEvents.on(Events.MENU, this.showMenu, this);
        gameEvents.on(Events.LEVEL_SELECT, () => director.loadScene('LevelSelect'), this);
        gameEvents.on(Events.NEXT_LEVEL, this.nextLevel, this);
        gameEvents.on(Events.QUIT, () => { this.propellerAudio.stop(); game.end(); }, this);
    }

    private buildScene() {
        view.setDesignResolutionSize(GAME_WIDTH, GAME_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        this.canvas = new Node('Canvas'); this.canvas.layer = Layers.Enum.UI_2D; this.canvas.parent = this.node;
        this.canvas.addComponent(UITransform).setContentSize(GAME_WIDTH, GAME_HEIGHT);
        const canvas = this.canvas.addComponent(Canvas);
        const cameraNode = new Node('Camera'); cameraNode.parent = this.canvas; cameraNode.layer = Layers.Enum.UI_2D;
        const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO; camera.orthoHeight = GAME_HEIGHT / 2; camera.visibility = Layers.Enum.UI_2D; canvas.cameraComponent = camera;
        this.backgroundLayer = this.layer('BackgroundLayer'); this.buildBackground();
        this.pipeLayer = this.layer('ObstacleLayer'); this.itemLayer = this.layer('ItemLayer');
        const effectLayer = this.layer('EffectLayer'); this.effects = effectLayer.addComponent(EffectManager);
        this.roleLayer = this.layer('RoleLayer'); this.uiLayer = this.layer('UILayer'); this.menuLayer = this.layer('MenuLayer');
        this.player = this.make(this.playerPrefab, this.roleLayer, 'Player').getComponent(PlayerController)!;
        this.player.node.active = false;
        this.canvas.on(Node.EventType.TOUCH_START, () => this.player.flap());
        this.canvas.on(Node.EventType.MOUSE_DOWN, () => this.player.flap());
        this.hudNode = this.make(this.scorePrefab, this.uiLayer, 'ScoreHUD'); this.hudNode.setPosition(0, 550); this.hudNode.active = false;
    }

    private showMenu() {
        this.propellerAudio.stop();
        this.state = GameState.Menu; this.clearWorld(); this.player.node.active = false;
        this.hidePanels();
        if (!this.menuNode) this.menuNode = this.make(this.mainMenuPrefab, this.menuLayer, 'MainMenu');
        this.menuNode.active = true;
    }

    private nextLevel() {
        const next = LevelManager.next(this.level.id);
        if (!next || !LevelManager.isUnlocked(next.id)) return;
        LevelManager.selectedId = next.id;
        this.level = next;
        this.applyBackgroundTheme(next.theme);
        this.startGame();
    }

    private completeLevel() {
        if (!this.isPlaying) return;
        this.propellerAudio.stop();
        this.state = GameState.LevelComplete; this.setDash(false); this.player.velocity = 0;
        const next = LevelManager.unlockNext(this.level.id);
        this.hudNode && (this.hudNode.active = false);
        if (!this.levelCompleteNode) this.levelCompleteNode = this.make(this.levelCompletePrefab, this.menuLayer, 'LevelCompletePanel');
        this.levelCompleteNode.active = true;
        this.levelCompleteNode.getComponent(LevelCompleteView)?.show(this.level.id, this.score, !!next);
    }

    private spawnPipe() {
        const node = this.pipePool.size() ? this.pipePool.get()! : this.make(this.pipePrefab, this.pipeLayer, 'PipePair');
        node.parent = this.pipeLayer;
        const y = this.nextGapCenter();
        node.getComponent(PipeController)?.resetAt(430, y, this.level.gapSize);
        if (Math.random() < this.level.itemSpawnChance) {
            const item = this.itemPool.size() ? this.itemPool.get()! : this.make(this.dashItemPrefab, this.itemLayer, 'DashItem');
            item.parent = this.itemLayer; item.getComponent(DashItem)?.resetAt(650, y);
        }
    }

    private nextGapCenter() {
        const { gapCenterMin: min, gapCenterMax: max, pipePattern, patternAmplitude, patternStep } = this.level;
        const index = this.spawnIndex++;
        if (pipePattern === 'alternating') return index % 2 ? max : min;
        if (pipePattern === 'wave') {
            const middle = (min + max) * .5;
            const amplitude = Math.min((max - min) * .5, patternAmplitude);
            return middle + Math.sin(index * patternStep) * amplitude;
        }
        return min + Math.random() * (max - min);
    }

    private checkCollisionsAndScore() {
        const p = this.player.node.position;
        for (const node of [...this.pipeLayer.children]) {
            const pipe = node.getComponent(PipeController); if (!pipe) continue;
            if (!pipe.scored && node.position.x < p.x) {
                pipe.scored = true; this.score++; gameEvents.emit(Events.SCORE, this.score);
                if (this.level.targetScore > 0 && this.score >= this.level.targetScore) { this.completeLevel(); return; }
            }
            if (pipe.collides(p)) {
                if (this.dashLeft > 0) { this.effects.burst(new Vec3(node.position.x, p.y)); this.recyclePipe(node); }
                else { this.gameOver(); return; }
            }
        }
        for (const node of [...this.itemLayer.children]) {
            if (Math.abs(node.position.x - p.x) < 48 && Math.abs(node.position.y - p.y) < 45) { this.recycleItem(node); this.setDash(true); }
        }
    }

    private setDash(active: boolean) {
        this.dashLeft = active ? this.level.dashDuration : 0;
        this.player?.setDash(active); this.effects?.showDash(active);
    }

    private clearWorld() {
        for (const n of [...this.pipeLayer?.children ?? []]) this.pipePool.put(n);
        for (const n of [...this.itemLayer?.children ?? []]) this.itemPool.put(n);
        this.setDash(false);
    }

    private hidePanels() {
        this.hudNode && (this.hudNode.active = false);
        this.menuNode && (this.menuNode.active = false);
        this.gameOverNode && (this.gameOverNode.active = false);
        this.levelCompleteNode && (this.levelCompleteNode.active = false);
    }

    private layer(name: string) { const n = new Node(name); n.layer = Layers.Enum.UI_2D; n.parent = this.canvas; n.addComponent(UITransform).setContentSize(GAME_WIDTH, GAME_HEIGHT); return n; }
    private make(prefab: Prefab | null, parent: Node, name: string) { if (!prefab) throw new Error(`${name} prefab is not assigned`); const n = instantiate(prefab); n.parent = parent; n.layer = Layers.Enum.UI_2D; return n; }

    private buildBackground() {
        this.drawFallbackBackground(this.backgroundLayer);
        if (!this.backgroundPrefab) return;
        const background = instantiate(this.backgroundPrefab); background.parent = this.backgroundLayer;
        this.skyNode = background.getChildByName('Sky');
        this.cloudTiles = background.getChildByName('CloudLayer')?.children ?? [];
        this.treeTiles = background.getChildByName('DistantTreeLayer')?.children ?? [];
        this.grassTiles = background.getChildByName('GrassLayer')?.children ?? [];
        this.defaultBackgroundFrames = {
            sky: this.skyNode?.getComponent(Sprite)?.spriteFrame ?? null,
            clouds: this.cloudTiles[0]?.getComponent(Sprite)?.spriteFrame ?? null,
            'distant-trees': this.treeTiles[0]?.getComponent(Sprite)?.spriteFrame ?? null,
            grass: this.grassTiles[0]?.getComponent(Sprite)?.spriteFrame ?? null,
        };
    }

    private applyBackgroundTheme(theme: LevelConfig['theme']) {
        const token = ++this.themeLoadToken;
        if (theme === 'day') { this.setBackgroundFrames(this.defaultBackgroundFrames); return; }
        const names = ['sky', 'clouds', 'distant-trees', 'grass'];
        Promise.all(names.map(name => new Promise<[string, SpriteFrame | null]>(resolve => {
            resources.load(`art/background/themes/${theme}/${name}/spriteFrame`, SpriteFrame,
                (error, frame) => resolve([name, error ? null : frame]));
        }))).then(entries => {
            if (token !== this.themeLoadToken) return;
            const frames: Record<string, SpriteFrame | null> = {};
            for (const [name, frame] of entries) frames[name] = frame;
            this.setBackgroundFrames(frames);
        });
    }

    private setBackgroundFrames(frames: Record<string, SpriteFrame | null>) {
        const apply = (nodes: Node[], frame: SpriteFrame | null) => {
            if (!frame) return;
            for (const node of nodes) { const sprite = node.getComponent(Sprite); if (sprite) sprite.spriteFrame = frame; }
        };
        apply(this.skyNode ? [this.skyNode] : [], frames.sky);
        apply(this.cloudTiles, frames.clouds);
        apply(this.treeTiles, frames['distant-trees']);
        apply(this.grassTiles, frames.grass);
    }

    private scrollTiles(tiles: Node[], speed: number, dt: number) {
        if (!tiles.length) return;
        for (const tile of tiles) tile.setPosition(tile.position.x - speed * dt, tile.position.y);
        for (const tile of tiles) {
            if (tile.position.x > -810) continue;
            const rightmost = tiles.reduce((right, other) => other.position.x > right.position.x ? other : right);
            tile.setPosition(rightmost.position.x + 900, tile.position.y);
            tile.setScale(-rightmost.scale.x, tile.scale.y, tile.scale.z);
        }
    }

    private drawFallbackBackground(node: Node) {
        const g = node.getComponent(Graphics) ?? node.addComponent(Graphics); g.clear();
        g.fillColor = new Color(87, 170, 205); g.rect(-360, -640, 720, 1280); g.fill();
        g.fillColor = new Color(83, 121, 77); g.rect(-360, GROUND_Y - 80, 720, 110); g.fill();
        g.fillColor = new Color(227, 192, 92); g.rect(-360, GROUND_Y, 720, 22); g.fill();
    }
}
