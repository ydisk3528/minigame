import { _decorator, Component, Node, Label, Prefab, instantiate, resources, view, ResolutionPolicy } from 'cc';
const { ccclass } = _decorator;
@ccclass('ChickenBoot')
export class ChickenBoot extends Component {
    private loading = false;
    start() { view.setDesignResolutionSize(1136, 640, ResolutionPolicy.SHOW_ALL); this.node.getChildByPath('Boot/Retry')!.on(Node.EventType.TOUCH_END, this.loadGame, this); this.loadGame(); }
    update(dt: number) { const spinner = this.node.getChildByPath('Boot/Spinner'); if (spinner?.activeInHierarchy) spinner.angle -= dt * 220; }
    private loadGame() {
        if (this.loading) return;
        this.loading = true;
        const shell = this.node.getChildByName('Boot')!, label = shell.getChildByName('Progress')!.getComponent(Label)!;
        shell.getChildByName('Retry')!.active = false; label.string = 'LOADING  0%';
        resources.load('deferred/ChickenGame', Prefab, (done, total) => { if (this.isValid) label.string = `LOADING  ${Math.floor(done / Math.max(1, total) * 100)}%`; }, (err, asset) => {
            if (!this.isValid) return;
            this.loading = false;
            if (err) { console.error(err); label.string = 'Load failed. Please retry.'; shell.getChildByName('Retry')!.active = true; return; }
            const game = instantiate(asset); this.node.addChild(game); shell.active = false;
        });
    }
}
