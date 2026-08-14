import { _decorator, AudioClip, AudioSource, Component } from 'cc';
import { StorageManager } from '../utils/StorageManager';

const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    public static instance: AudioManager | null = null;

    @property(AudioClip)
    public backgroundMusic: AudioClip | null = null;

    @property(AudioClip)
    public clearSound: AudioClip | null = null;

    @property(AudioClip)
    public clickSound: AudioClip | null = null;

    @property(AudioClip)
    public gameLostSound: AudioClip | null = null;

    @property(AudioClip)
    public gameWinSound: AudioClip | null = null;

    @property(AudioClip)
    public gameStartSound: AudioClip | null = null;

    @property(AudioClip)
    public itemReadySound: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Black hole absorption loop; drag the AudioClip here.' })
    public blackHoleSound: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played just after effect_combo_amazing appears.' })
    public amazingSound: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Played just after effect_combo_great appears.' })
    public greatSound: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Bomb booster explosion sound (effect_cell_bomb.ogg).' })
    public bombSound: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Hammer booster destroy sound (effect_bingdu_destroy.ogg).' })
    public hammerSound: AudioClip | null = null;

    @property({ type: AudioClip, tooltip: 'Rainbow booster spread sound (effect_bingdu_manyan.ogg).' })
    public rainbowSound: AudioClip | null = null;

    @property({ range: [0, 1, 0.05] })
    public musicVolume = 0.45;

    @property({ range: [0, 1, 0.05] })
    public effectVolume = 0.9;

    private musicSource: AudioSource | null = null;
    private effectSource: AudioSource | null = null;
    private blackHoleSource: AudioSource | null = null;
    private musicEnabled = true;
    private effectsEnabled = true;

    protected override onLoad(): void {
        AudioManager.instance = this;
        this.musicSource = this.node.addComponent(AudioSource);
        this.effectSource = this.node.addComponent(AudioSource);
        this.blackHoleSource = this.node.addComponent(AudioSource);
        this.musicSource.loop = true;
        this.musicSource.volume = this.musicVolume;
        this.blackHoleSource.loop = true;
        this.blackHoleSource.volume = this.effectVolume;
        const settings = StorageManager.load().settings;
        this.musicEnabled = settings.musicEnabled;
        this.effectsEnabled = settings.effectsEnabled;
    }

    protected override start(): void {
        this.playBackgroundMusic();
    }

    protected override onDestroy(): void {
        if (AudioManager.instance === this) {
            AudioManager.instance = null;
        }
    }

    public playBackgroundMusic(): void {
        if (!this.musicEnabled || this.musicSource === null || this.backgroundMusic === null) {
            return;
        }
        this.musicSource.clip = this.backgroundMusic;
        if (!this.musicSource.playing) {
            this.musicSource.play();
        }
    }

    public playClear(): void { this.playEffect(this.clearSound); }
    public playClick(): void { this.playEffect(this.clickSound); }
    public playLost(): void { this.playEffect(this.gameLostSound); }
    public playWin(): void { this.playEffect(this.gameWinSound); }
    public playGameStart(): void { this.playEffect(this.gameStartSound); }
    public playItemReady(): void { this.playEffect(this.itemReadySound); }
    public playAmazing(): void { this.playEffect(this.amazingSound); }
    public playGreat(): void { this.playEffect(this.greatSound); }
    public playBomb(): void { this.playEffect(this.bombSound); }
    public playHammer(): void { this.playEffect(this.hammerSound); }
    public playRainbow(): void { this.playEffect(this.rainbowSound); }
    public playBlackHole(): void { this.startBlackHoleLoop(); }
    public playBlackHoleOneShot(): void { this.playEffect(this.blackHoleSound); }

    public startBlackHoleLoop(): void {
        if (!this.effectsEnabled || this.blackHoleSource === null || this.blackHoleSound === null) {
            return;
        }
        this.blackHoleSource.stop();
        this.blackHoleSource.clip = this.blackHoleSound;
        this.blackHoleSource.loop = true;
        this.blackHoleSource.volume = this.effectVolume;
        this.blackHoleSource.play();
    }

    public stopBlackHoleLoop(): void {
        this.blackHoleSource?.stop();
    }

    public setMusicEnabled(enabled: boolean): void {
        this.musicEnabled = enabled;
        if (enabled) {
            this.playBackgroundMusic();
        } else {
            this.musicSource?.stop();
        }
    }

    public setEffectsEnabled(enabled: boolean): void {
        this.effectsEnabled = enabled;
        if (!enabled) {
            this.effectSource?.stop();
            this.stopBlackHoleLoop();
        }
    }

    private playEffect(clip: AudioClip | null): void {
        if (this.effectsEnabled && this.effectSource !== null && clip !== null) {
            this.effectSource.playOneShot(clip, this.effectVolume);
        }
    }
}
