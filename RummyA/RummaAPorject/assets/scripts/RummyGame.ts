import { _decorator, Component, Node, Prefab, instantiate, Label, Button } from 'cc';
import { CardView } from './CardView';
import { deck, shuffle, analyze, points } from './Rules';
const { ccclass, property } = _decorator;
type Card = { id: number; suit: number; rank: number };

@ccclass('RummyGame')
export class RummyGame extends Component {
    @property(Prefab) cardPrefab: Prefab = null!;
    @property([Node]) slots: Node[] = [];
    @property(Node) discardRoot: Node = null!;
    @property(Node) wildRoot: Node = null!;
    @property(Node) drawButton: Node = null!;
    @property(Node) openButton: Node = null!;
    @property(Node) actionButton: Node = null!;
    @property(Node) sortButton: Node = null!;
    @property(Node) dropButton: Node = null!;
    @property(Label) statusLabel: Label = null!;
    @property(Label) actionLabel: Label = null!;
    private cards: CardView[] = [];
    private discardView: CardView = null!;
    private wildView: CardView = null!;
    private stock: Card[] = [];
    private pile: Card[] = [];
    private hands: Card[][] = [];
    private selected = -1;
    private joker = 1;
    private turn = 0;
    private drawn = false;
    private ended = false;
    private blocked = -1;

    start() {
        // All parents and artwork are serialized editor references. Only repeating cards are instantiated.
        this.cards = this.slots.map((slot, i) => {
            const card = this.makeCard(slot);
            card.node.on(Node.EventType.TOUCH_END, () => this.select(i));
            return card;
        });
        this.discardView = this.makeCard(this.discardRoot);
        this.wildView = this.makeCard(this.wildRoot);
        this.drawButton.on(Node.EventType.TOUCH_END, () => this.draw(false));
        this.openButton.on(Node.EventType.TOUCH_END, () => this.draw(true));
        this.actionButton.on(Button.EventType.CLICK, this.action, this);
        this.sortButton.on(Button.EventType.CLICK, this.sort, this);
        this.dropButton.on(Button.EventType.CLICK, this.drop, this);
        this.newRound();
    }

    private makeCard(parent: Node) {
        const n = instantiate(this.cardPrefab); parent.addChild(n);
        return n.getComponent(CardView)!;
    }

    private newRound() {
        this.unscheduleAllCallbacks();
        this.stock = shuffle(deck());
        this.hands = Array.from({ length: 5 }, () => this.stock.splice(0, 13));
        const indicator = this.stock.pop()!;
        this.joker = indicator.rank || 1;
        this.wildView.show(indicator, this.joker);
        this.pile = [this.stock.pop()!];
        this.ended = false; this.turn = 0; this.drawn = false; this.selected = -1; this.blocked = -1;
        this.sort();
        this.statusLabel.string = 'Your turn · draw from either pile';
    }

    private render() {
        this.cards.forEach((v, i) => {
            v.node.active = i < this.hands[0].length;
            if (v.node.active) { v.show(this.hands[0][i], this.joker); v.select(i === this.selected); }
        });
        this.discardView.node.active = this.pile.length > 0;
        if (this.pile.length) this.discardView.show(this.pile[this.pile.length - 1], this.joker);
        this.actionLabel.string = this.ended ? 'Again' : !this.drawn && analyze(this.hands[0], this.joker).valid ? 'Declare' : 'Discard';
    }

    private select(index: number) {
        if (this.turn || this.ended || index >= this.hands[0].length) return;
        this.selected = this.selected === index ? -1 : index; this.render();
    }

    private draw(open: boolean) {
        if (this.turn || this.drawn || this.ended) return;
        const c = open ? this.pile.pop() : this.takeStock();
        if (!c) return;
        this.hands[0].push(c); this.blocked = open ? c.id : -1;
        this.drawn = true; this.selected = this.hands[0].length - 1;
        this.statusLabel.string = 'Select one card, then Discard'; this.render();
    }

    private takeStock(): Card | undefined {
        if (!this.stock.length && this.pile.length > 1) this.stock = shuffle(this.pile.splice(0, this.pile.length - 1));
        if (!this.stock.length) { this.ended = true; this.statusLabel.string = 'No cards left · press Again'; this.render(); }
        return this.stock.pop();
    }

    private action() {
        if (this.ended) { this.newRound(); return; }
        if (this.turn) return;
        if (!this.drawn) {
            if (analyze(this.hands[0], this.joker).valid) { this.ended = true; this.statusLabel.string = 'Valid declaration · You win'; this.render(); }
            else this.statusLabel.string = 'Draw first. Declaration needs 2 sequences, including a pure sequence.';
            return;
        }
        const hand = this.hands[0], card = hand[this.selected];
        if (!card) { this.statusLabel.string = 'Select a card to discard'; return; }
        if (card.id === this.blocked) { this.statusLabel.string = 'You cannot immediately return the card taken from the open pile'; return; }
        this.pile.push(hand.splice(this.selected, 1)[0]); this.selected = -1; this.drawn = false;
        if (analyze(hand, this.joker).valid) { this.statusLabel.string = 'Your hand is complete · Declare'; this.render(); return; }
        this.turn = 1; this.statusLabel.string = 'Player 1 is drawing'; this.render();
        this.scheduleOnce(this.botTurn, .8);
    }

    private botTurn = () => {
        if (this.ended) return;
        const hand = this.hands[this.turn], drawn = this.takeStock();
        if (!drawn) return;
        hand.push(drawn);
        // A simple local opponent; it sees only its hand and preserves completed melds.
        const grouped = new Set(analyze(hand, this.joker).groups.flatMap(g => g.cards.map(c => c.id)));
        let choices = hand.filter(c => !grouped.has(c.id));
        if (!choices.length) choices = hand;
        choices.sort((a,b) => points(b,this.joker) - points(a,this.joker));
        this.pile.push(hand.splice(hand.findIndex(c => c.id === choices[0].id), 1)[0]);
        if (analyze(hand, this.joker).valid) { this.ended = true; this.statusLabel.string = `Player ${this.turn} declared · press Again`; this.render(); return; }
        this.turn = (this.turn + 1) % 5; this.render();
        this.statusLabel.string = this.turn ? `Player ${this.turn} is drawing` : 'Your turn · draw from either pile';
        if (this.turn) this.scheduleOnce(this.botTurn, .8);
    };

    private sort() {
        if (this.turn || this.ended) return;
        const result = analyze(this.hands[0], this.joker);
        this.hands[0] = [...result.groups.flatMap(g => g.cards), ...result.loose.sort((a,b) => a.suit-b.suit || a.rank-b.rank)];
        this.selected = -1; this.render();
    }

    private drop() {
        if (this.turn || this.ended) return;
        this.ended = true; this.statusLabel.string = 'Dropped · press Again to deal a new hand'; this.render();
    }
}
