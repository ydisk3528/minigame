import { analyze, deck, shuffle, meld, points, chooseDiscard, wild } from './Rules';
export type Card = { id: number; suit: number; rank: number };
export type Seat = { hand: Card[]; groups: number[][]; dropped: boolean; draws: number; penalty: number };
export type Phase = 'draw' | 'discard' | 'ended';

/** Local table authority. The captured client does not contain the remote table server. */
export class Round {
    stock: Card[];
    pile: Card[];
    indicator: Card;
    seats: Seat[];
    turn = 0;
    phase: Phase = 'draw';
    pickedOpen = -1;
    winner = -1;
    deltas = [0, 0, 0, 0, 0];
    reason = '';
    // The original replay starts with canDrawJ=false; the live server may override it.
    canDrawJ = false;
    autoDiscardCount = 0;
    actionCard = -1;
    constructor(public perPoint = 1, random: () => number = Math.random) {
        this.stock = shuffle(deck(), random);
        this.seats = Array.from({length: 5}, () => ({hand: this.stock.splice(0, 13), groups: [], dropped: false, draws: 0, penalty: 0}));
        this.indicator = this.stock.pop()!;
        this.pile = [this.stock.pop()!];
        for (let i = 0; i < 5; i++) this.sort(i);
    }
    get wildRank() { return this.indicator.rank || 1; }
    get current() { return this.seats[this.turn]; }
    cards(group: number[], seat = 0) { return group.map(id => this.seats[seat].hand.find(c => c.id === id)!).filter(Boolean); }
    sort(seat = 0) {
        const s = this.seats[seat], before = JSON.stringify(s.groups), result = analyze(s.hand, this.wildRank);
        s.groups = result.groups.map(g => g.cards.map(c => c.id));
        const loose = result.loose.sort((a,b) => a.suit-b.suit || a.rank-b.rank).map(c => c.id);
        if (loose.length) s.groups.push(loose);
        this.order(seat);
        return before !== JSON.stringify(s.groups);
    }
    private order(seat: number) {
        const s = this.seats[seat]; s.groups = s.groups.map(g => g.filter(id => s.hand.some(c => c.id === id))).filter(g => g.length);
        const known = new Set(s.groups.flat());
        const rest = s.hand.filter(c => !known.has(c.id));
        if (rest.length) { if (s.groups.length < 7) s.groups.push(rest.map(c => c.id)); else s.groups[6].push(...rest.map(c => c.id)); }
        s.hand = s.groups.flatMap(g => this.cards(g, seat));
    }
    group(ids: number[]) {
        if (this.phase === 'ended' || this.turn !== 0 || ids.length < 2) return false;
        const selected = new Set(ids), s = this.seats[0];
        if (selected.size !== ids.length || ids.some(id => !s.hand.some(c => c.id === id))) return false;
        const groups = s.groups.map(g => g.filter(id => !selected.has(id))).filter(g => g.length);
        if (groups.length >= 7) return false;
        s.groups = [...groups, ids]; this.order(0); return true;
    }
    move(id: number, targetId: number) {
        if (this.turn || this.phase === 'ended' || id === targetId) return;
        const s = this.seats[0];
        if (!s.hand.some(c => c.id === id) || !s.hand.some(c => c.id === targetId)) return;
        s.groups = s.groups.map(g => g.filter(x => x !== id));
        const group = s.groups.find(g => g.includes(targetId))!;
        group.splice(group.indexOf(targetId), 0, id); this.order(0);
    }
    addToGroup(ids: number[], target: number) {
        const s=this.seats[0], group=s.groups[target], selected=new Set(ids);
        if(this.turn!==0 || this.phase==='ended' || !group || !ids.length || selected.size!==ids.length || ids.some(id=>!s.hand.some(c=>c.id===id)))return false;
        if(ids.every(id=>group.includes(id)))return false;
        s.groups=s.groups.map((g,i)=>i===target?[...g,...ids.filter(id=>!g.includes(id))]:g.filter(id=>!selected.has(id)));
        this.order(0);return true;
    }
    get canDrawOpen() { const top=this.pile[this.pile.length-1];return !!top && (this.canDrawJ || !wild(top,this.wildRank)); }
    draw(open: boolean, automatic = false) {
        if (this.phase !== 'draw' || (open && !this.canDrawOpen)) return false;
        if (!open && !this.stock.length && this.pile.length > 1) this.stock = shuffle(this.pile.splice(0, this.pile.length - 1));
        const card = open ? this.pile.pop() : this.stock.pop();
        if (!card) { if (!open) { this.phase = 'ended'; this.reason = 'Stock exhausted'; } return false; }
        this.current.hand.push(card); this.current.draws++; this.order(this.turn);
        this.actionCard=card.id;
        if(this.turn===0 && !automatic)this.autoDiscardCount=0;
        this.pickedOpen = open ? card.id : -1; this.phase = 'discard'; return true;
    }
    discard(id: number, automatic = false) {
        if (this.phase !== 'discard' || id === this.pickedOpen) return false;
        const index = this.current.hand.findIndex(c => c.id === id);
        if (index < 0) return false;
        if(this.turn===0 && !automatic)this.autoDiscardCount=0;
        this.pile.push(this.current.hand.splice(index, 1)[0]); this.order(this.turn); this.advance(); return true;
    }
    timeout() {
        if(this.turn!==0 || this.phase==='ended')return;
        if(this.phase==='draw'){this.draw(false,true);return;}
        if(this.autoDiscardCount>=1){this.drop();return;}
        // Original client returns actioncard on the first unattended discard.
        const card=this.current.hand.find(c=>c.id===this.actionCard && c.id!==this.pickedOpen)
            || this.current.hand.find(c=>c.id!==this.pickedOpen);
        if(card && this.discard(card.id,true))this.autoDiscardCount++;
    }
    canDeclare(id?: number) {
        if (this.phase === 'ended' || (id !== undefined && !this.current.hand.some(c => c.id === id))) return false;
        const hand = this.current.hand.filter(c => c.id !== id);
        return (id === undefined || id !== this.pickedOpen) && hand.length === 13 && analyze(hand, this.wildRank).valid;
    }
    declare(id?: number) {
        if (this.phase === 'ended') return false;
        if (!this.canDeclare(id)) { this.drop(80); this.reason = 'Invalid declaration'; return false; }
        if (id !== undefined) { const index = this.current.hand.findIndex(c => c.id === id); this.pile.push(this.current.hand.splice(index, 1)[0]); }
        this.sort(this.turn); this.finish(this.turn, 'Declared'); return true;
    }
    drop(penalty = this.current.draws ? 40 : 20) {
        if (this.phase === 'ended') return;
        this.current.dropped = true; this.current.penalty = penalty;
        if (this.current.hand.length === 14) { const card=this.current.hand.pop()!; this.pile.push(card); this.order(this.turn); }
        const active = this.seats.map((s,i) => s.dropped ? -1 : i).filter(i => i >= 0);
        if (active.length === 1) this.finish(active[0], 'Last player'); else this.advance();
    }
    private advance() {
        do this.turn = (this.turn + 1) % 5; while (this.current.dropped);
        this.phase = 'draw'; this.pickedOpen = -1;
    }
    private finish(winner: number, reason: string) {
        this.winner = winner; this.reason = reason; this.phase = 'ended';
        this.seats.forEach((seat,i) => { seat.penalty = i === winner ? 0 : seat.dropped ? seat.penalty : analyze(seat.hand, this.wildRank).score; this.deltas[i] = -seat.penalty * this.perPoint; });
        this.deltas[winner] = -this.deltas.reduce((a,b) => a+b,0);
    }
    bot() {
        if (this.phase === 'ended') return;
        if (this.phase === 'draw') {
            const open = this.pile[this.pile.length-1], before = analyze(this.current.hand,this.wildRank).rawScore;
            let take = false;
            if (open && this.canDrawOpen) { const candidate=chooseDiscard([...this.current.hand,open],this.wildRank,open.id); take=!!candidate && candidate.result.rawScore < before; }
            if (!this.draw(take)) return;
        }
        const choice=chooseDiscard(this.current.hand,this.wildRank,this.pickedOpen);
        if (!choice) return;
        const card=this.current.hand[choice.index];
        if (this.canDeclare(card.id)) this.declare(card.id); else this.discard(card.id);
    }
    groupState(group: number[], seat = 0) { return meld(this.cards(group,seat),this.wildRank); }
    groupPoints(group: number[], seat = 0) { return this.cards(group,seat).reduce((sum,c) => sum+points(c,this.wildRank),0); }
}
