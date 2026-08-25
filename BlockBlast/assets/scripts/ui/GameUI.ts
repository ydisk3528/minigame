import {
    _decorator,
    Button,
    Color,
    Component,
    director,
    instantiate,
    Label,
    Layers,
    Node,
    ParticleAsset,
    Prefab,
    ResolutionPolicy,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
    view,
} from 'cc';
import { AdManager } from '../ad/AdManager';
import { BlockFactory } from '../block/BlockFactory';
import { BoosterManager, type BoosterButtonBinding } from '../booster/BoosterManager';
import { AudioManager } from '../core/AudioManager';
import { BoardManager } from '../core/BoardManager';
import { ScoreManager } from '../core/ScoreManager';
import { EffectManager } from '../effect/EffectManager';
import { LevelManager } from '../level/LevelManager';
import { MatchBoardManager } from '../match/MatchBoardManager';
import { ShopManager } from '../shop/ShopManager';
import { LevelSelectionState } from './LevelSelectionState';
import { LevelTransitionUI } from './LevelTransitionUI';
import { MayaGameLayoutView } from './MayaGameLayoutView';
import { ResultUI } from './ResultUI';
import { SettingsUI } from './SettingsUI';
import { TutorialManager } from './TutorialManager';

const { ccclass, property } = _decorator;
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1280;
const UI_LAYER = Layers.Enum.UI_2D;

@ccclass('GameUI')
export class GameUI extends Component {
    @property(SpriteFrame) public bestCrownFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public settingsGearFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public levelMenuFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public shopMenuFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public boardBackplateFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public gemTileFrame: SpriteFrame | null = null;
    @property([SpriteFrame]) public gemShapeFrames: SpriteFrame[] = [];
    @property(SpriteFrame) public rocketHorizontalFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public rocketVerticalFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public specialBombFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public specialRainbowFrame: SpriteFrame | null = null;
    @property(ParticleAsset) public clearParticleBlue: ParticleAsset | null = null;
    @property(ParticleAsset) public clearParticleGreen: ParticleAsset | null = null;
    @property(ParticleAsset) public clearParticleYellow: ParticleAsset | null = null;
    @property(ParticleAsset) public clearParticleOrange: ParticleAsset | null = null;
    @property(ParticleAsset) public clearParticlePurple: ParticleAsset | null = null;
    @property(ParticleAsset) public clearParticlePink: ParticleAsset | null = null;
    @property(SpriteFrame) public bombIconFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public hammerIconFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public rainbowIconFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public adIconFrame: SpriteFrame | null = null;
    @property(Prefab) public mayaLayoutPrefab: Prefab | null = null;
    @property(Prefab) public shopPanelPrefab: Prefab | null = null;
    @property(Prefab) public blockPrefab: Prefab | null = null;
    @property(Prefab) public destroyEffectPrefab: Prefab | null = null;
    @property(Prefab) public comboTextPrefab: Prefab | null = null;
    @property(Prefab) public scoreTextPrefab: Prefab | null = null;
    @property(SpriteFrame) public greatTextFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public amazingTextFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public gemBlastTextFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public comboTextFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public boardClearedTextFrame: SpriteFrame | null = null;
    @property([SpriteFrame]) public blackHoleEffectFrames: SpriteFrame[] = [];
    @property(Prefab) public nextPanelPrefab: Prefab | null = null;
    @property(SpriteFrame) public tutorialPointerFrame: SpriteFrame | null = null;
    @property({ min: 1, max: 10000, step: 1 }) public publishedLevelCount = 50;
    @property public enableDebugPanel = false;

    protected override onLoad(): void {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.SHOW_ALL);
        this.removeTemplateNodes();
        this.buildLayout();
    }

    private removeTemplateNodes(): void {
        for (let index = this.node.children.length - 1; index >= 0; index -= 1) {
            const child = this.node.children[index];
            child.removeFromParent();
            child.destroy();
        }
    }

    private buildLayout(): void {
        const root = this.node;
        if (this.mayaLayoutPrefab === null) {
            throw new Error('[GameUI] Maya Game Layout Prefab is not assigned.');
        }
        const mayaLayout = instantiate(this.mayaLayoutPrefab);
        mayaLayout.setParent(root);
        mayaLayout.setPosition(0, 0, 0);
        this.applyLayerRecursively(mayaLayout, UI_LAYER);
        const layoutView = mayaLayout.getComponent(MayaGameLayoutView);
        if (layoutView?.bestScoreLabel === null
            || layoutView?.currentScoreLabel === null
            || layoutView?.levelTargetLabel === null
            || layoutView?.boosterStatusLabel === null
            || layoutView?.boosterCountLabels.length !== 3
            || layoutView?.boosterButtons.length !== 3
            || layoutView?.boosterIcons.length !== 3
            || layoutView?.boosterAdIcons.length !== 3) {
            throw new Error('[GameUI] Maya Game Layout Prefab references are incomplete.');
        }
        const bestScoreLabel = layoutView.bestScoreLabel;
        const currentScoreLabel = layoutView.currentScoreLabel;
        const levelTargetLabel = layoutView.levelTargetLabel;
        const boosterStatusLabel = layoutView.boosterStatusLabel;

        const topBar = this.createNode('TopBar', root, { width: 1820, height: 86, y: 585 });
        const bestIcon = this.createSpriteNode('BestIcon', topBar, { width: 64, height: 64, x: -865 });
        this.applySprite(bestIcon, this.bestCrownFrame, 'Best Crown Frame');
        const settingsButton = this.createSpriteNode('SettingButton', topBar, {
            width: 66, height: 66, x: 865,
        });
        this.applySprite(settingsButton, this.settingsGearFrame, 'Settings Gear Frame');
        this.configureScaleButton(settingsButton, 0.9);
        const levelsButton = this.createSpriteNode('LevelsButton', topBar, {
            width: 66, height: 66, x: 540,
        });
        this.applySprite(levelsButton, this.levelMenuFrame, 'Level Menu Frame');
        this.configureScaleButton(levelsButton, 0.94);
        const shopButton = this.createSpriteNode('ShopButton', topBar, {
            width: 72, height: 72, x: 725,
        });
        this.applySprite(shopButton, this.shopMenuFrame, 'Shop Menu Frame');
        this.configureScaleButton(shopButton, 0.94);

        const scoreManager = root.addComponent(ScoreManager);
        scoreManager.initialize(currentScoreLabel);

        const boardRoot = this.createNode('BoardRoot', root, { width: 1800, height: 864, y: -75 });
        const backplateLayer = this.createNode('BackplateLayer', boardRoot, { width: 2700, height: 860 });
        const cellLayer = this.createNode('CellLayer', boardRoot, { width: 2650, height: 816 });
        const blockLayer = this.createNode('BlockLayer', boardRoot, { width: 2650, height: 816 });
        const boardManager = boardRoot.addComponent(BoardManager);
        boardManager.initialize(cellLayer, blockLayer, null, backplateLayer, this.boardBackplateFrame);

        const bottomBlockArea = this.createNode('BottomBlockArea', root, {
            width: 420, height: 500, x: 675, y: 65,
        });
        bottomBlockArea.active = false;
        const previewSlots = this.createPreviewSlots(bottomBlockArea);

        const effectLayer = this.createNode('EffectLayer', root, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT });
        const effectManager = effectLayer.addComponent(EffectManager);
        effectManager.initialize(effectLayer, boardRoot, {
            destroyPrefab: this.destroyEffectPrefab,
            comboPrefab: this.comboTextPrefab,
            scorePrefab: this.scoreTextPrefab,
            particleSpriteFrame: this.gemTileFrame,
            particleColorAssets: [
                this.clearParticleBlue, this.clearParticleGreen, this.clearParticleYellow,
                this.clearParticleOrange, this.clearParticlePurple, this.clearParticlePink,
            ],
            textFrames: {
                great: this.greatTextFrame,
                amazing: this.amazingTextFrame,
                gemBlast: this.gemBlastTextFrame,
                combo: this.comboTextFrame,
                boardCleared: this.boardClearedTextFrame,
            },
            blackHoleFrames: this.blackHoleEffectFrames,
        });

        const blockFactory = bottomBlockArea.addComponent(BlockFactory);
        blockFactory.initialize(
            boardManager, scoreManager, effectManager, previewSlots, this.getGemFrames(), this.blockPrefab,
        );
        const boosterButtons = this.bindBoosterButtons(layoutView);
        const adManager = root.addComponent(AdManager);
        const boosterManager = boardRoot.addComponent(BoosterManager);
        boosterManager.initialize(boardManager, effectManager, adManager, boosterButtons, boosterStatusLabel);

        const matchBoardManager = boardRoot.addComponent(MatchBoardManager);
        matchBoardManager.initialize(boardManager, scoreManager, effectManager, this.getGemFrames(), {
            rocketHorizontal: this.rocketHorizontalFrame,
            rocketVertical: this.rocketVerticalFrame,
            bomb: this.specialBombFrame,
            rainbow: this.specialRainbowFrame,
        }, boosterStatusLabel);

        const resultUI = this.createNode('ResultLayer', root, {
            width: DESIGN_WIDTH, height: DESIGN_HEIGHT,
        }).addComponent(ResultUI);
        resultUI.initialize(this.nextPanelPrefab);
        const transitionLayer = this.createNode('TransitionLayer', root, {
            width: DESIGN_WIDTH, height: DESIGN_HEIGHT,
        });
        const transitionUI = transitionLayer.addComponent(LevelTransitionUI);
        transitionUI.initialize();
        const levelManager = root.addComponent(LevelManager);
        levelManager.initialize(
            scoreManager, boardManager, blockFactory, resultUI, levelTargetLabel, bestScoreLabel,
            boosterManager, matchBoardManager, bottomBlockArea, transitionUI, this.publishedLevelCount,
        );

        let switching = false;
        levelsButton.on(Button.EventType.CLICK, () => {
            if (switching) return;
            switching = true;
            const button = levelsButton.getComponent(Button);
            if (button !== null) button.interactable = false;
            LevelSelectionState.set(levelManager.getCurrentLevel()?.id ?? 1);
            effectManager.prepareForSceneSwitch();
            director.loadScene('level', (error) => {
                if (error) {
                    switching = false;
                    if (button !== null && button.isValid) button.interactable = true;
                    console.error('[GameUI] Failed to load scene: level', error);
                }
            });
        });

        const settingsUI = this.createNode('SettingsLayer', root, {
            width: DESIGN_WIDTH, height: DESIGN_HEIGHT,
        }).addComponent(SettingsUI);
        settingsUI.initialize();
        settingsUI.setReplayLevelCallback(() => levelManager.restartCurrentLevel());
        settingsButton.on(Node.EventType.TOUCH_END, () => settingsUI.show());

        const shopLayer = this.createNode('ShopLayer', root, { width: DESIGN_WIDTH, height: DESIGN_HEIGHT });
        this.createShopPanel(shopLayer, boosterManager, shopButton, null);
        const tutorial = this.createNode('TutorialLayer', root, {
            width: DESIGN_WIDTH, height: DESIGN_HEIGHT,
        }).addComponent(TutorialManager);
        tutorial.initialize(this.tutorialPointerFrame);
        settingsUI.setReplayTutorialCallback(() => {
            if (levelManager.getCurrentLevel()?.gameMode === 'match3') tutorial.showFirstMatch(boardRoot);
            else tutorial.showFirstPlay(bottomBlockArea, boardRoot);
        });

        transitionLayer.setSiblingIndex(Math.max(0, root.children.length - 1));
    }

    private createShopPanel(
        parent: Node,
        boosterManager: BoosterManager,
        openButton: Node,
        mainCoinLabel: Label | null,
    ): void {
        if (this.shopPanelPrefab === null) {
            console.warn('[GameUI] Shop Panel Prefab is not assigned.');
            return;
        }
        const panel = instantiate(this.shopPanelPrefab);
        panel.name = 'ShopPanelRuntime';
        panel.setParent(parent);
        panel.setPosition(0, 0, 0);
        this.applyLayerRecursively(panel, UI_LAYER);
        (panel.getComponent(ShopManager) ?? panel.addComponent(ShopManager))
            .initialize(boosterManager, openButton, mainCoinLabel);
    }

    private applyLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.applyLayerRecursively(child, layer);
    }

    private getGemFrames(): readonly SpriteFrame[] {
        return Array.from(new Set(
            [this.gemTileFrame, ...this.gemShapeFrames]
                .filter((frame): frame is SpriteFrame => frame !== null),
        ));
    }

    private createPreviewSlots(parent: Node): Node[] {
        return [150, 0, -150].map((y, index) => this.createNode(`PreviewBlock${index + 1}`, parent, {
            width: 380, height: 140, y,
        }));
    }

    private bindBoosterButtons(layoutView: MayaGameLayoutView): BoosterButtonBinding[] {
        return [
            { type: 'bomb' as const, frame: this.bombIconFrame },
            { type: 'hammer' as const, frame: this.hammerIconFrame },
            { type: 'rainbow' as const, frame: this.rainbowIconFrame },
        ].map((entry, index) => {
            const node = layoutView.boosterButtons[index];
            this.configureScaleButton(node, 0.92);
            const icon = layoutView.boosterIcons[index];
            icon.spriteFrame = entry.frame;
            const countLabel = layoutView.boosterCountLabels[index];
            const adIcon = layoutView.boosterAdIcons[index];
            const adSprite = adIcon.getComponent(Sprite);
            adIcon.active = this.adIconFrame !== null;
            if (adSprite !== null) adSprite.spriteFrame = this.adIconFrame;
            return { type: entry.type, node, countLabel, adIcon };
        });
    }

    private createNode(
        name: string,
        parent: Node,
        options: { width: number; height: number; x?: number; y?: number },
    ): Node {
        const node = new Node(name);
        node.layer = UI_LAYER;
        node.setParent(parent);
        node.setPosition(options.x ?? 0, options.y ?? 0);
        node.addComponent(UITransform).setContentSize(options.width, options.height);
        return node;
    }

    private createSpriteNode(
        name: string,
        parent: Node,
        options: { width: number; height: number; x?: number; y?: number },
    ): Node {
        const node = this.createNode(name, parent, options);
        node.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
        return node;
    }

    private createLabelNode(
        name: string,
        parent: Node,
        text: string,
        fontSize: number,
        options: { width: number; height: number; x?: number; y?: number },
        shadow = false,
        color = Color.WHITE,
    ): Label {
        const label = this.createNode(name, parent, options).addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.12);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableOutline = true;
        label.outlineColor = new Color(5, 31, 91, 90);
        label.outlineWidth = 2;
        label.overflow = Label.Overflow.SHRINK;
        if (shadow) {
            label.enableShadow = true;
            label.shadowColor = new Color(4, 25, 83, 180);
            label.shadowOffset = new Vec2(0, -6);
            label.shadowBlur = 3;
        }
        return label;
    }

    private configureScaleButton(node: Node, zoomScale: number): Button {
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = zoomScale;
        button.duration = 0.08;
        node.on(Node.EventType.TOUCH_END, () => AudioManager.instance?.playClick());
        return button;
    }

    private applySprite(node: Node, frame: SpriteFrame | null, label: string): void {
        const sprite = node.getComponent(Sprite);
        if (sprite !== null) {
            sprite.spriteFrame = frame;
            if (frame === null) console.warn(`[GameUI] ${label} is not assigned.`);
        }
    }
}
