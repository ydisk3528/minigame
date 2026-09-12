export type Card = number;
export const HANDS = ['HIGH CARD', 'PAIR', 'COLOR', 'SEQUENCE', 'PURE SEQUENCE', 'TRAIL'];
export function rank(cards: Card[]): number[] {
    if (cards.length !== 3 || new Set(cards).size !== 3 || cards.some(c => !Number.isInteger(c) || c < 0 || c > 51)) throw Error('Invalid hand');
    const r = cards.map(c => c % 13 + 2).sort((a, b) => b - a);
    const flush = cards.every(c => Math.floor(c / 13) === Math.floor(cards[0] / 13));
    // Local rules: AKQ highest, A23 second, then KQJ through 432.
    const straight = r.join() === '14,3,2' ? 13.5 : r[0] - r[1] === 1 && r[1] - r[2] === 1 ? r[0] : 0;
    if (r[0] === r[2]) return [5, r[0]];
    if (flush && straight) return [4, straight];
    if (straight) return [3, straight];
    if (flush) return [2, ...r];
    if (r[0] === r[1]) return [1, r[0], r[2]];
    if (r[1] === r[2]) return [1, r[1], r[0]];
    return [0, ...r];
}
export function compare(a: Card[], b: Card[]): number {
    const x = rank(a), y = rank(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return Math.sign((x[i] || 0) - (y[i] || 0));
    return 0;
}
export function shuffle<T>(a: T[], random = Math.random): T[] {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
}
export interface Player { cards: Card[]; money: number; paid: number; seen: boolean; folded: boolean; blinds: number; last: string; }
export type Action = 'pack' | 'call' | 'raise' | 'show';
export class Round {
    players: Player[]; turn: number; pot = 0; stake: number; ended = false; winners: number[] = []; award = 0;
    pending: { from: number; to: number } | null = null;
    constructor(public boot: number, balances: number[], public dealer: number, random = Math.random) {
        if (!Number.isSafeInteger(boot) || boot <= 0 || balances.length !== 5 || balances.some(n => !Number.isSafeInteger(n) || n < boot * 512)) throw Error('Invalid room balance');
        const deck = shuffle(Array.from({ length: 52 }, (_, i) => i), random);
        this.players = balances.map((money, i) => ({ money: money - boot, paid: boot, cards: deck.slice(i * 3, i * 3 + 3), seen: false, folded: false, blinds: 0, last: 'BLIND' }));
        this.pot = boot * 5; this.stake = boot; this.turn = (dealer + 1) % 5;
    }
    get alive() { return this.players.map((p, i) => p.folded ? -1 : i).filter(i => i >= 0); }
    cost(i = this.turn, raise = false) { return Math.min(this.stake * (raise ? 2 : 1), this.boot * 128) * (this.players[i].seen ? 2 : 1); }
    see(i: number) { if (this.ended || this.players[i].folded || this.pending) return; this.players[i].seen = true; this.players[i].last = 'SEEN'; }
    showTarget(i = this.turn) {
        if (this.alive.length === 2) return this.alive.find(j => j !== i)!;
        if (!this.players[i].seen) return -1;
        for (let n = 1; n < 5; n++) { const j = (i - n + 5) % 5; if (!this.players[j].folded) return this.players[j].seen ? j : -1; }
        return -1;
    }
    can(action: Action, i = this.turn) {
        if (this.ended || this.pending || i !== this.turn || this.players[i].folded) return false;
        if (action === 'pack') return true;
        if (action === 'show') {
            const target = this.showTarget(i);
            if (target < 0 || (this.alive.length === 2 && this.players[i].seen && !this.players[target].seen)) return false;
        }
        if (action === 'raise' && this.stake >= this.boot * 128) return false;
        return this.players[i].money >= this.cost(i, action === 'raise');
    }
    act(action: Action) {
        if (!this.can(action)) throw Error('Action unavailable');
        const i = this.turn, p = this.players[i];
        if (action === 'pack') { p.folded = true; p.last = 'PACKED'; }
        else {
            if (action === 'raise') this.stake = Math.min(this.stake * 2, this.boot * 128);
            const amount = this.cost(i); p.money -= amount; p.paid += amount; this.pot += amount;
            p.last = action === 'raise' ? 'RAISE' : p.seen ? 'CHAAL' : 'BLIND';
            if (!p.seen && ++p.blinds >= 4) this.see(i);
            if (action === 'show') {
                const target = this.showTarget(i);
                if (this.alive.length === 2) { this.duel(i, target); return; }
                this.pending = { from: i, to: target }; p.last = 'SIDE SHOW'; return;
            }
        }
        this.advance();
    }
    respond(accept: boolean) {
        if (!this.pending) throw Error('No side show');
        const { from, to } = this.pending; this.pending = null;
        if (accept) this.duel(from, to); else { this.players[from].last = 'DECLINED'; this.advance(); }
    }
    duel(from: number, to: number) {
        const loser = compare(this.players[from].cards, this.players[to].cards) > 0 ? to : from;
        this.players[loser].folded = true; this.players[loser].last = 'LOST SHOW'; this.advance();
    }
    advance() {
        if (this.alive.length === 1 || this.pot >= this.boot * 1024) { this.finish(); return; }
        do this.turn = (this.turn + 1) % 5; while (this.players[this.turn].folded);
    }
    finish() {
        if (this.ended) return;
        let best = this.alive[0];
        for (const i of this.alive) if (compare(this.players[i].cards, this.players[best].cards) > 0) best = i;
        this.winners = this.alive.filter(i => compare(this.players[i].cards, this.players[best].cards) === 0);
        this.award = this.pot;
        const each = Math.floor(this.pot / this.winners.length); let remainder = this.pot % this.winners.length;
        for (const i of this.winners) this.players[i].money += each + (remainder-- > 0 ? 1 : 0);
        this.pot = 0; this.ended = true;
    }
}
