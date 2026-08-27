export class GameAudio {
    private readonly bgm: Laya.SoundNode;
    private readonly select: Laya.SoundNode;
    private readonly match: Laya.SoundNode;
    private readonly rocket: Laya.SoundNode;
    private readonly bomb: Laya.SoundNode;
    private readonly comboGood: Laya.SoundNode;
    private readonly comboGreat: Laya.SoundNode;
    private readonly comboAmazing: Laya.SoundNode;
    private readonly win: Laya.SoundNode;
    private readonly winShatter: Laya.SoundNode;
    private musicStarted = false;
    private userInteracted = false;

    public constructor(root: Laya.Sprite) {
        this.bgm = this.require(root, "Bgm");
        this.select = this.require(root, "Select");
        this.match = this.require(root, "Match");
        this.rocket = this.require(root, "Rocket");
        this.bomb = this.require(root, "Bomb");
        this.comboGood = this.require(root, "ComboGood");
        this.comboGreat = this.require(root, "ComboGreat");
        this.comboAmazing = this.require(root, "ComboAmazing");
        this.win = this.require(root, "Win");
        this.winShatter = this.require(root, "WinShatter");
        Laya.SoundManager.musicVolume = 0.34;
        Laya.SoundManager.soundVolume = 0.78;
    }

    public interact(): void {
        this.userInteracted = true;
        if (!Laya.SoundManager.musicMuted && !this.musicStarted) {
            this.musicStarted = true;
            this.bgm.play(0);
        }
        if (!Laya.SoundManager.soundMuted) this.select.play();
    }

    public setMusicEnabled(enabled: boolean): void {
        Laya.SoundManager.musicMuted = !enabled;
        if (enabled && this.userInteracted && !this.musicStarted) {
            this.musicStarted = true;
            this.bgm.play(0);
        }
    }

    public setSoundEnabled(enabled: boolean): void {
        Laya.SoundManager.soundMuted = !enabled;
    }

    public clear(cascade: number, specialAttack: boolean, cleared: number): void {
        if (specialAttack) (cleared >= 12 ? this.bomb : this.rocket).play();
        else this.match.play();
        if (cascade === 2) this.comboGood.play();
        else if (cascade === 3) this.comboGreat.play();
        else if (cascade >= 4) this.comboAmazing.play();
    }

    public result(won: boolean): void {
        if (won) this.win.play();
    }

    public shatter(): void {
        this.winShatter.play();
    }

    private require(root: Laya.Sprite, name: string): Laya.SoundNode {
        const node = root.getChildByName(name) as Laya.SoundNode;
        if (!node) throw new Error(`Audio prefab binding is missing: ${name}`);
        return node;
    }
}
