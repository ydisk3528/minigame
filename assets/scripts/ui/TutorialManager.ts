import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    Graphics,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import { StorageManager } from '../utils/StorageManager';

const { ccclass } = _decorator;
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1280;
const MASK_ALPHA = 180;

interface TutorialStep {
    readonly target: Node;
    readonly text: string;
}

type TutorialType = 'play' | 'match' | 'booster';

@ccclass('TutorialManager')
export class TutorialManager extends Component {
    public static instance: TutorialManager | null = null;

    private mask: Graphics | null = null;
    private textLabel: Label | null = null;
    private pointer: Node | null = null;
    private steps: readonly TutorialStep[] = [];
    private stepIndex = 0;
    private type: TutorialType = 'play';

    public initialize(pointerFrame: SpriteFrame | null): void {
        TutorialManager.instance = this;
        this.node.active = false;
        this.node.addComponent(BlockInputEvents);

        const maskNode = new Node('TutorialMask');
        maskNode.layer = this.node.layer;
        maskNode.setParent(this.node);
        maskNode.addComponent(UITransform).setContentSize(SCREEN_WIDTH, SCREEN_HEIGHT);
        this.mask = maskNode.addComponent(Graphics);

        const textNode = new Node('TutorialText');
        textNode.layer = this.node.layer;
        textNode.setParent(this.node);
        textNode.addComponent(UITransform).setContentSize(820, 150);
        this.textLabel = textNode.addComponent(Label);
        this.textLabel.fontSize = 44;
        this.textLabel.lineHeight = 52;
        this.textLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.textLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.textLabel.color = Color.WHITE;
        this.textLabel.enableOutline = true;
        this.textLabel.outlineColor = new Color(4, 18, 58, 255);
        this.textLabel.outlineWidth = 5;
        this.textLabel.overflow = Label.Overflow.SHRINK;

        this.pointer = new Node('TutorialPointer');
        this.pointer.layer = this.node.layer;
        this.pointer.setParent(this.node);
        this.pointer.addComponent(UITransform).setContentSize(115, 115);
        const pointerSprite = this.pointer.addComponent(Sprite);
        pointerSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        pointerSprite.spriteFrame = pointerFrame;

        this.node.on(Node.EventType.TOUCH_END, this.nextStep, this);
    }

    public showFirstPlay(previewArea: Node, boardRoot: Node): boolean {
        if (StorageManager.load().tutorials.playCompleted || this.node.active) {
            return false;
        }
        this.show('play', [
            { target: previewArea, text: 'DRAG A BLOCK' },
            { target: boardRoot, text: 'CONNECT 3 BLOCKS OF THE SAME COLOR' },
        ]);
        return true;
    }

    public showFirstBooster(boosterButton: Node, boardRoot: Node): boolean {
        if (StorageManager.load().tutorials.boosterCompleted) {
            return false;
        }
        if (!this.node.active) {
            this.show('booster', [
                { target: boosterButton, text: 'FREE BOOSTER! SELECT IT' },
                { target: boardRoot, text: 'THEN TAP A BLOCK ON THE BOARD' },
            ]);
        }
        return true;
    }

    public showFirstMatch(boardRoot: Node): boolean {
        if (StorageManager.load().tutorials.matchCompleted || this.node.active) {
            return false;
        }
        this.show('match', [
            {
                target: boardRoot,
                text: 'SWAP GEMS\nTAP TWO NEIGHBORS OR HOLD AND DRAG',
            },
        ]);
        return true;
    }

    protected override onDestroy(): void {
        if (TutorialManager.instance === this) {
            TutorialManager.instance = null;
        }
    }

    private show(type: TutorialType, steps: readonly TutorialStep[]): void {
        this.type = type;
        this.steps = steps;
        this.stepIndex = 0;
        this.node.active = true;
        this.renderStep();
    }

    private readonly nextStep = (): void => {
        this.stepIndex += 1;
        if (this.stepIndex < this.steps.length) {
            this.renderStep();
            return;
        }
        StorageManager.update((data) => {
            if (this.type === 'play') {
                data.tutorials.playCompleted = true;
            } else if (this.type === 'match') {
                data.tutorials.matchCompleted = true;
            } else {
                data.tutorials.boosterCompleted = true;
            }
        });
        this.node.active = false;
    };

    private renderStep(): void {
        const step = this.steps[this.stepIndex];
        const targetTransform = step.target.getComponent(UITransform);
        const layerTransform = this.node.getComponent(UITransform);
        if (targetTransform === null || layerTransform === null) {
            this.nextStep();
            return;
        }

        const center = layerTransform.convertToNodeSpaceAR(step.target.worldPosition);
        const padding = 34;
        const width = targetTransform.width * Math.abs(step.target.worldScale.x) + padding * 2;
        const height = targetTransform.height * Math.abs(step.target.worldScale.y) + padding * 2;
        const left = Math.max(-SCREEN_WIDTH / 2, center.x - width / 2);
        const right = Math.min(SCREEN_WIDTH / 2, center.x + width / 2);
        const bottom = Math.max(-SCREEN_HEIGHT / 2, center.y - height / 2);
        const top = Math.min(SCREEN_HEIGHT / 2, center.y + height / 2);

        this.drawMask(left, right, bottom, top);
        if (this.textLabel !== null) {
            this.textLabel.string = `${step.text}\nTAP TO CONTINUE`;
            const textY = top < 350 ? Math.min(445, top + 105) : Math.max(-445, bottom - 105);
            this.textLabel.node.setPosition(0, textY);
        }
        this.animatePointer(right - 35, bottom + 15);
    }

    private drawMask(left: number, right: number, bottom: number, top: number): void {
        if (this.mask === null) {
            return;
        }
        const screenLeft = -SCREEN_WIDTH / 2;
        const screenBottom = -SCREEN_HEIGHT / 2;
        this.mask.clear();
        this.mask.fillColor = new Color(0, 0, 0, MASK_ALPHA);
        this.mask.rect(screenLeft, top, SCREEN_WIDTH, SCREEN_HEIGHT / 2 - top);
        this.mask.rect(screenLeft, screenBottom, SCREEN_WIDTH, bottom - screenBottom);
        this.mask.rect(screenLeft, bottom, left - screenLeft, top - bottom);
        this.mask.rect(right, bottom, SCREEN_WIDTH / 2 - right, top - bottom);
        this.mask.fill();
        this.mask.strokeColor = new Color(255, 226, 75, 255);
        this.mask.lineWidth = 6;
        this.mask.roundRect(left, bottom, right - left, top - bottom, 22);
        this.mask.stroke();
    }

    private animatePointer(x: number, y: number): void {
        if (this.pointer === null) {
            return;
        }
        Tween.stopAllByTarget(this.pointer);
        this.pointer.setPosition(x, y);
        this.pointer.setScale(1, 1, 1);
        tween(this.pointer)
            .repeatForever(
                tween<Node>()
                    .to(0.38, {
                        position: new Vec3(x - 24, y + 24),
                        scale: new Vec3(1.16, 1.16, 1),
                        angle: -12,
                    }, { easing: 'sineInOut' })
                    .to(0.38, {
                        position: new Vec3(x, y),
                        scale: Vec3.ONE,
                        angle: 0,
                    }, { easing: 'sineInOut' }),
            )
            .start();
    }
}
