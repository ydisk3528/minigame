import { _decorator, Component, Node, Label, Button, Prefab, instantiate, resources, view, ResolutionPolicy, sp, AudioSource } from 'cc';
import { CrownGame } from './CrownGame';
import { loadSave, nativeSaveBridge } from './GameSave';
const { ccclass } = _decorator;
@ccclass('CrownBoot')
export class CrownBoot extends Component {
    private loading = false;
    private opening: Node | null = null;
    private game: Node | null = null;
    private started = false;
    start() {
        view.setDesignResolutionSize(1136, 640, ResolutionPolicy.SHOW_ALL);
        this.node.getChildByPath('Boot/Retry')!.on(Button.EventType.CLICK, this.loadGame, this);
        this.loadGame();
    }
    update(dt: number) { const spinner = this.node.getChildByPath('Boot/Spinner'); if (spinner?.activeInHierarchy) spinner.angle -= dt * 220; }
    private loadGame() {
        if (this.loading) return;
        this.loading = true;
        const shell = this.node.getChildByName('Boot')!, label = shell.getChildByName('Progress')!.getComponent(Label)!;
        shell.getChildByName('Retry')!.active = false;
        const failed = (err: Error) => { console.error(err); this.loading = false; label.string = 'Load failed. Please retry.'; shell.getChildByName('Retry')!.active = true; };
        const loadGame = () => resources.load('deferred/CrownGame', Prefab, (done, total) => {
            if (this.isValid) label.string = `LOADING  ${20 + Math.floor(done / Math.max(1, total) * 80)}%`;
        }, (err, asset) => {
            if (!this.isValid) return;
            if (err) { failed(err); return; }
            this.loading = false; this.game = instantiate(asset); this.game.active = false; this.node.addChild(this.game);
            shell.active = false; this.opening!.active = true;
            this.opening!.getChildByName('Play')!.on(Button.EventType.CLICK, this.play, this);
        });
        if (this.opening) { loadGame(); return; }
        resources.load('deferred/CrownOpening', Prefab, (done, total) => {
            if (this.isValid) label.string = `LOADING  ${Math.floor(done / Math.max(1, total) * 20)}%`;
        }, (err, asset) => {
            if (!this.isValid) return;
            if (err) { failed(err); return; }
            this.opening = instantiate(asset); this.opening.active = false; this.node.addChild(this.opening);
            this.opening.getChildByName('OpeningSpine')!.getComponent(sp.Skeleton)!.paused = true;
            loadGame();
        });
    }
    private play() {
        if (this.started || !this.game || !this.opening) return;
        this.started = true;
        const game = this.game.getComponent(CrownGame)!;
        const debut = game.sounds[game.soundNames.indexOf('Debut')];
        const openingAudio = this.node.getComponent(AudioSource) || this.node.addComponent(AudioSource);
        if (debut && !loadSave(window.localStorage, nativeSaveBridge()).muted) {
            openingAudio.clip = debut; openingAudio.loop = false; openingAudio.volume = .55;
            openingAudio.play();
        }
        this.opening.getChildByName('Play')!.active = false; this.opening.getChildByName('Hint')!.active = false;
        const skeleton = this.opening.getChildByName('OpeningSpine')!.getComponent(sp.Skeleton)!;
        const animation = skeleton.skeletonData?.getRuntimeData()?.findAnimation('GameIntro_L');
        let finished = false;
        const finish = () => { if (finished || !this.isValid) return; finished = true; openingAudio.stop(); skeleton.setCompleteListener(null); this.opening!.active = false; this.game!.active = true; };
        if (!animation) { finish(); return; }
        skeleton.paused = false; skeleton.setCompleteListener(finish); skeleton.setAnimation(0, 'GameIntro_L', false);
        this.scheduleOnce(finish, animation.duration + 0.3);
    }
}
