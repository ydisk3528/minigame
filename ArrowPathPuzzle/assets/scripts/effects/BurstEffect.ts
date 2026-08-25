import { _decorator, Color, Component, Graphics, tween, UIOpacity, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BurstEffect')
export class BurstEffect extends Component {
    @property(Color) color = new Color(232, 145, 78, 255);
    @property particleCount = 10;

    play(position: Vec3): void {
        this.node.setWorldPosition(position);
        const graphics = this.getComponent(Graphics)!;
        graphics.fillColor = this.color;
        for (let i = 0; i < this.particleCount; i++) {
            const angle = i * Math.PI * 2 / this.particleCount;
            const radius = 24 + (i % 3) * 11;
            graphics.circle(Math.cos(angle) * radius, Math.sin(angle) * radius, 4 + i % 3);
        }
        graphics.fill();
        const opacity = this.getComponent(UIOpacity)!;
        tween(this.node).to(0.35, { scale: new Vec3(1.7, 1.7, 1) }).start();
        tween(opacity).delay(0.12).to(0.28, { opacity: 0 }).call(() => this.node.destroy()).start();
    }
}
