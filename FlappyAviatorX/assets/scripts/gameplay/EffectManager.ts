import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
const { ccclass } = _decorator;

interface Pixel { node: Node; velocity: Vec3; life: number; maxLife: number }

@ccclass('EffectManager')
export class EffectManager extends Component {
    private pixels: Pixel[] = [];
    private free: Node[] = [];
    private speedLines!: Graphics;
    private smokeFrame: SpriteFrame | null = null;
    private debrisFrame: SpriteFrame | null = null;
    private speedFrame: SpriteFrame | null = null;
    private speedNodes: Node[] = [];
    private dashActive = false;

    onLoad() {
        this.speedLines = this.node.addComponent(Graphics);
        (this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)).setContentSize(720, 1280);
        resources.load('art/gameplay/smoke/spriteFrame', SpriteFrame, (error, frame) => { if (!error) this.smokeFrame = frame; });
        resources.load('art/gameplay/pipe-debris/spriteFrame', SpriteFrame, (error, frame) => { if (!error) this.debrisFrame = frame; });
        resources.load('art/gameplay/speed-lines/spriteFrame', SpriteFrame, (error, frame) => {
            if (error || !this.node.isValid) return;
            this.speedFrame = frame;
            for (let i = 0; i < 6; i++) this.speedNodes.push(this.makeSpeedLine(i));
        });
    }

    emitSmoke(worldPos: Readonly<Vec3>, dash: boolean) {
        const pos = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
        this.spawnPixel(pos.x, pos.y, dash ? new Color(255, 176, 62) : new Color(225, 232, 238), dash ? -300 : -105, (Math.random() - .5) * 38, dash ? .3 : .72, dash ? 48 : 36, this.smokeFrame);
    }

    burst(pos: Readonly<Vec3>) {
        if (this.debrisFrame) {
            this.spawnPixel(pos.x, pos.y, Color.WHITE, -70, 120, .65, 120, this.debrisFrame);
            return;
        }
        for (let i = 0; i < 18; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = 120 + Math.random() * 260;
            this.spawnPixel(pos.x, pos.y, i % 3 ? new Color(63, 125, 82) : new Color(32, 70, 60), Math.cos(a) * speed, Math.sin(a) * speed, .65, 8 + Math.random() * 7);
        }
    }

    showDash(active: boolean) {
        this.dashActive = active;
        const g = this.speedLines; g.clear();
        if (this.speedNodes.length) {
            for (const node of this.speedNodes) node.active = active;
            return;
        }
        if (!active) return;
        g.fillColor = new Color(255, 244, 178, 105);
        for (let i = 0; i < 18; i++) g.rect(-360 + Math.random() * 720, -600 + Math.random() * 1200, 80 + Math.random() * 180, 3 + Math.random() * 5);
        g.fill();
    }

    update(dt: number) {
        if (this.dashActive) for (const line of this.speedNodes) {
            line.setPosition(line.position.x - 620 * dt, line.position.y);
            if (line.position.x < -480) line.setPosition(480, -520 + Math.random() * 1040);
        }
        for (let i = this.pixels.length - 1; i >= 0; i--) {
            const p = this.pixels[i]; p.life -= dt;
            if (p.life <= 0) { p.node.active = false; this.free.push(p.node); this.pixels.splice(i, 1); continue; }
            p.velocity.y -= 180 * dt;
            p.node.setPosition(p.node.position.x + p.velocity.x * dt, p.node.position.y + p.velocity.y * dt);
            p.node.setScale(Math.max(.2, p.life / p.maxLife), Math.max(.2, p.life / p.maxLife));
        }
    }

    private spawnPixel(x: number, y: number, color: Color, vx: number, vy: number, life: number, size: number, frame: SpriteFrame | null = null) {
        const node = this.free.pop() ?? new Node('PixelParticle');
        node.layer = this.node.layer; node.parent = this.node; node.active = true; node.setPosition(x, y);
        let g = node.getComponent(Graphics); if (!g) g = node.addComponent(Graphics);
        const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
        g.clear(); sprite.enabled = !!frame;
        if (frame) {
            sprite.spriteFrame = frame; sprite.color = color;
            node.getComponent(UITransform)!.setContentSize(size, size * 0.67);
        } else {
            g.fillColor = color; g.rect(-size / 2, -size / 2, size, size); g.fill();
        }
        this.pixels.push({ node, velocity: new Vec3(vx, vy), life, maxLife: life });
    }

    private makeSpeedLine(index: number) {
        const node = new Node('SpeedLine'); node.layer = this.node.layer; node.parent = this.node;
        const sprite = node.addComponent(Sprite); sprite.spriteFrame = this.speedFrame; sprite.color = new Color(255, 255, 255, 150);
        node.getComponent(UITransform)!.setContentSize(230, 76);
        node.setPosition(-300 + index * 140, -500 + Math.random() * 1000); node.active = this.dashActive;
        return node;
    }
}
