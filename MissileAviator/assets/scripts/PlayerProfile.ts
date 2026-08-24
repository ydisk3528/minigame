import { sys } from 'cc';
import type { PlayerBulletKind } from './CombatSystem';

type ProfileData = { coins: number; unlockedWeapons: PlayerBulletKind[]; equippedWeapon: PlayerBulletKind };
const KEY = 'missile-aviator-profile';
const DEFAULT: ProfileData = { coins: 0, unlockedWeapons: ['normal'], equippedWeapon: 'normal' };

export class PlayerProfile {
  static load(): ProfileData {
    try { return { ...DEFAULT, ...JSON.parse(sys.localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULT }; }
  }

  static addCoins(amount: number): void { const data = this.load(); data.coins += Math.max(0, amount); this.save(data); }

  static buyOrEquip(weapon: PlayerBulletKind, cost: number): boolean {
    const data = this.load();
    if (data.unlockedWeapons.indexOf(weapon) < 0) {
      if (data.coins < cost) return false;
      data.coins -= cost; data.unlockedWeapons.push(weapon);
    }
    data.equippedWeapon = weapon; this.save(data); return true;
  }

  private static save(data: ProfileData): void { sys.localStorage.setItem(KEY, JSON.stringify(data)); }
}
