import { sys } from 'cc';
import type { PlayerBulletKind } from './CombatSystem';

export type ProfileData = {
  coins: number;
  unlockedWeapons: PlayerBulletKind[];
  equippedWeapon: PlayerBulletKind;
  highestUnlockedLevel: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
};
const KEY = 'missile-aviator-profile';
const DEFAULT: ProfileData = { coins: 0, unlockedWeapons: ['normal'], equippedWeapon: 'normal', highestUnlockedLevel: 1, musicEnabled: true, sfxEnabled: true };

export class PlayerProfile {
  static load(): ProfileData {
    try { return { ...DEFAULT, ...JSON.parse(sys.localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULT }; }
  }

  static addCoins(amount: number): void { const data = this.load(); data.coins += Math.max(0, amount); this.save(data); }

  static completeLevel(levelId: number): void { const data = this.load(); data.highestUnlockedLevel = Math.max(data.highestUnlockedLevel, levelId + 1); this.save(data); }
  static setMusicEnabled(enabled: boolean): void { const data = this.load(); data.musicEnabled = enabled; this.save(data); }
  static setSfxEnabled(enabled: boolean): void { const data = this.load(); data.sfxEnabled = enabled; this.save(data); }

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
