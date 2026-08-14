import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    Graphics,
    instantiate,
    Label,
    Layers,
    Node,
    Prefab,
    UITransform,
} from 'cc';
import { NextPanelUI, type NextPanelOptions } from './NextPanelUI';
import { fitNodeToVisibleScreen } from '../utils/ResponsiveUI';

const { ccclass } = _decorator;
const UI_LAYER = Layers.Enum.UI_2D;

@ccclass('ResultUI')
export class ResultUI extends Component {
    private nextPanelPrefab: Prefab | null = null;
    private showVersion = 0;

    public initialize(prefab: Prefab | null = null): void {
        this.node.active = false;
        this.nextPanelPrefab = prefab;
    }

    public show(options: NextPanelOptions): void {
        this.showVersion += 1;
        this.node.active = true;
        this.destroyChildren();
        this.createDimBackground();

        if (this.nextPanelPrefab !== null) {
            try {
                this.buildPrefabPanel(this.nextPanelPrefab, options);
                return;
            } catch (error) {
                console.error('[ResultUI] Failed to instantiate Next Panel Prefab; using code UI.', error);
            }
        } else {
            console.warn('[ResultUI] Next Panel Prefab is not assigned on GameUI; using code UI.');
        }

        this.buildFallbackPanel(options);
    }

    public hide(): void {
        this.showVersion += 1;
        this.node.active = false;
        this.destroyChildren();
    }

    private createDimBackground(): void {
        const dim = new Node('DimBackground');
        dim.layer = UI_LAYER;
        dim.setParent(this.node);
        dim.addComponent(UITransform);
        const visible = fitNodeToVisibleScreen(dim);
        dim.addComponent(BlockInputEvents);
        const graphics = dim.addComponent(Graphics);
        graphics.fillColor = new Color(2, 10, 45, 205);
        graphics.rect(-visible.width / 2 - 8, -visible.height / 2 - 8,
            visible.width + 16, visible.height + 16);
        graphics.fill();
    }

    private buildPrefabPanel(prefab: Prefab, options: NextPanelOptions): void {
        const panel = instantiate(prefab);
        panel.name = 'NextPanlRuntime';
        panel.active = true;
        panel.setParent(this.node);
        panel.setPosition(0, 0, 0);
        panel.setScale(1, 1, 1);
        panel.angle = 0;
        this.applyLayerRecursively(panel, UI_LAYER);

        if (panel.getComponent(UITransform) === null) {
            panel.addComponent(UITransform).setContentSize(700, 600);
        }

        const controller = panel.getComponent(NextPanelUI) ?? panel.addComponent(NextPanelUI);
        controller.show(options);
    }

    private applyLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        const children = node.children as readonly Node[] | null;
        for (let index = 0; index < (children?.length ?? 0); index += 1) {
            const child = children?.[index];
            if (child !== undefined) {
                this.applyLayerRecursively(child, layer);
            }
        }
    }

    private buildFallbackPanel(options: NextPanelOptions): void {
        const children = this.node.children as readonly Node[] | null;
        for (let index = (children?.length ?? 0) - 1; index >= 0; index -= 1) {
            const child = children?.[index];
            if (child === undefined) {
                continue;
            }
            if (child.name !== 'DimBackground') {
                child.removeFromParent();
                child.destroy();
            }
        }
        const panel = new Node('NextPanlFallback');
        panel.layer = UI_LAYER;
        panel.setParent(this.node);
        panel.addComponent(UITransform).setContentSize(700, 600);
        const background = panel.addComponent(Graphics);
        background.fillColor = new Color(10, 35, 91, 255);
        background.strokeColor = new Color(62, 159, 235, 255);
        background.lineWidth = 6;
        background.roundRect(-350, -300, 700, 600, 42);
        background.fill();
        background.stroke();

        this.createFallbackStar(panel, 'start1', -195, -27);
        this.createFallbackStar(panel, 'start2', 0, 60);
        this.createFallbackStar(panel, 'start3', 195, -27);
        this.createFallbackButton(panel, 'lastbtn', -185, -210);
        this.createFallbackButton(panel, 'again', 0, -210);
        this.createFallbackButton(panel, 'nextbtn', 185, -210);

        panel.addComponent(NextPanelUI).show(options);
    }

    private createFallbackStar(parent: Node, name: string, x: number, y: number): void {
        const star = new Node(name);
        star.layer = UI_LAYER;
        star.setParent(parent);
        star.setPosition(x, y);
        star.addComponent(UITransform).setContentSize(120, 120);
        const outline = star.addComponent(Label);
        outline.string = '☆';
        outline.fontSize = 104;
        outline.lineHeight = 112;
        outline.horizontalAlign = Label.HorizontalAlign.CENTER;
        outline.verticalAlign = Label.VerticalAlign.CENTER;
        outline.color = new Color(106, 177, 231, 255);

        const fill = new Node('0');
        fill.layer = UI_LAYER;
        fill.setParent(star);
        fill.addComponent(UITransform).setContentSize(120, 120);
        const fillLabel = fill.addComponent(Label);
        fillLabel.string = '★';
        fillLabel.fontSize = 96;
        fillLabel.lineHeight = 108;
        fillLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        fillLabel.verticalAlign = Label.VerticalAlign.CENTER;
        fillLabel.color = new Color(255, 224, 61, 255);
    }

    private createFallbackButton(parent: Node, name: string, x: number, y: number): void {
        const button = new Node(name);
        button.layer = UI_LAYER;
        button.setParent(parent);
        button.setPosition(x, y);
        button.addComponent(UITransform).setContentSize(150, 100);
        const graphics = button.addComponent(Graphics);
        graphics.fillColor = new Color(18, 83, 163, 255);
        graphics.strokeColor = new Color(91, 198, 255, 255);
        graphics.lineWidth = 4;
        graphics.roundRect(-75, -50, 150, 100, 22);
        graphics.fill();
        graphics.stroke();
    }

    private destroyChildren(): void {
        const children = this.node.children as readonly Node[] | null;
        for (let index = (children?.length ?? 0) - 1; index >= 0; index -= 1) {
            const child = children?.[index];
            if (child === undefined) {
                continue;
            }
            child.removeFromParent();
            child.destroy();
        }
    }
}
