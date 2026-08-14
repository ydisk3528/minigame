import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Component,
    Graphics,
    Label,
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

@ccclass('SettingsUI')
export class SettingsUI extends Component {
    private panel: Node | null = null;
    private musicLabel: Label | null = null;
    private effectsLabel: Label | null = null;
    private messageLabel: Label | null = null;
    private replayTutorialCallback: (() => void) | null = null;
    private replayLevelCallback: (() => void) | null = null;
    private panelFitScale = 1;

    public initialize(): void {
        this.node.active = false;
        this.node.addComponent(BlockInputEvents);
        this.buildView();
    }

    public setReplayTutorialCallback(callback: (() => void) | null): void {
        this.replayTutorialCallback = callback;
    }

    public setReplayLevelCallback(callback: (() => void) | null): void {
        this.replayLevelCallback = callback;
    }

    public show(): void {
        this.node.active = true;
        this.refreshLabels();
        if (this.messageLabel !== null) {
            this.messageLabel.string = '';
        }
        if (this.panel !== null) {
            this.panelFitScale = getPopupFitScale(760, 980);
            Tween.stopAllByTarget(this.panel);
            this.panel.setScale(this.panelFitScale * 0.72, this.panelFitScale * 0.72, 1);
            tween(this.panel)
                .to(0.22, { scale: new Vec3(this.panelFitScale * 1.05, this.panelFitScale * 1.05, 1) }, { easing: 'backOut' })
                .to(0.1, { scale: new Vec3(this.panelFitScale, this.panelFitScale, 1) }, { easing: 'sineOut' })
                .start();
        }
    }

    public hide(): void {
        this.node.active = false;
    }

    private buildView(): void {
        const dim = this.createNode('Dim', this.node, 1, 1, 0, 0);
        const visible = fitNodeToVisibleScreen(dim);
        const dimGraphics = dim.addComponent(Graphics);
        dimGraphics.fillColor = new Color(0, 6, 30, 205);
        dimGraphics.rect(-visible.width / 2 - 8, -visible.height / 2 - 8,
            visible.width + 16, visible.height + 16);
        dimGraphics.fill();

        this.panel = this.createNode('SettingsPanel', this.node, 760, 980, 0, 0);
        this.drawPanel(this.panel, 760, 980);
        this.createLabel('Title', this.panel, 'SETTINGS', 58, 390, new Color(255, 230, 76, 255), 650, 90);

        const musicButton = this.createButton('MusicButton', this.panel, 520, 110, 0, 235);
        this.musicLabel = this.createLabel('Text', musicButton, '', 38, 0, Color.WHITE, 480, 80);
        musicButton.on(Node.EventType.TOUCH_END, () => this.toggleMusic());

        const effectsButton = this.createButton('EffectsButton', this.panel, 520, 110, 0, 105);
        this.effectsLabel = this.createLabel('Text', effectsButton, '', 38, 0, Color.WHITE, 480, 80);
        effectsButton.on(Node.EventType.TOUCH_END, () => this.toggleEffects());

        const replayButton = this.createButton('ReplayLevelButton', this.panel, 520, 110, 0, -25);
        this.createLabel('Text', replayButton, 'REPLAY LEVEL', 36, 0, new Color(255, 220, 83, 255), 480, 80);
        replayButton.on(Node.EventType.TOUCH_END, () => this.replayLevel());

        const tutorialButton = this.createButton('TutorialButton', this.panel, 520, 110, 0, -155);
        this.createLabel('Text', tutorialButton, 'REPLAY TUTORIAL', 34, 0, Color.WHITE, 480, 80);
        tutorialButton.on(Node.EventType.TOUCH_END, () => this.resetTutorials());

        const closeButton = this.createButton('CloseButton', this.panel, 320, 100, 0, -390);
        this.createLabel('Text', closeButton, 'CLOSE', 36, 0, new Color(255, 235, 115, 255), 290, 70);
        closeButton.on(Node.EventType.TOUCH_END, () => {
            AudioManager.instance?.playClick();
            this.hide();
        });

        this.messageLabel = this.createLabel(
            'Message',
            this.panel,
            '',
            24,
            -275,
            new Color(111, 230, 255, 255),
            620,
            45,
        );
    }

    private toggleMusic(): void {
        AudioManager.instance?.playClick();
        const settings = StorageManager.update((data) => {
            data.settings.musicEnabled = !data.settings.musicEnabled;
        }).settings;
        AudioManager.instance?.setMusicEnabled(settings.musicEnabled);
        this.refreshLabels();
    }

    private toggleEffects(): void {
        AudioManager.instance?.playClick();
        const settings = StorageManager.update((data) => {
            data.settings.effectsEnabled = !data.settings.effectsEnabled;
        }).settings;
        AudioManager.instance?.setEffectsEnabled(settings.effectsEnabled);
        this.refreshLabels();
    }

    private resetTutorials(): void {
        AudioManager.instance?.playClick();
        StorageManager.update((data) => {
            data.tutorials.playCompleted = false;
            data.tutorials.matchCompleted = false;
            data.tutorials.boosterCompleted = false;
        });
        if (this.replayTutorialCallback !== null) {
            this.hide();
            this.replayTutorialCallback();
        } else if (this.messageLabel !== null) {
            this.messageLabel.string = 'TUTORIAL RESET';
        }
    }

    private replayLevel(): void {
        AudioManager.instance?.playClick();
        if (this.replayLevelCallback === null) {
            if (this.messageLabel !== null) {
                this.messageLabel.string = 'REPLAY UNAVAILABLE';
            }
            return;
        }
        this.hide();
        this.replayLevelCallback();
    }

    private refreshLabels(): void {
        const settings = StorageManager.load().settings;
        if (this.musicLabel !== null) {
            this.musicLabel.string = `MUSIC   ${settings.musicEnabled ? 'ON' : 'OFF'}`;
            this.musicLabel.color = settings.musicEnabled
                ? new Color(118, 245, 191, 255)
                : new Color(149, 163, 190, 255);
        }
        if (this.effectsLabel !== null) {
            this.effectsLabel.string = `SOUND FX   ${settings.effectsEnabled ? 'ON' : 'OFF'}`;
            this.effectsLabel.color = settings.effectsEnabled
                ? new Color(118, 245, 191, 255)
                : new Color(149, 163, 190, 255);
        }
    }

    private createButton(
        name: string,
        parent: Node,
        width: number,
        height: number,
        x: number,
        y: number,
    ): Node {
        const node = this.createNode(name, parent, width, height, x, y);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(15, 57, 124, 255);
        graphics.strokeColor = new Color(52, 144, 225, 255);
        graphics.lineWidth = 3;
        graphics.roundRect(-width / 2, -height / 2, width, height, 22);
        graphics.fill();
        graphics.stroke();
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.94;
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
        node.layer = this.node.layer;
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
        label.lineHeight = Math.round(fontSize * 1.15);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = color;
        label.enableOutline = true;
        label.outlineColor = new Color(4, 21, 63, 230);
        label.outlineWidth = 3;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private drawPanel(node: Node, width: number, height: number): void {
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(8, 25, 70, 250);
        graphics.strokeColor = new Color(53, 139, 225, 255);
        graphics.lineWidth = 5;
        graphics.roundRect(-width / 2, -height / 2, width, height, 34);
        graphics.fill();
        graphics.stroke();
    }
}
