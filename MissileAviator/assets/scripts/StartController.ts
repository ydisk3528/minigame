import { _decorator, AudioSource, Button, Color, Component, director, instantiate, Label, Layers, Node, Prefab, resources, sys } from 'cc';
import { PlayerProfile } from './PlayerProfile';
import { ShopUI } from './ShopUI';
const { ccclass } = _decorator;

@ccclass('StartController')
export class StartController extends Component {
  private settings: Node | null = null;
  private shopOpen = false;
  private audio!: AudioSource;

  start(): void {
    this.button('StartButton', () => this.play());
    this.button('LevelsButton', () => director.loadScene('Levels'));
    this.button('ShopButton', () => void this.openShop());
    this.button('SettingsButton', () => void this.openSettings());
    const audio = this.getComponent(AudioSource); if (!audio) throw new Error('StartMenu.prefab missing AudioSource'); this.audio = audio;
    if (PlayerProfile.load().musicEnabled) this.audio.play();
  }

  private play(): void {
    const profile = PlayerProfile.load(); const selected = Number(sys.localStorage.getItem('selectedLevelId')) || 1;
    sys.localStorage.setItem('selectedLevelId', String(Math.min(selected, profile.highestUnlockedLevel))); sys.localStorage.setItem('autoStart', '1'); director.loadScene('Main');
  }

  private async openShop(): Promise<void> {
    if (this.shopOpen) return; this.shopOpen = true;
    try { await ShopUI.open(this.node.parent ?? this.node, () => { this.shopOpen = false; }); } catch (error) { this.shopOpen = false; throw error; }
  }

  private async openSettings(): Promise<void> {
    if (this.settings) return;
    const prefab = await this.loadPrefab('prefabs/SettingsPanel'); this.settings = instantiate(prefab); this.setLayer(this.settings); this.settings.setParent(this.node.parent ?? this.node); this.settings.setPosition(0, 0); this.settings.setSiblingIndex(999);
    this.bind(this.child(this.settings, 'MusicToggle'), () => { const value = !PlayerProfile.load().musicEnabled; PlayerProfile.setMusicEnabled(value); if (value) this.audio.play(); else this.audio.stop(); this.refreshSettings(); });
    this.bind(this.child(this.settings, 'SfxToggle'), () => { PlayerProfile.setSfxEnabled(!PlayerProfile.load().sfxEnabled); this.refreshSettings(); });
    this.bind(this.child(this.settings, 'CloseButton'), () => { this.settings?.destroy(); this.settings = null; }); this.refreshSettings();
  }

  private refreshSettings(): void {
    if (!this.settings) return; const profile = PlayerProfile.load();
    const music = this.label(this.child(this.child(this.settings, 'MusicToggle'), 'Text')); music.string = profile.musicEnabled ? 'ON' : 'OFF'; music.color = profile.musicEnabled ? new Color(134, 240, 174, 255) : new Color(255, 132, 120, 255);
    const sfx = this.label(this.child(this.child(this.settings, 'SfxToggle'), 'Text')); sfx.string = profile.sfxEnabled ? 'ON' : 'OFF'; sfx.color = profile.sfxEnabled ? new Color(134, 240, 174, 255) : new Color(255, 132, 120, 255);
  }

  private button(name: string, callback: () => void): void { this.bind(this.child(this.node, name), callback); }
  private bind(node: Node, callback: () => void): void { if (!node.getComponent(Button)) throw new Error(`${node.name} missing Button in prefab`); node.off(Button.EventType.CLICK); node.on(Button.EventType.CLICK, callback); }
  private label(node: Node): Label { const label = node.getComponent(Label); if (!label) throw new Error(`${node.name} missing Label in prefab`); return label; }
  private child(parent: Node, name: string): Node { const node = parent.getChildByName(name); if (!node) throw new Error(`${parent.name}/${name} missing in prefab`); return node; }
  private setLayer(node: Node): void { node.layer = Layers.Enum.UI_2D; for (const child of node.children) this.setLayer(child); }
  private loadPrefab(path: string): Promise<Prefab> { return new Promise((resolve, reject) => resources.load(path, Prefab, (error, asset) => error ? reject(error) : resolve(asset))); }
}
