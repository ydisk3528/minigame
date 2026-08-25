import { _decorator, AudioClip, AudioSource, Component, resources } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property(AudioClip) clickClip: AudioClip | null = null;
    @property(AudioClip) clearClip: AudioClip | null = null;
    @property(AudioClip) blockedClip: AudioClip | null = null;
    @property(AudioClip) winClip: AudioClip | null = null;
    @property(AudioClip) bgmClip: AudioClip | null = null;
    private source!: AudioSource;

    onLoad(): void { this.source = this.getComponent(AudioSource) ?? this.addComponent(AudioSource); }
    async loadLegacyAudio(): Promise<void> {
        const [click, clear, blocked, win, bgm] = await Promise.all([
            this.load('ported/sound/click'), this.load('ported/sound/1'), this.load('ported/sound/error'),
            this.load('ported/sound/win'), this.load('ported/sound/bgm'),
        ]);
        this.clickClip = click; this.clearClip = clear; this.blockedClip = blocked; this.winClip = win; this.bgmClip = bgm;
    }
    playClick(): void { this.play(this.clickClip); }
    playClear(): void { this.play(this.clearClip); }
    playBlocked(): void { this.play(this.blockedClip); }
    playWin(): void { this.play(this.winClip); }
    playBGM(): void { if (this.bgmClip) { this.source.clip = this.bgmClip; this.source.loop = true; this.source.play(); } }
    private play(clip: AudioClip | null): void { if (clip) this.source.playOneShot(clip); }
    private load(path: string): Promise<AudioClip> {
        return new Promise((resolve, reject) => resources.load(path, AudioClip, (error, clip) => error ? reject(error) : resolve(clip)));
    }
}
