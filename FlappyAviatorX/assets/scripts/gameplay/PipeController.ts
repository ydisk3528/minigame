import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { GAME_HEIGHT } from '../core/GameTypes';
import { GameManager } from '../core/GameManager';
const { ccclass, property } = _decorator;
const EDGE_OVERLAP = 64;

@ccclass('PipeController')
export class PipeController extends Component {
    @property width = 112;
    @property(Node) bottomArt: Node | null = null;
    @property(Node) topArt: Node | null = null;
    gapCenter = 0;
    gapSize = 320;
    scored = false;

    onLoad() {
        this.node.getComponent(UITransform)?.setContentSize(this.width, 1280);
        if (!this.node.getComponent(Graphics)) this.node.addComponent(Graphics);
        resources.load('art/gameplay/pipe-body/spriteFrame', SpriteFrame, (error, frame) => {
            if (error || !this.node.isValid) return;
            if (this.bottomArt) this.bottomArt.getComponent(Sprite)!.spriteFrame = frame;
            if (this.topArt) this.topArt.getComponent(Sprite)!.spriteFrame = frame;
        });
        this.draw();
    }

    resetAt(x: number, gapCenter: number, gapSize: number) {
        this.gapCenter = gapCenter;
        this.gapSize = gapSize;
        this.scored = false;
        this.node.setPosition(x, 0);
        this.node.active = true;
        this.draw();
    }

    update(dt: number) {
        const game = GameManager.instance;
        if (!game?.isPlaying) return;
        this.node.setPosition(this.node.position.x - game.worldSpeed * dt, 0);
        if (this.node.position.x < -430) game.recyclePipe(this.node);
    }

    collides(playerPos: Readonly<Vec3>) {
        if (Math.abs(playerPos.x - this.node.position.x) > this.width * 0.5 + 27) return false;
        const low = this.gapCenter - this.gapSize * 0.5;
        const high = this.gapCenter + this.gapSize * 0.5;
        return playerPos.y - 18 < low || playerPos.y + 18 > high;
    }

    private draw() {
        const g = this.getComponent(Graphics)!;
        const low = this.gapCenter - this.gapSize * 0.5;
        const high = this.gapCenter + this.gapSize * 0.5;
        const bottomEdge = -GAME_HEIGHT * 0.5 - EDGE_OVERLAP;
        const topEdge = GAME_HEIGHT * 0.5 + EDGE_OVERLAP;
        g.clear();
        if (this.bottomArt && this.topArt) {
            this.placeArt(this.bottomArt, bottomEdge, low - bottomEdge);
            this.placeArt(this.topArt, high, topEdge - high);
            return;
        }
        this.drawPipe(g, bottomEdge, low - bottomEdge, true);
        this.drawPipe(g, high, topEdge - high, false);
    }

    private drawPipe(g: Graphics, y: number, h: number, bottom: boolean) {
        g.fillColor = new Color(43, 93, 73); g.rect(-this.width / 2, y, this.width, h); g.fill();
        g.fillColor = new Color(75, 141, 91); g.rect(-this.width / 2 + 10, y, 18, h); g.fill();
        g.fillColor = new Color(26, 58, 54); g.rect(this.width / 2 - 14, y, 14, h); g.fill();
        const capY = bottom ? y + h - 24 : y;
        g.fillColor = new Color(58, 119, 79); g.rect(-this.width / 2 - 10, capY, this.width + 20, 24); g.fill();
    }

    private placeArt(node: Node, y: number, height: number) {
        node.getComponent(UITransform)!.setContentSize(this.width + 20, Math.max(1, height));
        node.setPosition(0, y + height * .5);
    }
}
