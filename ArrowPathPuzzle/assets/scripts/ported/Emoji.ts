import { _decorator, Component, Sprite, SpriteFrame, tween, UIOpacity, Vec3 } from 'cc';
const { ccclass } = _decorator;

@ccclass('Emoji')
export class Emoji extends Component {
    play(frame: SpriteFrame): void {
        (this.getComponent(Sprite) ?? this.addComponent(Sprite)).spriteFrame = frame;
        const opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        this.node.setScale(Vec3.ZERO);
        tween(this.node).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).delay(0.35).start();
        tween(opacity).delay(0.45).to(0.35, { opacity: 0 }).call(() => this.node.destroy()).start();
    }
}
