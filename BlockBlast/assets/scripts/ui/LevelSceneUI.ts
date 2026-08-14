import {
    _decorator,
    Component,
    director,
    EventTouch,
    Graphics,
    instantiate,
    Label,
    Layers,
    Node,
    Prefab,
    UITransform,
    Vec3,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { StorageManager, type SaveData } from '../utils/StorageManager';
import { LevelItem } from './LevelItem';
import { LevelSelectionState } from './LevelSelectionState';

const { ccclass, property } = _decorator;
const UI_LAYER = Layers.Enum.UI_2D;

interface LoopBackground {
    readonly node: Node;
    readonly baseWorldPosition: Vec3;
}

@ccclass('LevelSceneUI')
export class LevelSceneUI extends Component {
    @property(Node)
    public dragArea: Node | null = null;

    @property(Node)
    public levelItemRoot: Node | null = null;

    @property(Prefab)
    public levelItemPrefab: Prefab | null = null;

    @property(Node)
    public levelItemTemplate: Node | null = null;

    @property(Node)
    public loopRoot: Node | null = null;

    @property([Node])
    public scrollOnlyBackgroundNodes: Node[] = [];

    @property({ min: 1, max: 10000, step: 1 })
    public totalLevelCount = 1000;

    @property({ min: 3, max: 40, step: 1 })
    public poolSize = 12;

    @property
    public itemSpacingY = 230;

    @property
    public itemX = 0;

    @property
    public firstItemY = 0;

    @property({ min: 0.1, max: 3, step: 0.05 })
    public dragSensitivity = 1;

    @property({ min: 0, max: 2, step: 0.05 })
    public backgroundFollowRatio = 1;

    @property({ tooltip: '0 = calculate from the map nodes automatically' })
    public backgroundLoopHeight = 0;

    @property({ min: 0.8, max: 0.99, step: 0.01 })
    public inertiaDamping = 0.92;

    @property
    public gameSceneName = 'Game';

    private readonly itemPool: Node[] = [];
    private readonly itemLevels = new Map<Node, number>();
    private readonly loopBackgrounds: LoopBackground[] = [];
    private readonly scrollOnlyBackgrounds: LoopBackground[] = [];
    private saveData: SaveData | null = null;
    private currentLevelId = 1;
    private scrollY = 0;
    private backgroundOffsetY = 0;
    private loopWrapMinWorldY = 0;
    private resolvedLoopHeight = 1;
    private dragging = false;
    private dragMoved = false;
    private lastTouchY = 0;
    private lastMoveTime = 0;
    private velocityY = 0;
    private switchingScene = false;

    protected override start(): void {
        this.dragArea ??= this.node;
        this.resolveBackgroundNodes();
        this.captureBackgroundLayout();
        this.resolveItemRoot();
        this.createItemPool();
        this.saveData = StorageManager.load();
        this.currentLevelId = Math.min(this.totalLevelCount, this.saveData.level);
        this.scrollY = this.clampScroll(
            -this.firstItemY - (this.currentLevelId - 1) * this.itemSpacingY,
        );
        this.backgroundOffsetY = this.scrollY * this.backgroundFollowRatio;
        this.refreshVirtualItems(true);
        this.updateBackgroundLoop();
        this.bindTouchEvents();
        StorageManager.onChanged(this.handleStorageChanged, this);
    }

    protected override onDestroy(): void {
        StorageManager.offChanged(this.handleStorageChanged, this);
    }

    protected override update(deltaTime: number): void {
        if (this.dragging || Math.abs(this.velocityY) < 4) {
            return;
        }
        const delta = this.velocityY * Math.min(deltaTime, 0.05);
        const applied = this.applyScrollDelta(delta);
        this.velocityY *= Math.pow(this.inertiaDamping, deltaTime * 60);
        if (Math.abs(applied - delta) > 0.01) {
            this.velocityY = 0;
        }
    }

    private bindTouchEvents(): void {
        this.dragArea?.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.dragArea?.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.dragArea?.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.dragArea?.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private unbindTouchEvents(): void {
        this.dragArea?.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.dragArea?.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.dragArea?.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.dragArea?.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private readonly onTouchStart = (event: EventTouch): void => {
        this.dragging = true;
        this.dragMoved = false;
        this.velocityY = 0;
        this.lastTouchY = event.getUILocation().y;
        this.lastMoveTime = Date.now();
    };

    private readonly onTouchMove = (event: EventTouch): void => {
        if (!this.dragging) return;
        const now = Date.now();
        const touchY = event.getUILocation().y;
        const delta = (touchY - this.lastTouchY) * this.dragSensitivity;
        const elapsed = Math.max(0.008, (now - this.lastMoveTime) / 1000);
        const applied = this.applyScrollDelta(delta);
        if (Math.abs(applied) > 2) this.dragMoved = true;
        this.velocityY = applied / elapsed;
        this.lastTouchY = touchY;
        this.lastMoveTime = now;
    };

    private readonly onTouchEnd = (): void => {
        this.dragging = false;
    };

    private applyScrollDelta(delta: number): number {
        const previous = this.scrollY;
        this.scrollY = this.clampScroll(previous + delta);
        const applied = this.scrollY - previous;
        if (applied === 0) return 0;
        this.backgroundOffsetY += applied * this.backgroundFollowRatio;
        this.refreshVirtualItems(false);
        this.updateBackgroundLoop();
        return applied;
    }

    private clampScroll(value: number): number {
        const spacing = Math.max(1, Math.abs(this.itemSpacingY));
        const maximum = -this.firstItemY;
        const minimum = maximum - Math.max(0, this.totalLevelCount - 1) * spacing;
        return Math.max(minimum, Math.min(maximum, value));
    }

    private refreshVirtualItems(force: boolean): void {
        if (this.itemPool.length === 0 || this.saveData === null) return;
        const spacing = Math.max(1, Math.abs(this.itemSpacingY));
        const centerIndex = Math.round((-this.scrollY - this.firstItemY) / spacing);
        const maximumFirst = Math.max(0, this.totalLevelCount - this.itemPool.length);
        const firstIndex = Math.max(
            0,
            Math.min(maximumFirst, centerIndex - Math.floor(this.itemPool.length / 2)),
        );
        const visibleNodes = new Set<Node>();
        const visibleCount = Math.min(this.itemPool.length, this.totalLevelCount - firstIndex);
        for (let offset = 0; offset < visibleCount; offset += 1) {
            const index = firstIndex + offset;
            const node = this.itemPool[index % this.itemPool.length];
            visibleNodes.add(node);
            const levelId = index + 1;
            node.active = true;
            node.setPosition(
                this.itemX,
                this.firstItemY + index * spacing + this.scrollY,
            );
            if (force || this.itemLevels.get(node) !== levelId) {
                this.itemLevels.set(node, levelId);
                node.getComponent(LevelItem)?.bind({
                    levelId,
                    stars: this.saveData.levelStars[levelId.toString()] ?? 0,
                    unlocked: levelId <= this.saveData.level,
                    current: levelId === this.currentLevelId,
                }, this.selectLevel);
            }
        }
        for (const node of this.itemPool) {
            if (!visibleNodes.has(node)) node.active = false;
        }
    }

    private resolveItemRoot(): void {
        this.levelItemTemplate ??= this.findDescendant(this.node, 'LevelItem');
        if (this.levelItemRoot !== null) return;
        this.levelItemRoot = this.levelItemTemplate?.parent
            ?? this.findDescendant(this.node, 'LevelItems');
        if (this.levelItemRoot !== null) return;
        const root = new Node('LevelItems');
        root.layer = UI_LAYER;
        root.setParent(this.node);
        root.addComponent(UITransform).setContentSize(1, 1);
        this.levelItemRoot = root;
    }

    private createItemPool(): void {
        if (this.levelItemRoot === null) return;
        const count = Math.max(3, Math.floor(this.poolSize));
        const template = this.levelItemTemplate
            ?? this.levelItemRoot.getChildByName('LevelItem');
        if (template !== null) template.active = false;
        for (let index = 0; index < count; index += 1) {
            const item = this.levelItemPrefab !== null
                ? instantiate(this.levelItemPrefab)
                : template !== null ? instantiate(template) : this.createFallbackItem();
            item.layer = UI_LAYER;
            item.setParent(this.levelItemRoot);
            item.active = true;
            item.getComponent(LevelItem) ?? item.addComponent(LevelItem);
            this.itemPool.push(item);
        }
    }

    private createFallbackItem(): Node {
        const item = new Node('LevelItem');
        item.layer = UI_LAYER;
        item.addComponent(UITransform).setContentSize(180, 150);
        const background = item.addComponent(Graphics);
        background.fillColor.fromHEX('#124b91');
        background.roundRect(-90, -75, 180, 150, 28);
        background.fill();
        const labelNode = new Node('LevelNumber');
        labelNode.layer = UI_LAYER;
        labelNode.setParent(item);
        labelNode.addComponent(UITransform).setContentSize(160, 90);
        const label = labelNode.addComponent(Label);
        label.fontSize = 42;
        label.lineHeight = 48;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const levelItem = item.addComponent(LevelItem);
        levelItem.levelLabel = label;
        return item;
    }

    private resolveBackgroundNodes(): void {
        this.loopRoot ??= this.findDescendant(this.node, 'loop');
    }

    private findDescendant(root: Node, name: string): Node | null {
        const queue = [...root.children];
        while (queue.length > 0) {
            const child = queue.shift();
            if (child === undefined) continue;
            if (child.name.toLowerCase() === name.toLowerCase()) return child;
            queue.push(...child.children);
        }
        return null;
    }

    private captureBackgroundLayout(): void {
        this.loopBackgrounds.length = 0;
        this.scrollOnlyBackgrounds.length = 0;
        this.scrollOnlyBackgrounds.push(...this.scrollOnlyBackgroundNodes
            .filter((node) => node.isValid)
            .map((node) => ({ node, baseWorldPosition: node.worldPosition.clone() })));
        const expectedLoopNames = new Set(
            Array.from({ length: 6 }, (_, index) => `map_0${index + 2}`),
        );
        const loopTiles = this.loopRoot?.children
            .filter((node) => expectedLoopNames.has(node.name.toLowerCase())) ?? [];
        const positions = loopTiles
            .map((node) => ({ node, baseWorldPosition: node.worldPosition.clone() }))
            .sort((first, second) => first.baseWorldPosition.y - second.baseWorldPosition.y);
        this.loopBackgrounds.push(...positions);
        if (positions.length === 0) return;
        const tilePositions = positions.map((entry) => entry.baseWorldPosition.y);
        if (loopTiles.length !== expectedLoopNames.size) {
            console.warn('[LevelSceneUI] Loop Root should contain map_02 through map_07.');
        }
        tilePositions.sort((first, second) => first - second);
        const gaps: number[] = [];
        for (let index = 1; index < tilePositions.length; index += 1) {
            gaps.push(tilePositions[index] - tilePositions[index - 1]);
        }
        const averageGap = gaps.length > 0
            ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
            : 1280;
        this.loopWrapMinWorldY = tilePositions[0] - averageGap;
        this.resolvedLoopHeight = this.backgroundLoopHeight > 0
            ? this.backgroundLoopHeight
            : Math.max(
                1,
                tilePositions[tilePositions.length - 1] - tilePositions[0] + averageGap,
            );
    }

    private updateBackgroundLoop(): void {
        for (const background of this.scrollOnlyBackgrounds) {
            const position = background.baseWorldPosition.clone();
            position.y += this.backgroundOffsetY;
            background.node.setWorldPosition(position);
        }
        const period = Math.max(1, this.resolvedLoopHeight);
        for (const background of this.loopBackgrounds) {
            const rawY = background.baseWorldPosition.y + this.backgroundOffsetY;
            const wrappedY = this.loopWrapMinWorldY
                + ((rawY - this.loopWrapMinWorldY) % period + period) % period;
            const position = background.baseWorldPosition.clone();
            position.y = wrappedY;
            background.node.setWorldPosition(position);
        }
    }

    private readonly selectLevel = (levelId: number): void => {
        if (this.switchingScene || (this.dragging && this.dragMoved)
            || this.saveData === null || levelId > this.saveData.level) return;
        this.switchingScene = true;
        AudioManager.instance?.playClick();
        LevelSelectionState.set(levelId);
        director.loadScene(this.gameSceneName, (error) => {
            if (error) {
                this.switchingScene = false;
                console.error(`[LevelSceneUI] Failed to load scene: ${this.gameSceneName}`, error);
            }
        });
    };

    private readonly handleStorageChanged = (data: Readonly<SaveData>): void => {
        this.saveData = { ...data };
        this.refreshVirtualItems(true);
    };
}
