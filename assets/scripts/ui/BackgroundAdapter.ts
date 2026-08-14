import {
    _decorator,
    Component,
    Node,
    screen,
    Sprite,
    UITransform,
    view,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BackgroundAdapter')
export class BackgroundAdapter extends Component {
    @property(Node)
    public background: Node | null = null;

    protected override start(): void {
        this.adaptBackground();
        view.on('canvas-resize', this.adaptBackground, this);
        view.on('design-resolution-changed', this.adaptBackground, this);
    }

    protected override onDestroy(): void {
        view.off('canvas-resize', this.adaptBackground, this);
        view.off('design-resolution-changed', this.adaptBackground, this);
    }

    public refresh(): void {
        this.adaptBackground();
    }

    private adaptBackground(): void {
        if (!this.background) {
            return;
        }

        const transform = this.background.getComponent(UITransform);
        if (!transform) {
            return;
        }

        const originalSize = this.background
            .getComponent(Sprite)?.spriteFrame?.originalSize;
        if (originalSize) {
            transform.setContentSize(originalSize);
        }

        const targetWidth = screen.windowSize.width / view.getScaleX();
        const targetHeight = screen.windowSize.height / view.getScaleY();
        const bgWidth = transform.contentSize.width;
        const bgHeight = transform.contentSize.height;

        if (bgWidth <= 0 || bgHeight <= 0) {
            return;
        }

        const scaleX = targetWidth / bgWidth;
        const scaleY = targetHeight / bgHeight;
        const scale = Math.max(scaleX, scaleY);

        this.background.setScale(scale, scale, 1);
        this.background.setPosition(0, 0, 0);
    }
}
