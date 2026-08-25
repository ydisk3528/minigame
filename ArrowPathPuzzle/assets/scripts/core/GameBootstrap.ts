import {
    _decorator, BlockInputEvents, Camera, Canvas, Color, Component, EventTouch, Graphics, JsonAsset, Label, Layers, Mask, Node, Prefab,
    ResolutionPolicy, resources, Sprite, SpriteFrame, sys, UITransform, view, Vec3,
} from 'cc';
import { AudioManager } from '../audio/AudioManager';
import { BoardManager } from '../board/BoardManager';
import { eventBus, GameEvent } from './EventBus';
import { LegacyLevelConfig, convertLegacyLevel } from '../ported/Level';
import { GameMenu } from '../ported/GameMenu';
import { LevelData } from '../data/LevelData';
const { ccclass, property } = _decorator;

@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    @property(Prefab) arrowPathPrefab: Prefab | null = null;
    @property levelNumber = 2;

    private canvas!: Node;
    private board!: BoardManager;
    private audio!: AudioManager;
    private menu!: GameMenu;
    private lives = 3;

    async start(): Promise<void> {
        view.setDesignResolutionSize(750, 1334, ResolutionPolicy.FIXED_WIDTH);
        const loaded = await this.loadConfiguredLevel(this.levelNumber);
        this.createCanvas();
        this.createBackground();
        this.createBoard();
        this.createHeader(loaded.level.level, loaded.time);
        this.createSlider();
        this.createTools(loaded.level.tools ?? { remove: 3, hint: 3, bomb: 3 });
        this.bindEvents();
        this.board.loadLevel(loaded.level);
        this.createNewPlayerGuide();
        this.audio = this.node.addComponent(AudioManager);
        await this.audio.loadLegacyAudio();
        this.audio.playBGM();
        this.canvas.once(Node.EventType.TOUCH_START, () => this.menu.startCountDown());
    }

    onDestroy(): void {
        eventBus.off(GameEvent.PATH_CLEARED, this.onPathCleared, this);
        eventBus.off(GameEvent.PATH_BLOCKED, this.onPathBlocked, this);
        eventBus.off(GameEvent.LEVEL_CLEAR, this.onLevelClear, this);
    }

    private createCanvas(): void {
        this.canvas = this.uiNode('Canvas', this.node);
        this.canvas.setPosition(375, 667);
        this.canvas.addComponent(UITransform).setContentSize(750, 1334);
        const cameraNode = this.uiNode('Camera', this.canvas);
        cameraNode.setPosition(0, 0, 1000);
        const camera = cameraNode.addComponent(Camera);
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = 667;
        camera.visibility = Layers.Enum.UI_2D;
        camera.clearColor = new Color(246, 251, 255, 255);
        const canvas = this.canvas.addComponent(Canvas);
        canvas.cameraComponent = camera;
    }

    private createBackground(): void {
        const index = (Math.max(1, this.levelNumber) - 1) % 3 + 1;
        this.spriteNode('BG', this.canvas, `backgrounds/background_${index}`, 750, 1334);
    }

    private createHeader(levelNumber: number, time: number): void {
        const top = this.uiNode('nTopNode', this.canvas);
        top.setPosition(0, 502);
        top.addComponent(UITransform).setContentSize(750, 230);
        this.spriteNode('btnSet', top, 'ported/sprite/icon_sz', 66, 66).setPosition(-296.757, 56.25);

        const timeNode = this.uiNode('timeNode', top);
        timeNode.setPosition(0, 51.882);
        timeNode.addComponent(UITransform).setContentSize(150, 40);
        this.spriteNode('icon_time', timeNode, 'ported/sprite/icon_time', 30, 30).setPosition(-37.702, 0);
        const timeLabel = this.labelNode('lbTime', timeNode, '00:00', 30, 90, 38);
        timeLabel.node.setPosition(11, 0);

        const heartNode = this.uiNode('heartNode', top);
        heartNode.setPosition(0, 3.881);
        heartNode.addComponent(UITransform).setContentSize(176, 52);
        const hearts = [-62, 0, 62].map((x, index) => {
            const heart = this.spriteNode(`life${index + 1}`, heartNode, 'ported/sprite/life1', 52, 52);
            heart.setPosition(x, 0);
            return heart;
        });

        const power = this.spriteNode('dk_szk', top, 'ported/sprite/dk_szk', 158, 68);
        power.setPosition(256.535, 12.559);
        this.spriteNode('icon_tl', power, 'ported/sprite/icon_tl', 48, 48).setPosition(-36.11, 0);
        this.spriteNode('wz_m', power, 'ported/sprite/wz_m', 34, 34).setPosition(30.782, 0);
        const count = this.labelNode('lbTl', power, '3', 28, 28, 50);
        count.node.setPosition(31.244, 0);

        const level = this.labelNode('lbLevel', top, `关卡 ${levelNumber}`, 28, 150, 50);
        level.node.setPosition(0, -55.03);
        level.node.active = false;
        this.menu = this.canvas.addComponent(GameMenu);
        this.menu.setup(timeLabel, hearts, time);
    }

    private createBoard(): void {
        const viewNode = this.uiNode('view', this.canvas);
        viewNode.setPosition(0, -69.913);
        viewNode.addComponent(UITransform).setContentSize(750, 950);
        viewNode.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
        const boardNode = this.uiNode('maxNode', viewNode);
        boardNode.addComponent(UITransform).setContentSize(1100, 1650);
        boardNode.setScale(0.95, 0.95, 1);
        this.board = boardNode.addComponent(BoardManager);
        this.board.arrowPathPrefab = this.arrowPathPrefab;
    }

    private createSlider(): void {
        const slider = this.spriteNode('nFd', this.canvas, 'ported/sprite/sf1', 360, 30);
        slider.setPosition(0, -597);
        const knob = this.spriteNode('nBar', slider, 'ported/sprite/sf2', 46, 46);
        knob.setPosition(-180, 0);
        const update = (event: EventTouch): void => {
            const location = event.getUILocation();
            const p = slider.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(location.x, location.y));
            const progress = Math.max(0, Math.min(1, (p.x + 180) / 360));
            knob.setPosition(-180 + progress * 360, 0);
            this.board.setZoom(progress);
        };
        slider.on(Node.EventType.TOUCH_START, update, this);
        slider.on(Node.EventType.TOUCH_MOVE, update, this);
    }

    private createTools(tools: NonNullable<LevelData['tools']>): void {
        this.toolButton('remove', 'ported/tools/remove', -150, tools.remove, () => this.board.armHammer());
        this.toolButton('hint', 'ported/tools/hint', 0, tools.hint, () => this.board.hint());
        this.toolButton('bomb', 'ported/tools/bomb', 150, tools.bomb, () => this.board.armBomb());
    }

    private toolButton(name: string, path: string, x: number, initialCount: number, action: () => void): void {
        const button = this.uiNode(name, this.canvas);
        button.setPosition(x, -525);
        button.addComponent(UITransform).setContentSize(100, 100);
        this.spriteNode(`${name}Icon`, button, path, 82, 82);
        const count = this.labelNode(`${name}Count`, button, `×${initialCount}`, 20, 42, 28);
        count.node.setPosition(38, -35);
        let remaining = initialCount;
        button.on(Node.EventType.TOUCH_END, () => {
            if (!remaining) return;
            remaining--;
            count.string = `×${remaining}`;
            this.audio?.playClick();
            action();
        }, this);
    }

    private createNewPlayerGuide(): void {
        if (sys.localStorage.getItem('arrow-path-guide-complete') === '1') return;
        const overlay = this.uiNode('NewPlayerGuide', this.canvas);
        overlay.addComponent(UITransform).setContentSize(750, 1334);
        overlay.addComponent(BlockInputEvents);
        const shade = overlay.addComponent(Graphics);
        shade.fillColor = new Color(15, 29, 42, 105);
        shade.fillRect(-375, -667, 750, 1334);
        const finger = this.spriteNode('finger3', overlay, 'ported/sprite/finger3', 92, 114);
        const bubble = this.spriteNode('tsk', overlay, 'ported/sprite/tsk', 392, 132);
        const message = this.labelNode('GuideText', bubble, '', 22, 340, 92);
        const steps = [
            { text: '点击一条箭头路径\n前方无阻挡即可消除', finger: new Vec3(95, 0), bubble: new Vec3(0, -350) },
            { text: '拖动底部缩放条\n也可以双指缩放和拖动画面', finger: new Vec3(0, -545), bubble: new Vec3(0, -390) },
            { text: '使用消除、提示和炸弹道具\n可以更快完成关卡', finger: new Vec3(0, -450), bubble: new Vec3(0, -315) },
        ];
        let step = 0;
        const show = (): void => {
            const current = steps[step];
            message.string = current.text;
            finger.setPosition(current.finger);
            bubble.setPosition(current.bubble);
        };
        overlay.on(Node.EventType.TOUCH_END, () => {
            step++;
            if (step < steps.length) return show();
            sys.localStorage.setItem('arrow-path-guide-complete', '1');
            overlay.destroy();
        }, this);
        show();
    }

    private bindEvents(): void {
        eventBus.on(GameEvent.PATH_CLEARED, this.onPathCleared, this);
        eventBus.on(GameEvent.PATH_BLOCKED, this.onPathBlocked, this);
        eventBus.on(GameEvent.LEVEL_CLEAR, this.onLevelClear, this);
    }
    private onPathCleared(): void { this.audio?.playClear(); }
    private onPathBlocked(): void {
        this.audio?.playBlocked();
        this.lives = Math.max(0, this.lives - 1);
        this.menu.breakHeart(this.lives);
    }
    private onLevelClear(): void {
        this.menu.pauseCountDown();
        this.audio.playWin();
        const done = this.labelNode('Complete', this.canvas, '关卡完成', 54, 360, 100);
        done.node.setPosition(0, 0);
    }

    private loadLegacyConfig(level: number): Promise<LegacyLevelConfig> {
        return new Promise((resolve, reject) => resources.load('ported/data/JianTouLevel', JsonAsset, (error, asset) => {
            if (error) return reject(error);
            const configs = asset.json as unknown as LegacyLevelConfig[];
            resolve(configs.find((item) => item.id === level) ?? configs[0]);
        }));
    }

    private async loadConfiguredLevel(levelNumber: number): Promise<{ level: LevelData; time: number }> {
        const generated = await new Promise<LevelData | null>((resolve) => {
            resources.load(`levels/level_${String(levelNumber).padStart(3, '0')}`, JsonAsset, (error, asset) => {
                const level = !error ? asset.json as unknown as LevelData : null;
                resolve(level?.paths?.length ? level : null);
            });
        });
        if (generated) return { level: generated, time: generated.timeLimit ?? 300 };
        const legacy = await this.loadLegacyConfig(levelNumber);
        return { level: convertLegacyLevel(legacy), time: legacy.time };
    }

    private spriteNode(name: string, parent: Node, path: string, width: number, height: number): Node {
        const node = this.uiNode(name, parent);
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        resources.load(`${path}/spriteFrame`, SpriteFrame, (error, frame) => { if (!error) sprite.spriteFrame = frame; });
        return node;
    }

    private labelNode(name: string, parent: Node, text: string, size: number, width: number, height: number): Label {
        const node = this.uiNode(name, parent);
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 4;
        label.color = Color.BLACK;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        return label;
    }

    private uiNode(name: string, parent: Node): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.parent = parent;
        return node;
    }
}
