// Local recreation rules. The public client does not contain the server RNG or paytable.
export const BETS = [10, 25, 50, 100, 250, 500];
export const MODES = ['EASY', 'MEDIUM', 'HARD'];
export const LANES = [28, 24, 20];
export const SURVIVAL = [.90, .80, .68];
export const PRIZES = [10000, 8, 50, 5, 30, 3, 1000, 1, 100, 10];
export const PRIZE_LEVELS = [PRIZES, [10000, 100, 5, 50, 3, 30, 1000, 1, 500, 8], [10000, 5, 100, 3000, 50, 3, 1000, 1, 500, 8]];
const credits = (n: number) => Math.round(n * 100) / 100;
export type Round = { bet: number; mode: number; stage: number; bonus: number; pending: number | null };
export type RecordEntry = { time: number; bet: number; mode: number; stage: number; payout: number; won: boolean };
export type Save = { game: 'chicken'; version: 1; balance: number; bet: number; mode: number; muted: boolean; turbo: boolean; round: Round | null; history: RecordEntry[] };
export function fresh(): Save { return { game: 'chicken', version: 1, balance: 10000, bet: 10, mode: 0, muted: false, turbo: false, round: null, history: [] }; }
export function multiplier(mode: number, stage: number): number { return stage ? Math.min(30000, Math.floor(.96 / Math.pow(SURVIVAL[mode], stage) * 100) / 100) : 1; }
export function payout(r: Round): number { return credits(r.bet * multiplier(r.mode, r.stage)); }
export function startRound(s: Save): boolean {
    if (s.round || s.balance < s.bet) return false;
    s.balance = credits(s.balance - s.bet);
    s.round = { bet: s.bet, mode: s.mode, stage: 0, bonus: 0, pending: null };
    return true;
}
export function settle(s: Save, won: boolean): RecordEntry | null {
    const r = s.round;
    if (!r || r.pending !== null || (won && !r.stage)) return null;
    const paid = won ? Math.min(payout(r), r.bet * 30000 - r.bonus) : 0;
    s.balance = credits(s.balance + paid);
    const record = { time: Date.now(), bet: r.bet, mode: r.mode, stage: r.stage, payout: credits(paid + r.bonus), won };
    s.history.unshift(record); s.history = s.history.slice(0, 30); s.round = null;
    return record;
}
export function jump(s: Save, rng = Math.random): 'safe' | 'lost' | 'bonus' | 'blocked' {
    const r = s.round;
    if (!r || r.pending !== null || r.stage >= LANES[r.mode]) return 'blocked';
    if (rng() >= SURVIVAL[r.mode]) { settle(s, false); return 'lost'; }
    r.stage++;
    if (r.stage % 7 === 0 && rng() < .18) {
        const weights = [1, 700, 100, 1400, 180, 2500, 4, 9000, 25, 500];
        let roll = rng() * weights.reduce((a, b) => a + b, 0), i = 0;
        while (i < weights.length - 1 && (roll -= weights[i]) >= 0) i++;
        r.pending = i; return 'bonus';
    }
    return 'safe';
}
export function collectBonus(s: Save): number {
    const r = s.round;
    if (!r || r.pending === null) return 0;
    const amount = Math.min(r.bet * PRIZE_LEVELS[r.mode][r.pending], r.bet * 30000 - r.bonus);
    r.pending = null; r.bonus = credits(r.bonus + amount); s.balance = credits(s.balance + amount);
    return amount;
}
