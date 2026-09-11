import { _decorator, Component, Sprite, SpriteFrame, Node, tween, Vec3, Tween, Animation, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CardView')
export class CardView extends Component {
    @property(Node) face: Node = null!;
    @property(Sprite) rank: Sprite = null!;
    @property(Sprite) suit: Sprite = null!;
    @property(Sprite) picture: Sprite = null!;
    @property(Node) jokerMark: Node = null!;
    @property([SpriteFrame]) redRanks: SpriteFrame[] = [];
    @property([SpriteFrame]) blackRanks: SpriteFrame[] = [];
    @property([SpriteFrame]) suits: SpriteFrame[] = [];
    @property([SpriteFrame]) jokers: SpriteFrame[] = [];
    private rest = new Vec3();

    onLoad() { this.rest.set(this.face.position); }

    show(card: { suit: number; rank: number }, wildRank: number) {
        this.face.getComponent(Sprite)!.color=card.rank===wildRank?new Color(255,250,170):Color.WHITE;
        const red = card.suit === 1 || card.suit === 2;
        this.rank.spriteFrame = card.rank ? (red ? this.redRanks : this.blackRanks)[card.rank - 1] : this.jokers[0];
        this.suit.spriteFrame = card.rank ? this.suits[card.suit] : null;
        // Same suit/court-card index mapping as original CardManager.getPokerSpritePic.
        this.picture.spriteFrame = card.rank > 10 ? this.suits[red ? card.rank - 2 : card.rank - 5] : card.rank === 0 ? this.suits[4] : null;
        this.jokerMark.active = card.rank === wildRank || card.rank === 0;
    }

    select(selected: boolean) {
        this.node.getComponent(Animation)?.stop();
        Tween.stopAllByTarget(this.face);
        tween(this.face).to(.1, { position: new Vec3(this.rest.x, this.rest.y + (selected ? 22 : 0), this.rest.z) }).start();
    }
    showHint(){this.face.getComponent(Sprite)!.color=new Color(255,245,125);}
    animateSort(){const a=this.node.getComponent(Animation);const c=a?.clips.find(c=>c?.name.replace(/_[0-9a-f]{8}$/,'')==='Clip_CardSort');if(c){Tween.stopAllByTarget(this.face);a!.play(c.name);}}
}
