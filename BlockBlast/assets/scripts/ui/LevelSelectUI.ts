import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    Layers,
    Node,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import { AudioManager } from '../core/AudioManager';
import { StorageManager } from '../utils/StorageManager';
import { fitNodeToVisibleScreen, getPopupFitScale } from '../utils/ResponsiveUI';

const { ccclass } = _decorator;
const UI_LAYER = Layers.Enum.UI_2D;
const LEVELS_PER_PAGE = 20;

@ccclass('LevelSelectUI')
export class LevelSelectUI extends Component {
    private panel: Node | null = null;
    private gridRoot: Node | null = null;
    private pageLabel: Label | null = null;
    private currentLevelId = 1;
    private levelCount = 10;
    private page = 0;
    private onSelect: ((levelId: number) => void) | null = null;
    private panelFitScale = 1;

    public initialize(onSelect: (levelId: number) => void, levelCount: number): void {
        this.onSelect = onSelect;
        this.levelCount = Math.max(1, Math.floor(levelCount));
        this.node.active = false;
        this.buildView();
    }

    public show(currentLevelId: number): void {
        this.currentLevelId = currentLevelId;
        this.page = Math.floor((currentLevelId - 1) / LEVELS_PER_PAGE);
        this.node.active = true;
        this.renderPage();
        if (this.panel !== null) {
            this.panelFitScale = getPopupFitScale(1450, 900);
            Tween.stopAllByTarget(this.panel);
            this.panel.setScale(this.panelFitScale * 0.72, this.panelFitScale * 0.72, 1);
            tween(this.panel)
                .to(0.24, { scale: new Vec3(this.panelFitScale * 1.04, this.panelFitScale * 1.04, 1) }, { easing: 'backOut' })
                .to(0.1, { scale: new Vec3(this.panelFitScale, this.panelFitScale, 1) }, { easing: 'sineOut' })
                .start();
        }
    }

    public hide(): void {
        this.node.active = false;
    }

    private buildView(): void {
        this.node.addComponent(BlockInputEvents);
        const dim = this.createNode('Dim', this.node, 1, 1, 0, 0);
        const visible = fitNodeToVisibleScreen(dim);
        const dimGraphics = dim.addComponent(Graphics);
        dimGraphics.fillColor = new Color(2, 9, 40, 220);
        dimGraphics.rect(-visible.width / 2 - 8, -visible.height / 2 - 8,
            visible.width + 16, visible.height + 16);
        dimGraphics.fill();

        this.panel = this.createNode('LevelPanel', this.node, 1450, 900, 0, 0);
        this.drawRoundedBackground(this.panel, 1450, 900, new Color(10, 28, 76, 250), new Color(46, 119, 209, 255));
        this.createLabel('Title', this.panel, 'LEVEL JOURNEY', 54, 365, new Color(255, 233, 100, 255), 760, 76);
        this.createLabel('Subtitle', this.panel, 'YOUR BEST STARS', 23, 310, new Color(126, 219, 255, 255), 600, 42);

        const close = this.createTextButton('CloseButton', this.panel, 'X', 48, 650, 365, 82, 82);
        close.on(Node.EventType.TOUCH_END, () => {
            AudioManager.instance?.playClick();
            this.hide();
        });

        this.gridRoot = this.createNode('LevelGrid', this.panel, 1000, 620, 0, -30);
        const previousPage = this.createTextButton('PreviousPage', this.panel, '<', 48, -305, -395, 100, 70);
        const nextPage = this.createTextButton('NextPage', this.panel, '>', 48, 305, -395, 100, 70);
        this.pageLabel = this.createLabel('PageLabel', this.panel, '1 / 5', 27, -395, Color.WHITE, 260, 55);
        previousPage.on(Node.EventType.TOUCH_END, () => this.changePage(-1));
        nextPage.on(Node.EventType.TOUCH_END, () => this.changePage(1));
    }

    private renderPage(): void {
        if (this.gridRoot === null) {
            return;
        }
        const children = this.gridRoot.children as readonly Node[] | null;
        for (let index = (children?.length ?? 0) - 1; index >= 0; index -= 1) {
            const child = children?.[index];
            if (child === undefined) {
                continue;
            }
            child.removeFromParent();
            child.destroy();
        }
        const save = StorageManager.load();
        const firstLevel = this.page * LEVELS_PER_PAGE + 1;
        for (let index = 0; index < LEVELS_PER_PAGE; index += 1) {
            const levelId = firstLevel + index;
            if (levelId > this.levelCount) {
                break;
            }
            const column = index % 5;
            const row = Math.floor(index / 5);
            const x = -330 + column * 165;
            const y = 230 - row * 160;
            const unlocked = levelId <= save.level;
            const stars = save.levelStars[levelId.toString()] ?? 0;
            this.createLevelCard(levelId, stars, unlocked, x, y);
        }
        if (this.pageLabel !== null) {
            this.pageLabel.string = `${this.page + 1} / ${this.getPageCount()}`;
        }
    }

    private createLevelCard(
        levelId: number,
        stars: number,
        unlocked: boolean,
        x: number,
        y: number,
    ): void {
        if (this.gridRoot === null) {
            return;
        }
        const card = this.createNode(`Level_${levelId}`, this.gridRoot, 145, 145, x, y);
        const current = levelId === this.currentLevelId;
        this.drawRoundedBackground(
            card,
            145,
            145,
            unlocked
                ? current ? new Color(30, 111, 204, 255) : new Color(13, 48, 103, 255)
                : new Color(14, 25, 51, 245),
            current ? new Color(255, 221, 74, 255) : new Color(42, 91, 150, 255),
        );
        this.createLabel(
            'LevelNumber',
            card,
            unlocked ? levelId.toString() : 'LOCK',
            unlocked ? 39 : 22,
            24,
            unlocked ? Color.WHITE : new Color(91, 109, 144, 255),
            130,
            55,
        );
        const starText = Array.from({ length: 3 }, (_, index) => index < stars ? '★' : '☆').join('');
        this.createLabel(
            'Stars',
            card,
            starText,
            29,
            -35,
            unlocked ? new Color(255, 218, 66, 255) : new Color(65, 79, 108, 255),
            132,
            42,
        );
        if (!unlocked) {
            return;
        }
        const button = card.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.92;
        button.duration = 0.08;
        card.on(Node.EventType.TOUCH_END, () => {
            AudioManager.instance?.playClick();
            this.hide();
            this.onSelect?.(levelId);
        });
    }

    private changePage(direction: number): void {
        const nextPage = Math.max(0, Math.min(this.getPageCount() - 1, this.page + direction));
        if (nextPage === this.page) {
            return;
        }
        AudioManager.instance?.playClick();
        this.page = nextPage;
        this.renderPage();
    }

    private getPageCount(): number {
        return Math.max(1, Math.ceil(this.levelCount / LEVELS_PER_PAGE));
    }

    private createTextButton(
        name: string,
        parent: Node,
        text: string,
        fontSize: number,
        x: number,
        y: number,
        width: number,
        height: number,
    ): Node {
        const node = this.createNode(name, parent, width, height, x, y);
        this.drawRoundedBackground(node, width, height, new Color(17, 60, 126, 255), new Color(65, 151, 229, 255));
        this.createLabel('Text', node, text, fontSize, 2, Color.WHITE, width - 10, height - 8);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        button.duration = 0.08;
        return node;
    }

    private createNode(
        name: string,
        parent: Node,
        width: number,
        height: number,
        x: number,
        y: number,
    ): Node {
        const node = new Node(name);
        node.layer = UI_LAYER;
        node.setParent(parent);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private createLabel(
        name: string,
        parent: Node,
        text: string,
        fontSize: number,
        y: number,
        color: Readonly<Color>,
        width: number,
        height: number,
    ): Label {
        const node = this.createNode(name, parent, width, height, 0, y);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.12);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = color;
        label.enableOutline = true;
        label.outlineColor = new Color(4, 20, 62, 220);
        label.outlineWidth = 2;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private drawRoundedBackground(
        node: Node,
        width: number,
        height: number,
        fill: Readonly<Color>,
        stroke: Readonly<Color>,
    ): void {
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = fill;
        graphics.strokeColor = stroke;
        graphics.lineWidth = 3;
        graphics.roundRect(-width / 2, -height / 2, width, height, 18);
        graphics.fill();
        graphics.stroke();
    }
}
