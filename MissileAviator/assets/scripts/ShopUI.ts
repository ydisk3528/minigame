import { Button, Color, instantiate, Label, Layers, Node, Prefab, resources } from 'cc';
import type { PlayerBulletKind } from './CombatSystem';
import { PlayerProfile } from './PlayerProfile';

const ITEMS: { weapon: PlayerBulletKind; name: string; cost: number; card: string }[] = [
  { weapon: 'laser', name: 'LASER', cost: 30, card: 'LaserCard' },
  { weapon: 'plasma', name: 'PLASMA', cost: 60, card: 'PlasmaCard' },
  { weapon: 'rocket', name: 'ROCKET', cost: 90, card: 'RocketCard' },
];

export class ShopUI {
  static async open(parent: Node, onClose: () => void = () => {}): Promise<ShopUI> {
    const prefab = await new Promise<Prefab>((resolve, reject) => resources.load('prefabs/ShopPanel', Prefab, (error, asset) => error ? reject(error) : resolve(asset)));
    return new ShopUI(parent, prefab, onClose);
  }

  private readonly root: Node;

  private constructor(parent: Node, prefab: Prefab, onClose: () => void) {
    this.root = instantiate(prefab); this.setLayer(this.root); this.root.setParent(parent); this.root.setPosition(0, 0); this.root.setSiblingIndex(999);
    this.button(this.child(this.root, 'CloseButton'), () => { this.root.destroy(); onClose(); }); this.render();
  }

  private render(): void {
    const profile = PlayerProfile.load(); const coins = this.label(this.child(this.root, 'Coins')); coins.string = `CREDITS  ${profile.coins}`; coins.color = new Color('#ffd55e');
    const items = this.child(this.root, 'Items');
    for (const item of ITEMS) {
      const card = this.child(items, item.card); const unlocked = profile.unlockedWeapons.indexOf(item.weapon) >= 0; const equipped = profile.equippedWeapon === item.weapon;
      this.label(this.child(card, 'Name')).string = item.name;
      const status = this.label(this.child(card, 'Status')); status.string = equipped ? 'EQUIPPED' : unlocked ? 'SELECT' : `${item.cost} CREDITS`; status.color = equipped ? new Color('#86f0ae') : Color.WHITE;
      this.button(card, () => { if (PlayerProfile.buyOrEquip(item.weapon, item.cost)) this.render(); else { const coins = this.label(this.child(this.root, 'Coins')); coins.string = 'NOT ENOUGH CREDITS'; coins.color = new Color('#ff8b78'); } });
    }
  }

  private button(node: Node, callback: () => void): void { if (!node.getComponent(Button)) throw new Error(`${node.name} missing Button in ShopPanel.prefab`); node.off(Button.EventType.CLICK); node.on(Button.EventType.CLICK, callback); }
  private label(node: Node): Label { const label = node.getComponent(Label); if (!label) throw new Error(`${node.name} missing Label in ShopPanel.prefab`); return label; }
  private child(parent: Node, name: string): Node { const node = parent.getChildByName(name); if (!node) throw new Error(`${parent.name}/${name} missing in ShopPanel.prefab`); return node; }
  private setLayer(node: Node): void { node.layer = Layers.Enum.UI_2D; for (const child of node.children) this.setLayer(child); }
}
