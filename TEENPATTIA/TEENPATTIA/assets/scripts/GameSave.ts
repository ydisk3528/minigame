// Adapted from RummyA/RummaAPorject/assets/scripts/GameSave.ts.
export type GameSave = { game: 'teenpatti'; version: 1; balance: number; muted: boolean; name: string; avatar: number; rounds: number; wins: number; history: string[] };
type Bridge = { getGameSave(): string; setGameSave(json: string): void };
const key = 'teenpatti.local.v1';
function freshSave(): GameSave {
    return { game: 'teenpatti', version: 1, balance: 10000, muted: false, name: 'Player', avatar: 0, rounds: 0, wins: 0, history: [] };
}
function parse(raw: string | null): GameSave | null {
    try {
        let v = JSON.parse(raw || 'null');
        if (typeof v === 'string') v = JSON.parse(v);
        if (v?.game !== 'teenpatti' || v.version !== 1 || !Number.isSafeInteger(v.balance) || v.balance < 0) return null;
        return { ...freshSave(), balance: v.balance, muted: !!v.muted, name: typeof v.name === 'string' ? v.name.slice(0, 14) : 'Player', avatar: Number.isInteger(v.avatar) ? Math.abs(v.avatar) % 8 : 0, rounds: Number.isSafeInteger(v.rounds) ? Math.max(0, v.rounds) : 0, wins: Number.isSafeInteger(v.wins) ? Math.max(0, v.wins) : 0, history: Array.isArray(v.history) ? v.history.filter((s: unknown) => typeof s === 'string').slice(0, 12) : [] };
    } catch { return null; }
}
export function loadSave(storage: Storage, bridge?: Bridge): GameSave {
    let saved: GameSave | null = null;
    try { saved = parse(bridge?.getGameSave() || null); } catch (e) { console.warn('Native save read failed', e); }
    if (!saved) try { saved = parse(storage.getItem(key)); } catch (e) { console.warn('Browser save read failed', e); }
    return saved || freshSave();
}
export function storeSave(save: GameSave, storage: Storage, bridge?: Bridge) {
    const json = JSON.stringify(save);
    try { storage.setItem(key, json); } catch (e) { console.warn('Browser save failed', e); }
    try { bridge?.setGameSave(json); } catch (e) { console.warn('Native save write failed', e); }
}
export function nativeSaveBridge(): Bridge | undefined { return (window as Window & { cocosJava?: Bridge }).cocosJava; }
