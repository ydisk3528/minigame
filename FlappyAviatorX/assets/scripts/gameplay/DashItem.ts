import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame } from 'cc';
import { GameManager } from '../core/GameManager';
const { ccclass, property } = _decorator;

@ccclass('DashItem')
export class DashItem extends Component {
    @property(Node) artwork: Node | null = null;
    private phase = 0;
    onLoad() {
        if (!this.node.getComponent(Graphics)) this.node.addComponent(Graphics);
        resources.load('art/gameplay/dash/spriteFrame', SpriteFrame, (error, frame) => {
            if (!error && this.artwork?.isValid) this.artwork.getComponent(Sprite)!.spriteFrame = frame;
        });
        if (this.artwork) this.getComponent(Graphics)?.clear(); else this.draw();
    }
    resetAt(x: number, y: number) { this.node.setPosition(x, y); this.node.active = true; }
    update(dt: number) {
        const game = GameManager.instance;
        if (!game?.isPlaying) return;
        this.phase += dt * 5;
        this.node.setPosition(this.node.position.x - game.worldSpeed * dt, this.node.position.y + Math.sin(this.phase) * 0.35);
        this.node.setScale(1 + Math.sin(this.phase * 1.7) * 0.08, 1 + Math.sin(this.phase * 1.7) * 0.08);
        if (this.node.position.x < -410) game.recycleItem(this.node);
    }
    private draw() {
        const g = this.getComponent(Graphics)!; g.clear();
        g.fillColor = new Color(29, 45, 58, 210); g.rect(-27, -27, 54, 54); g.fill();
        g.fillColor = new Color(255, 205, 63); g.rect(-13, -20, 12, 20); g.fill(); g.rect(1, 0, 12, 20); g.fill();
        g.fillColor = new Color(255, 241, 157); g.rect(-1, -6, 12, 12); g.fill();
    }
}
