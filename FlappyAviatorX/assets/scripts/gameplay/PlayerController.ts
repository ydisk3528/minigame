import { _decorator, Color, Component, Graphics, math, Node, resources, Sprite, SpriteFrame, Vec3 } from 'cc';
import { GROUND_Y, LevelConfig } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Sprite) artwork: Sprite | null = null;
    @property(Node) smokeAnchor: Node | null = null;
    @property gravity = -1500;
    @property flapVelocity = 520;
    @property maxFallSpeed = -760;

    velocity = 0;
    isDashing = false;
    private propellerFrame = 0;
    private smokeClock = 0;
    private flightFrames: SpriteFrame[] = [];
    private tailExhaust: Sprite | null = null;

    onLoad() {
        if (!this.node.getComponent(Graphics)) this.node.addComponent(Graphics);
        this.tailExhaust = this.smokeAnchor?.getChildByName('TailExhaust')?.getComponent(Sprite) ?? null;
        resources.loadDir('art/gameplay', SpriteFrame, (error, frames) => {
            if (error || !this.node.isValid) return;
            this.flightFrames = frames.filter(frame => /^plane-[123]$/.test(frame.name)).sort((a, b) => a.name.localeCompare(b.name));
            this.draw();
        });
        this.draw();
    }

    resetPlayer() {
        this.velocity = 0;
        this.isDashing = false;
        this.node.setPosition(-190, 40);
        this.node.setRotationFromEuler(0, 0, 0);
        this.node.active = true;
    }

    configure(level: LevelConfig) {
        this.gravity = level.gravity;
        this.flapVelocity = level.flapVelocity;
        this.maxFallSpeed = level.maxFallSpeed;
    }

    flap() {
        if (!GameManager.instance?.isPlaying) return;
        this.velocity = this.flapVelocity;
    }

    setDash(active: boolean) {
        this.isDashing = active;
        this.draw();
    }

    update(dt: number) {
        const game = GameManager.instance;
        if (!game?.isPlaying) { if (this.tailExhaust) this.tailExhaust.node.active = false; return; }
        this.velocity = Math.max(this.maxFallSpeed, this.velocity + this.gravity * dt);
        this.node.setPosition(this.node.position.x, this.node.position.y + this.velocity * dt);
        const tilt = math.clamp(this.velocity * 0.055, -32, 22);
        this.node.setRotationFromEuler(0, 0, tilt);

        this.propellerFrame += dt * (this.isDashing ? 28 : 16);
        this.drawTailExhaust();
        this.smokeClock += dt;
        if (this.smokeClock >= (this.isDashing ? 0.03 : 0.07)) {
            this.smokeClock = 0;
            const tail = this.smokeAnchor?.worldPosition ?? new Vec3(this.node.worldPosition.x - 45, this.node.worldPosition.y, 0);
            game.effects.emitSmoke(tail, this.isDashing);
        }
        this.draw();
        if (this.node.position.y < GROUND_Y + 20 || this.node.position.y > 620) game.gameOver();
    }

    private draw() {
        const g = this.getComponent(Graphics)!;
        g.clear();
        if (this.artwork) {
            if (this.flightFrames.length) this.artwork.spriteFrame = this.flightFrames[Math.floor(this.propellerFrame) % this.flightFrames.length];
            this.artwork.color = this.isDashing ? new Color(255, 232, 130) : Color.WHITE;
            if (this.isDashing) { g.fillColor = new Color(255, 173, 52, 220); g.rect(-72, -6, 20, 12); g.fill(); }
            return;
        }
        g.fillColor = this.isDashing ? new Color(255, 220, 72) : new Color(198, 55, 48);
        g.rect(-34, -12, 58, 24); g.fill();
        g.fillColor = new Color(238, 92, 56); g.rect(-16, 12, 32, 10); g.fill();
        g.fillColor = new Color(116, 190, 214); g.rect(-10, 2, 18, 10); g.fill();
        g.fillColor = new Color(55, 67, 78); g.rect(-34, -19, 10, 8); g.fill();
        g.fillColor = new Color(245, 231, 177); g.rect(24, -7, 10, 14); g.fill();
        const tall = Math.floor(this.propellerFrame) % 2 === 0;
        g.fillColor = new Color(232, 242, 228);
        g.rect(36, tall ? -23 : -13, 5, tall ? 46 : 26); g.fill();
        if (this.isDashing) {
            g.fillColor = new Color(255, 151, 43, 210); g.rect(-52, -8, 18, 16); g.fill();
            g.fillColor = new Color(255, 238, 114, 230); g.rect(-63, -4, 29, 8); g.fill();
        }
    }

    private drawTailExhaust() {
        const sprite = this.tailExhaust; if (!sprite) return;
        const pulse = Math.floor(this.propellerFrame) % 2 ? 1 : .88;
        sprite.node.active = true;
        sprite.node.setScale(this.isDashing ? 1.35 * pulse : pulse, this.isDashing ? 1.15 : 1, 1);
        sprite.color = this.isDashing ? new Color(255, 190, 90, 245) : Color.WHITE;
    }

}
