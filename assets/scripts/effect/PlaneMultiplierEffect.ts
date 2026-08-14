import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    Graphics,
    Label,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3,
} from 'cc';

const { ccclass } = _decorator;
const UI_LAYER = Layers.Enum.UI_2D;
const FLIGHT_DURATION = 5.2;
const START = new Vec3(-760, -350, 0);
const CONTROL = new Vec3(-90, -300, 0);
const END = new Vec3(650, 270, 0);

@ccclass('PlaneMultiplierEffect')
export class PlaneMultiplierEffect extends Component {
    private plane: Node | null = null;
    private trail: Graphics | null = null;
    private trailGlow: Graphics | null = null;
    private bullets: Node[] = [];
    private multiplierLabel: Label | null = null;
    private elapsed = 0;
    private targetMultiplier = 10;
    private flightPromise: Promise<void> | null = null;
    private resolveFlight: (() => void) | null = null;

    public initialize(planeFrame: SpriteFrame | null, bulletFrame: SpriteFrame | null): void {
        this.node.active = false;
        this.node.addComponent(BlockInputEvents);
        this.trailGlow = this.createTrail('FlightTrailGlow', 13, new Color(119, 71, 255, 65));
        this.trail = this.createTrail('FlightTrail', 5, new Color(42, 211, 255, 235));
        this.plane = this.createSprite('Plane', planeFrame, 360, 242);
        this.multiplierLabel = this.createLabel();
        for (let index = 0; index < 3; index += 1) {
            this.bullets.push(this.createSprite(`PlasmaBullet${index + 1}`, bulletFrame, 150, 37));
        }
    }

    public play(multiplier: number): Promise<void> {
        this.targetMultiplier = Math.min(30, Math.max(10, Math.floor(multiplier)));
        if (this.node.active) {
            return this.flightPromise ?? Promise.resolve();
        }
        this.elapsed = 0;
        this.node.active = true;
        this.updateVisuals(0);
        this.flightPromise = new Promise((resolve) => {
            this.resolveFlight = resolve;
        });
        return this.flightPromise;
    }

    protected override update(deltaTime: number): void {
        if (!this.node.active) {
            return;
        }
        this.elapsed += Math.max(0, deltaTime);
        const progress = Math.min(1, this.elapsed / FLIGHT_DURATION);
        this.updateVisuals(progress);
        if (this.elapsed >= FLIGHT_DURATION + 0.65) {
            this.finishFlight();
        }
    }

    protected override onDestroy(): void {
        this.finishFlight();
    }

    private finishFlight(): void {
        this.node.active = false;
        const resolve = this.resolveFlight;
        this.resolveFlight = null;
        this.flightPromise = null;
        resolve?.();
    }

    private updateVisuals(progress: number): void {
        const eased = 1 - (1 - progress) ** 3;
        const inverse = 1 - progress;
        const x = inverse * inverse * START.x + 2 * inverse * progress * CONTROL.x + progress * progress * END.x;
        const y = inverse * inverse * START.y + 2 * inverse * progress * CONTROL.y + progress * progress * END.y;
        const dx = 2 * inverse * (CONTROL.x - START.x) + 2 * progress * (END.x - CONTROL.x);
        const dy = 2 * inverse * (CONTROL.y - START.y) + 2 * progress * (END.y - CONTROL.y);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        this.plane?.setPosition(x, y, 0);
        if (this.plane !== null) {
            this.plane.angle = angle - 22;
        }
        this.plane?.setScale(0.86 + eased * 0.18, 0.86 + eased * 0.18, 1);
        this.drawTrail(this.trailGlow, progress);
        this.drawTrail(this.trail, progress);
        if (this.multiplierLabel !== null) {
            const shown = Math.round(10 + (this.targetMultiplier - 10) * eased);
            this.multiplierLabel.string = `${shown}X`;
        }

        for (let index = 0; index < this.bullets.length; index += 1) {
            const phase = (this.elapsed * 2.4 + index / this.bullets.length) % 1;
            const bullet = this.bullets[index];
            bullet.angle = angle;
            bullet.setPosition(
                x + Math.cos(angle * Math.PI / 180) * (185 + phase * 330),
                y + Math.sin(angle * Math.PI / 180) * (185 + phase * 330),
                0,
            );
            const scale = 0.72 + (1 - phase) * 0.28;
            bullet.setScale(scale, scale, 1);
        }
    }

    private drawTrail(graphics: Graphics | null, progress: number): void {
        if (graphics === null) {
            return;
        }
        graphics.clear();
        graphics.moveTo(START.x, START.y);
        const steps = Math.max(1, Math.ceil(progress * 48));
        for (let index = 1; index <= steps; index += 1) {
            const t = progress * index / steps;
            const inverse = 1 - t;
            graphics.lineTo(
                inverse * inverse * START.x + 2 * inverse * t * CONTROL.x + t * t * END.x,
                inverse * inverse * START.y + 2 * inverse * t * CONTROL.y + t * t * END.y,
            );
        }
        graphics.stroke();
    }

    private createTrail(name: string, width: number, color: Readonly<Color>): Graphics {
        const node = new Node(name);
        node.layer = UI_LAYER;
        node.setParent(this.node);
        const graphics = node.addComponent(Graphics);
        graphics.lineWidth = width;
        graphics.lineCap = Graphics.LineCap.ROUND;
        graphics.lineJoin = Graphics.LineJoin.ROUND;
        graphics.strokeColor = color;
        return graphics;
    }

    private createSprite(name: string, frame: SpriteFrame | null, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = UI_LAYER;
        node.setParent(this.node);
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        return node;
    }

    private createLabel(): Label {
        const label = this.createText(
            'FlightMultiplier',
            '10X',
            104,
            410,
            new Color(255, 224, 64, 255),
        );
        label.enableOutline = true;
        label.outlineColor = new Color(94, 10, 24, 255);
        label.outlineWidth = 6;
        label.enableShadow = true;
        label.shadowColor = new Color(0, 0, 0, 190);
        return label;
    }

    private createText(
        name: string,
        text: string,
        fontSize: number,
        y: number,
        color: Readonly<Color>,
    ): Label {
        const node = new Node(name);
        node.layer = UI_LAYER;
        node.setParent(this.node);
        node.setPosition(0, y, 0);
        node.addComponent(UITransform).setContentSize(720, 130);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.12);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        return label;
    }
}
