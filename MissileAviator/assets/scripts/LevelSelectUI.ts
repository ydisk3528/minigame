import { Button, Color, director, instantiate, Label, Layers, Node, Prefab, resources, sys } from 'cc';
import { LevelConfig } from './GameTypes';
import { LevelManager } from './LevelManager';
import { NativeAds } from './NativeAds';
import type { PlayerBulletKind } from './CombatSystem';
import { PlayerProfile } from './PlayerProfile';

type ShopItem = { weapon: PlayerBulletKind; name: string; cost: number; card: string };

export class LevelSelectUI {
  private screen!: Node;
  private cardPrefab!: Prefab;
  private shopPrefab!: Prefab;
  private levels: readonly LevelConfig[] = [];
  private page = 0;
  private shop: Node | null = null;
  private shopItems: ShopItem[] = [];

  constructor(private readonly root: Node) {}

  async init(): Promise<void> {
    const manager = new LevelManager();
    await manager.load(); this.levels = manager.all();
    const [screenPrefab, cardPrefab, shopPrefab] = await Promise.all([
      this.prefab('prefabs/LevelSelectUI'), this.prefab('prefabs/LevelCard'), this.prefab('prefabs/ShopPanel'),
    ]);
    this.cardPrefab = cardPrefab; this.shopPrefab = shopPrefab;
    this.shopItems = [{ weapon: 'laser', name: 'LASER', cost: 30, card: 'LaserCard' }, { weapon: 'plasma', name: 'PLASMA', cost: 60, card: 'PlasmaCard' }, { weapon: 'rocket', name: 'ROCKET', cost: 90, card: 'RocketCard' }];
    this.screen = instantiate(screenPrefab); this.setLayer(this.screen); this.screen.setParent(this.root);
    this.bindButton(this.child(this.screen, 'BackButton'), () => { sys.localStorage.removeItem('autoStart'); director.loadScene('Main'); });
    this.bindButton(this.child(this.screen, 'ShopButton'), () => this.openShop());
    this.bindButton(this.child(this.screen, 'PrevButton'), () => { if (this.page > 0) { this.page--; this.renderPage(); } });
    this.bindButton(this.child(this.screen, 'NextButton'), () => { if ((this.page + 1) * 6 < this.levels.length) { this.page++; this.renderPage(); } });
    this.renderPage(); NativeAds.showBanner();
  }

  destroy(): void { this.screen?.destroy(); this.shop = null; }

  private renderPage(): void {
    const container = this.child(this.screen, 'LevelContainer'); container.removeAllChildren();
    const start = this.page * 6; const pageLevels = this.levels.slice(start, start + 6);
    pageLevels.forEach((level, index) => {
      const card = instantiate(this.cardPrefab); this.setLayer(card); card.setParent(container);
      card.setPosition((index % 3 - 1) * 360, index < 3 ? 105 : -95);
      this.text(this.child(card, 'LevelNumber'), `MISSION ${level.id < 10 ? '0' : ''}${level.id}`, 20, new Color('#ffc75b'));
      this.text(this.child(card, 'LevelName'), level.name, 24, Color.WHITE);
      this.text(this.child(card, 'LevelInfo'), `${level.waves.length} WAVES  ·  ${level.targetScore} TARGET`, 14, new Color('#a9c7dc'));
      const button = this.component(card, Button);
      card.on(Button.EventType.CLICK, () => { sys.localStorage.setItem('selectedLevelId', String(level.id)); sys.localStorage.setItem('autoStart', '1'); director.loadScene('Main'); });
    });
    const pages = Math.max(1, Math.ceil(this.levels.length / 6));
    this.text(this.child(this.screen, 'PageLabel'), `${this.page + 1} / ${pages}`, 18, Color.WHITE);
    this.child(this.screen, 'PrevButton').active = this.page > 0;
    this.child(this.screen, 'NextButton').active = this.page + 1 < pages;
  }

  private openShop(): void {
    if (this.shop) return;
    this.shop = instantiate(this.shopPrefab); this.setLayer(this.shop); this.shop.setParent(this.screen); this.shop.setSiblingIndex(999);
    this.bindButton(this.child(this.shop, 'CloseButton'), () => { this.shop?.destroy(); this.shop = null; });
    this.renderShop();
  }

  private renderShop(): void {
    if (!this.shop) return;
    const profile = PlayerProfile.load(); this.text(this.child(this.shop, 'Coins'), `CREDITS  ${profile.coins}`, 22, new Color('#ffd55e'));
    const container = this.child(this.shop, 'Items');
    this.shopItems.forEach((item) => {
      const card = this.child(container, item.card);
      this.text(this.child(card, 'Name'), item.name, 22, new Color('#8fe8ff'));
      const unlocked = profile.unlockedWeapons.indexOf(item.weapon) >= 0; const equipped = profile.equippedWeapon === item.weapon;
      this.text(this.child(card, 'Status'), equipped ? 'EQUIPPED' : unlocked ? 'SELECT' : `${item.cost} CREDITS`, 16, equipped ? new Color('#86f0ae') : Color.WHITE);
      this.component(card, Button); card.off(Button.EventType.CLICK);
      card.on(Button.EventType.CLICK, () => { if (PlayerProfile.buyOrEquip(item.weapon, item.cost)) this.renderShop(); else this.text(this.child(this.shop!, 'Coins'), 'NOT ENOUGH CREDITS', 20, new Color('#ff8b78')); });
    });
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
