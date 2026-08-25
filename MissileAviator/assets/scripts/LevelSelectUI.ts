import { Button, Color, director, instantiate, Label, Layers, Node, Prefab, resources, Sprite, sys } from 'cc';
import { LevelConfig } from './GameTypes';
import { LevelManager } from './LevelManager';
import { NativeAds } from './NativeAds';
import { PlayerProfile } from './PlayerProfile';
import { ShopUI } from './ShopUI';

export class LevelSelectUI {
  private screen!: Node;
  private cardPrefab!: Prefab;
  private levels: readonly LevelConfig[] = [];
  private page = 0;

  constructor(private readonly root: Node) {}

  async init(): Promise<void> {
    const manager = new LevelManager();
    await manager.load(); this.levels = manager.all();
    const [screenPrefab, cardPrefab] = await Promise.all([
      this.prefab('prefabs/LevelSelectUI'), this.prefab('prefabs/LevelCard'),
    ]);
    this.cardPrefab = cardPrefab;
    this.screen = instantiate(screenPrefab); this.setLayer(this.screen); this.screen.setParent(this.root);
    this.bindButton(this.child(this.screen, 'BackButton'), () => { sys.localStorage.removeItem('autoStart'); director.loadScene('Start'); });
    this.bindButton(this.child(this.screen, 'ShopButton'), () => void ShopUI.open(this.screen));
    this.bindButton(this.child(this.screen, 'PrevButton'), () => { if (this.page > 0) { this.page--; this.renderPage(); } });
    this.bindButton(this.child(this.screen, 'NextButton'), () => { if ((this.page + 1) * 6 < this.levels.length) { this.page++; this.renderPage(); } });
    this.renderPage(); NativeAds.showBanner();
  }

  destroy(): void { this.screen?.destroy(); }

  private renderPage(): void {
    const container = this.child(this.screen, 'LevelContainer'); container.removeAllChildren();
    const start = this.page * 6; const pageLevels = this.levels.slice(start, start + 6);
    const highestUnlocked = PlayerProfile.load().highestUnlockedLevel;
    pageLevels.forEach((level, index) => {
      const card = instantiate(this.cardPrefab); this.setLayer(card); card.setParent(container);
      card.setPosition((index % 3 - 1) * 360, index < 3 ? 105 : -95);
      const unlocked = level.id <= highestUnlocked;
      this.text(this.child(card, 'LevelNumber'), `MISSION ${level.id < 10 ? '0' : ''}${level.id}`, 20, new Color('#ffc75b'));
      this.text(this.child(card, 'LevelName'), `Level ${level.id}`, 24, unlocked ? Color.WHITE : new Color('#858b91'));
      this.text(this.child(card, 'LevelInfo'), unlocked ? `${level.waves.length} WAVES  ·  ${level.targetScore} TARGET` : 'LOCKED · COMPLETE PREVIOUS LEVEL', 14, unlocked ? new Color('#a9c7dc') : new Color('#70757a'));
      const button = this.component(card, Button);
      button.interactable = unlocked; for (const sprite of card.getComponentsInChildren(Sprite)) sprite.grayscale = !unlocked;
      if (unlocked) card.on(Button.EventType.CLICK, () => { sys.localStorage.setItem('selectedLevelId', String(level.id)); sys.localStorage.setItem('autoStart', '1'); director.loadScene('Main'); });
    });
    const pages = Math.max(1, Math.ceil(this.levels.length / 6));
    this.text(this.child(this.screen, 'PageLabel'), `${this.page + 1} / ${pages}`, 18, Color.WHITE);
    this.child(this.screen, 'PrevButton').active = this.page > 0;
    this.child(this.screen, 'NextButton').active = this.page + 1 < pages;
  }

  private bindButton(node: Node, callback: () => void): void {
    this.component(node, Button);
    node.on(Button.EventType.CLICK, callback);
  }

  private text(node: Node, value: string, size: number, color: Color): Label {
    const label = this.component(node, Label); label.string = value; label.fontSize = size; label.lineHeight = size + 6; label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; return label;
  }

  private child(parent: Node, name: string): Node { const node = parent.getChildByName(name); if (!node) throw new Error(`${parent.name}/${name} missing in prefab`); return node; }
  private component<T>(node: Node, type: new (...args: any[]) => T): T { const value = node.getComponent(type as any) as T | null; if (!value) throw new Error(`${node.name} missing ${type.name} in prefab`); return value; }
  private setLayer(node: Node): void { node.layer = Layers.Enum.UI_2D; for (const child of node.children) this.setLayer(child); }
  private prefab(path: string): Promise<Prefab> { return new Promise((resolve, reject) => resources.load(path, Prefab, (error, asset) => error ? reject(error) : resolve(asset))); }
}
