// Same localStorage + Android cocosJava bridge pattern used by RummyA.
import { BETS, LANES, fresh, Save } from './ChickenRound';
type Bridge = { getGameSave(): string; setGameSave(json: string): void };
const KEY = 'chicken.local.v1';
const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n * 100)) && n === Math.round(n * 100) / 100;
export function parseSave(raw: string | null): Save | null {
    try {
        let v = JSON.parse(raw || 'null'); if (typeof v === 'string') v = JSON.parse(v);
        if (v?.game !== 'chicken' || v.version !== 1 || !money(v.balance)) return null;
        const s: Save = { ...fresh(), balance: v.balance, bet: BETS.includes(v.bet) ? v.bet : 10, mode: [0, 1, 2].includes(v.mode) ? v.mode : 0, muted: !!v.muted, turbo: !!v.turbo };
        const r = v.round;
        if (r && BETS.includes(r.bet) && [0, 1, 2].includes(r.mode) && Number.isInteger(r.stage) && r.stage >= 0 && r.stage <= LANES[r.mode] && money(r.bonus) && r.bonus <= r.bet * 30000 && (r.pending === null || (Number.isInteger(r.pending) && r.pending >= 0 && r.pending < 10))) s.round = { bet: r.bet, mode: r.mode, stage: r.stage, bonus: r.bonus, pending: r.pending };
        s.history = Array.isArray(v.history) ? v.history.filter((h: any) => h && money(h.time) && BETS.includes(h.bet) && [0, 1, 2].includes(h.mode) && money(h.stage) && h.stage <= LANES[h.mode] && money(h.payout) && typeof h.won === 'boolean').slice(0, 30) : [];
        return s;
    } catch { return null; }
}
export function loadSave(storage: Storage, bridge?: Bridge): Save {
    let save: Save | null = null;
    try { save = parseSave(bridge?.getGameSave() || null); } catch (e) { console.warn('Native save read failed', e); }
    if (!save) try { save = parseSave(storage.getItem(KEY)); } catch (e) { console.warn('Local save read failed', e); }
    return save || fresh();
}
export function storeSave(save: Save, storage: Storage, bridge?: Bridge): void {
    const json = JSON.stringify(save);
    try { storage.setItem(KEY, json); } catch (e) { console.warn('Local save write failed', e); }
    try { bridge?.setGameSave(json); } catch (e) { console.warn('Native save write failed', e); }
}
export function nativeSaveBridge(): Bridge | undefined { return (window as Window & { cocosJava?: Bridge }).cocosJava; }
