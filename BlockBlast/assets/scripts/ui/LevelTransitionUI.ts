import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    Graphics,
    Label,
    Node,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    Vec3,
} from 'cc';
import type { GameMode } from '../level/LevelData';

const { ccclass } = _decorator;

@ccclass('LevelTransitionUI')
export class LevelTransitionUI extends Component {
    private opacity: UIOpacity | null = null;
    private levelLabel: Label | null = null;
    private modeLabel: Label | null = null;
    private readyLabel: Label | null = null;
    private readonly sparkles: Node[] = [];
    private playVersion = 0;

    public initialize(): void {
        this.node.active = false;
        this.node.addComponent(BlockInputEvents);
        this.opacity = this.node.addComponent(UIOpacity);
        this.buildBackground();
        this.levelLabel = this.createLabel('LevelTitle', 'LEVEL 1', 112, 55, new Color(255, 232, 72, 255));
        this.modeLabel = this.createLabel('ModeTitle', 'BLOCK MATCH 3', 42, -72, new Color(111, 228, 255, 255));
        this.readyLabel = this.createLabel('ReadyTitle', 'GET READY!', 28, -145, Color.WHITE);
        this.buildSparkles();
    }

    public play(levelId: number, mode: GameMode | undefined, onCovered: () => void): Promise<void> {
        const version = ++this.playVersion;
        this.stopTweens();
        this.node.active = true;
        if (this.levelLabel !== null) {
            this.levelLabel.string = `LEVEL ${levelId}`;
            this.levelLabel.node.setPosition(0, 185);
            this.levelLabel.node.setScale(1.7, 1.7, 1);
            this.levelLabel.node.angle = -7;
        }
        if (this.modeLabel !== null) {
            this.modeLabel.string = mode === 'match3'
                ? 'MATCH COLORS · CLEAR THE BOARD'
                : 'BLOCK MATCH 3 · REACH THE TARGET';
            this.modeLabel.node.setScale(0.65, 0.65, 1);
        }
        if (this.readyLabel !== null) {
            this.readyLabel.node.setScale(0, 0, 1);
        }
        if (this.opacity !== null) {
            this.opacity.opacity = 0;
        }
        this.playSparkles();

        if (this.levelLabel !== null) {
            tween(this.levelLabel.node)
                .delay(0.08)
                .to(0.2, {
                    position: new Vec3(0, 55),
                    scale: new Vec3(0.9, 0.9, 1),
                    angle: 0,
                }, { easing: 'quadIn' })
                .to(0.11, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'backOut' })
                .to(0.1, { scale: Vec3.ONE }, { easing: 'sineOut' })
                .start();
        }
        if (this.modeLabel !== null) {
            tween(this.modeLabel.node)
                .delay(0.23)
                .to(0.22, { scale: Vec3.ONE }, { easing: 'backOut' })
                .start();
        }
        if (this.readyLabel !== null) {
            tween(this.readyLabel.node)
                .delay(0.38)
                .to(0.18, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'backOut' })
                .to(0.08, { scale: Vec3.ONE })
                .start();
        }

        return new Promise((resolve) => {
            if (this.opacity === null) {
                onCovered();
                this.node.active = false;
                resolve();
                return;
            }
            tween(this.opacity)
                .to(0.18, { opacity: 255 }, { easing: 'quadOut' })
                .call(() => {
                    if (version === this.playVersion) {
                        onCovered();
                    }
                })
                .delay(0.58)
                .to(0.28, { opacity: 0 }, { easing: 'quadIn' })
                .call(() => {
                    if (version === this.playVersion) {
                        this.node.active = false;
                    }
                    resolve();
                })
                .start();
        });
    }

    private buildBackground(): void {
        const background = this.createNode('TransitionBackground', 1920, 1280, 0, 0);
        const graphics = background.addComponent(Graphics);
        graphics.fillColor = new Color(3, 16, 68, 252);
        graphics.rect(-960, -640, 1920, 1280);
        graphics.fill();
        graphics.fillColor = new Color(17, 72, 184, 145);
        graphics.moveTo(-540, 330);
        graphics.lineTo(540, 610);
        graphics.lineTo(540, 230);
        graphics.lineTo(-540, -50);
        graphics.close();
        graphics.fill();
        graphics.fillColor = new Color(42, 161, 255, 65);
        graphics.moveTo(-540, -250);
        graphics.lineTo(540, 30);
        graphics.lineTo(540, -130);
        graphics.lineTo(-540, -410);
        graphics.close();
        graphics.fill();
    }

    private buildSparkles(): void {
        const positions = [
            [-390, 310], [-255, -260], [-100, 360],
            [120, -300], [280, 320], [405, -155],
        ] as const;
        for (let index = 0; index < positions.length; index += 1) {
            const [x, y] = positions[index];
            const sparkle = this.createNode(`DiamondSpark_${index}`, 46, 46, x, y);
            const graphics = sparkle.addComponent(Graphics);
            graphics.fillColor = index % 2 === 0
                ? new Color(101, 235, 255, 230)
                : new Color(255, 229, 75, 230);
            graphics.moveTo(0, 23);
            graphics.lineTo(18, 0);
            graphics.lineTo(0, -23);
            graphics.lineTo(-18, 0);
            graphics.close();
            graphics.fill();
            sparkle.addComponent(UIOpacity);
            this.sparkles.push(sparkle);
        }
    }

    private playSparkles(): void {
        for (let index = 0; index < this.sparkles.length; index += 1) {
            const sparkle = this.sparkles[index];
            const opacity = sparkle.getComponent(UIOpacity);
            const origin = sparkle.position.clone();
            sparkle.setPosition(origin.x + (index % 2 === 0 ? -150 : 150), origin.y);
            sparkle.setScale(0, 0, 1);
            sparkle.angle = -45;
            if (opacity !== null) {
                opacity.opacity = 0;
                tween(opacity)
                    .delay(0.12 + index * 0.045)
                    .to(0.12, { opacity: 255 })
                    .delay(0.35)
                    .to(0.18, { opacity: 0 })
                    .start();
            }
            tween(sparkle)
                .delay(0.12 + index * 0.045)
                .to(0.32, {
                    position: origin,
                    scale: new Vec3(1, 1, 1),
                    angle: 45,
                }, { easing: 'backOut' })
                .to(0.25, { scale: new Vec3(0.55, 0.55, 1), angle: 100 })
                .start();
        }
    }

    private createLabel(
        name: string,
        text: string,
        fontSize: number,
        y: number,
        color: Readonly<Color>,
    ): Label {
        const node = this.createNode(name, 900, 150, 0, y);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.12);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = color;
        label.enableOutline = true;
        label.outlineColor = new Color(1, 10, 48, 240);
        label.outlineWidth = 5;
        label.enableShadow = true;
        label.shadowColor = new Color(0, 0, 0, 180);
        label.shadowOffset.set(0, -7);
        label.shadowBlur = 4;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private createNode(name: string, width: number, height: number, x: number, y: number): Node {
        const node = new Node(name);
        node.layer = this.node.layer;
        node.setParent(this.node);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private stopTweens(): void {
        if (this.opacity !== null) {
            Tween.stopAllByTarget(this.opacity);
        }
        for (const node of [
            this.levelLabel?.node,
            this.modeLabel?.node,
            this.readyLabel?.node,
            ...this.sparkles,
        ]) {
            if (node !== undefined) {
                Tween.stopAllByTarget(node);
                const opacity = node.getComponent(UIOpacity);
                if (opacity !== null) {
                    Tween.stopAllByTarget(opacity);
                }
            }
        }
    }
}
