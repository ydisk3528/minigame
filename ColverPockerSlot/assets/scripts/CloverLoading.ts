import { _decorator, Asset, AssetManager, assetManager, BlockInputEvents, Color, Component, Graphics, instantiate, Label, Layers, Node, Prefab, Sprite, SpriteFrame, UITransform, view, ResolutionPolicy } from 'cc';
const { ccclass, property } = _decorator;
export type LoadItem = { path: string; type: typeof Asset };

/** One blocking loading surface, shared by startup and first-use resources. */
@ccclass('CloverLoading')
export class CloverLoading extends Component {
    static instance: CloverLoading;
    @property(SpriteFrame) spinner: SpriteFrame = null!;
    private overlay: Node = null!;
    private wheel: Node = null!;
    private caption: Label = null!;
    private retry: Node = null!;
    private retryAction: (() => void) | null = null;
    private bundle: AssetManager.Bundle = null!;
    private percent = 0;
    private pending = false;
    get active() { return this.pending; }

    onLoad() {
        CloverLoading.instance = this;
        view.setDesignResolutionSize(1136, 640, ResolutionPolicy.SHOW_ALL);
        this.overlay = this.child(this.node, 'Loading', 0, 0, 10000, 10000);
        this.overlay.addComponent(BlockInputEvents);
        const black = this.overlay.addComponent(Graphics);
        black.fillColor = Color.BLACK; black.rect(-5000, -5000, 10000, 10000); black.fill();
        this.wheel = this.child(this.overlay, 'Spinner', 0, 25, 128, 128);
        const sprite = this.wheel.addComponent(Sprite); sprite.spriteFrame = this.spinner; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.caption = this.child(this.overlay, 'Progress', 0, -60, 500, 40).addComponent(Label);
        this.caption.fontSize = 22; this.caption.lineHeight = 28; this.caption.color = Color.WHITE;
        this.retry = this.child(this.overlay, 'Retry', 0, -115, 320, 64);
        const text = this.retry.addComponent(Label); text.string = 'RETRY'; text.fontSize = 22; text.color = Color.WHITE;
        this.retry.on(Node.EventType.TOUCH_END, () => this.retryAction?.());
        this.retry.active = false;
        this.caption.string = 'Loading 0%';
        if (typeof document !== 'undefined') document.getElementById('clover-startup')?.remove();
    }

    async start() {
        await this.run(async () => {
            if (!this.bundle) this.bundle = await new Promise<AssetManager.Bundle>((resolve, reject) => {
                assetManager.loadBundle('clover', (error, bundle) => error ? reject(error) : resolve(bundle));
            });
            const [asset] = await this.fetch([{ path: 'core/CloverMain', type: Prefab }]);
            const main = instantiate(asset as Prefab);
            this.node.addChild(main);
            this.overlay.setSiblingIndex(this.node.children.length - 1);
            // Allow authored components to initialize behind the black surface.
            await new Promise<void>(resolve => this.scheduleOnce(resolve, 0));
        });
        console.info('[Clover] startup ready');
    }

    private child(parent: Node, name: string, x: number, y: number, w: number, h: number) {
        const n = new Node(name); n.layer = Layers.Enum.UI_2D; parent.addChild(n); n.setPosition(x, y);
        n.addComponent(UITransform).setContentSize(w, h); return n;
    }

    update(dt: number) { if (this.overlay.active && !this.retry.active) this.wheel.angle -= dt * 240; }

    private progress(value: number) {
        this.percent = Math.max(this.percent, Math.min(99, Math.floor(value)));
        this.caption.string = 'Loading ' + this.percent + '%';
    }

    private async fetch(items: LoadItem[]): Promise<Asset[]> {
        const ratios = items.map(() => 0);
        const results = await Promise.allSettled(items.map((item, i) => new Promise<Asset>((resolve, reject) => {
            this.bundle.load(item.path, item.type, (done, total) => {
                ratios[i] = total ? done / total : 0;
                this.progress(ratios.reduce((a, b) => a + b, 0) / items.length * 95);
            }, (error, asset) => {
                if (error) { reject(error); return; }
                ratios[i] = 1; this.progress(ratios.reduce((a, b) => a + b, 0) / items.length * 95);
                resolve(asset);
            });
        })));
        const failed = results.find(result => result.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
        return results.map(result => (result as PromiseFulfilledResult<Asset>).value);
    }

    /** Cache hits do not flash a loading screen. setup runs before it is dismissed. */
    async load(items: LoadItem[], setup: (assets: Asset[]) => void = () => {}) {
        const cached = items.map(item => this.bundle.get(item.path, item.type));
        if (cached.every(Boolean)) { setup(cached as Asset[]); return; }
        await this.run(async () => { setup(await this.fetch(items)); });
    }

    private async run(task: () => Promise<void>) {
        if (this.pending) throw new Error('Overlapping Clover load');
        this.pending = true; this.overlay.active = true;
        this.overlay.setSiblingIndex(this.node.children.length - 1);
        for (;;) {
            this.percent = 0; this.progress(0); this.retry.active = false;
            try { await task(); break; }
            catch (error) {
                console.error('[Clover] load failed; retry available', error);
                this.caption.string = 'Unable to load. Check connection.';
                this.retry.active = true;
                await new Promise<void>(resolve => { this.retryAction = () => { this.retryAction = null; resolve(); }; });
            }
        }
        this.caption.string = 'Loading 100%';
        await new Promise<void>(resolve => this.scheduleOnce(resolve, 0));
        this.overlay.active = false; this.pending = false;
    }
}
