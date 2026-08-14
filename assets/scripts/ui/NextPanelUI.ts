import {
    _decorator,
    Button,
    Color,
    Component,
    Label,
    Node,
    Sprite,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import { AudioManager } from '../core/AudioManager';

const { ccclass, property } = _decorator;

export interface NextPanelOptions {
    readonly levelId: number;
    readonly score: number;
    readonly stars: number;
    readonly won: boolean;
    readonly completionReward: number;
    readonly rewardGranted: boolean;
    readonly hasPrevious: boolean;
    readonly hasNext: boolean;
    readonly onPrevious: () => void;
    readonly onReplay: () => void;
    readonly onNext: () => void;
}

@ccclass('NextPanelUI')
export class NextPanelUI extends Component {
    @property(Node)
    public star1: Node | null = null;

    @property(Node)
    public star2: Node | null = null;

    @property(Node)
    public star3: Node | null = null;

    @property(Node)
    public previousButton: Node | null = null;

    @property(Node)
    public replayButton: Node | null = null;

    @property(Node)
    public nextButton: Node | null = null;

    private options: NextPanelOptions | null = null;
    private buttonEventsBound = false;

    public show(options: NextPanelOptions): void {
        this.options = options;
        this.autoBindNodes();
        this.bindButtonEvents();
        this.configureButtons();
        this.configureText();
        this.setStarRating(options.stars);
        this.playEntrance(options.stars);
    }

    private autoBindNodes(): void {
        this.star1 ??= this.node.getChildByName('start1');
        this.star2 ??= this.node.getChildByName('start2');
        this.star3 ??= this.node.getChildByName('start3');
        this.previousButton ??= this.node.getChildByName('lastbtn');
        this.replayButton ??= this.node.getChildByName('again');
        this.nextButton ??= this.node.getChildByName('nextbtn');
    }

    private bindButtonEvents(): void {
        if (this.buttonEventsBound) {
            return;
        }
        this.buttonEventsBound = true;
        this.prepareButton(this.previousButton, 'PREVIOUS', () => this.options?.onPrevious());
        this.prepareButton(this.replayButton, 'REPLAY', () => this.options?.onReplay());
        this.prepareButton(this.nextButton, 'NEXT', () => this.options?.onNext());
    }

    private prepareButton(node: Node | null, text: string, callback: () => void): void {
        if (node === null) {
            return;
        }
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        button.duration = 0.08;
        this.createOrUpdateLabel(node, 'ButtonText', text, 22, -76, new Color(232, 246, 255, 255));
        node.on(Node.EventType.TOUCH_END, () => {
            AudioManager.instance?.playClick();
            callback();
        });
    }

    private configureButtons(): void {
        if (this.options === null) {
            return;
        }
        if (this.previousButton !== null) {
            this.setButtonAvailable(this.previousButton, this.options.hasPrevious);
        }
        if (this.nextButton !== null) {
            this.setButtonAvailable(this.nextButton, this.options.won && this.options.hasNext);
        }
        if (this.replayButton !== null) {
            this.replayButton.active = true;
        }
    }

    private setButtonAvailable(node: Node, available: boolean): void {
        const button = node.getComponent(Button);
        if (button !== null) {
            button.interactable = available;
        }
        node.active = available;
    }

    private configureText(): void {
        if (this.options === null) {
            return;
        }
        this.createOrUpdateLabel(
            this.node,
            'ResultTitle',
            this.options.won ? 'LEVEL COMPLETE!' : 'NO MORE MOVES',
            50,
            235,
            this.options.won ? new Color(255, 230, 80, 255) : new Color(255, 132, 132, 255),
        );
        this.createOrUpdateLabel(
            this.node,
            'ResultScore',
            `LEVEL ${this.options.levelId}   SCORE ${this.options.score.toLocaleString('en-US')}`,
            28,
            165,
            new Color(213, 242, 255, 255),
        );
        this.createOrUpdateLabel(
            this.node,
            'ResultReward',
            !this.options.won
                ? ''
                : this.options.rewardGranted
                    ? `COINS +${this.options.completionReward.toLocaleString('en-US')}`
                    : 'COINS ALREADY CLAIMED',
            26,
            115,
            this.options.rewardGranted
                ? new Color(255, 226, 86, 255)
                : new Color(156, 194, 218, 255),
        );
    }

    private setStarRating(rating: number): void {
        this.getStars().forEach((star, index) => {
            const earned = index < rating;
            // NextPanl 的父节点是黄色满星，首个子节点是蓝色空星。
            const fullStar = star.getComponent(Sprite);
            if (fullStar !== null) {
                fullStar.enabled = earned;
            }
            const children = star.children as readonly Node[] | null;
            const emptyStar = children?.[0];
            if (emptyStar !== undefined) {
                emptyStar.active = !earned;
            }
        });
    }

    private playEntrance(rating: number): void {
        Tween.stopAllByTarget(this.node);
        this.node.setPosition(0, 520);
        this.node.setScale(1.45, 1.45, 1);
        tween(this.node)
            .to(0.28, {
                position: Vec3.ZERO,
                scale: new Vec3(0.9, 0.9, 1),
            }, { easing: 'quadIn' })
            .to(0.11, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineOut' })
            .to(0.12, { scale: Vec3.ONE }, { easing: 'sineInOut' })
            .start();

        this.getStars().forEach((star, index) => {
            const origin = star.position.clone();
            Tween.stopAllByTarget(star);
            if (index >= rating) {
                star.setScale(1, 1, 1);
                return;
            }
            star.setPosition(origin.x, origin.y + 420, origin.z);
            star.setScale(1.9, 1.9, 1);
            star.angle = index % 2 === 0 ? -18 : 18;
            tween(star)
                .delay(0.38 + index * 0.15)
                .to(0.2, {
                    position: origin,
                    scale: new Vec3(0.82, 0.82, 1),
                    angle: 0,
                }, { easing: 'quadIn' })
                .to(0.1, { scale: new Vec3(1.16, 1.16, 1) }, { easing: 'backOut' })
                .to(0.1, { scale: Vec3.ONE }, { easing: 'sineOut' })
                .start();
        });
    }

    private getStars(): Node[] {
        return [this.star1, this.star2, this.star3].filter((node): node is Node => node !== null);
    }

    private createOrUpdateLabel(
        parent: Node,
        name: string,
        text: string,
        fontSize: number,
        y: number,
        color: Readonly<Color>,
    ): Label {
        const node = parent.getChildByName(name) ?? new Node(name);
        if (node.parent === null) {
            node.layer = parent.layer;
            node.setParent(parent);
            node.addComponent(UITransform).setContentSize(650, 70);
        }
        node.setPosition(0, y);
        if (parent.scale.x < 0) {
            node.setScale(-1, 1, 1);
        }
        const label = node.getComponent(Label) ?? node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.15);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = color;
        label.enableOutline = true;
        label.outlineColor = new Color(12, 33, 71, 230);
        label.outlineWidth = 3;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }
}
