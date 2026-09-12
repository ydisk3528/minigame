import { _decorator, Component, Node, Prefab, instantiate, Label, Button, Layout, UITransform, Animation, Sprite, SpriteFrame, EventTouch, Vec3, AudioSource, AudioClip, tween, Tween, sys } from 'cc';
import { CardView } from './CardView';
import { Round } from './Round';
import {analyze,chooseDiscard} from './Rules';
import { randomPlayers } from './PlayerIdentity';
import { DEBUG } from 'cc/env';
const {ccclass,property}=_decorator;
@ccclass('TableController')
export class TableController extends Component {
    @property(Node) firstPlayGuide:Node=null!;
    private guidePending=false;
    private guideStep=-1;
    private guidePulse=0;
    @property(Animation) shuffleAnimation: Animation=null!;
    @property([CardView]) shuffleCards: CardView[]=[];
    @property(Animation) startAnimation: Animation=null!;
    @property([Animation]) opponentAnimations: Animation[]=[];
    @property([Animation]) turnAnimations: Animation[]=[];
    @property(Prefab) cardPrefab: Prefab=null!;
    @property(AudioSource) effects: AudioSource=null!;
    @property(AudioClip) drawSound: AudioClip=null!;
    @property(AudioClip) cardSound: AudioClip=null!;
    @property(AudioClip) winSound: AudioClip=null!;
    @property(AudioClip) hurrySound: AudioClip=null!;
    @property([Node]) addGroupButtons: Node[]=[];
    @property([Node]) groupRoots: Node[]=[];
    @property([Node]) cardRoots: Node[]=[];
    @property([Label]) groupLabels: Label[]=[];
    @property([Sprite]) groupTags: Sprite[]=[];
    @property([SpriteFrame]) tagFrames: SpriteFrame[]=[];
    @property(Node) handRoot: Node=null!;
    @property(Node) discardRoot: Node=null!;
    @property(Node) wildRoot: Node=null!;
    @property(Node) drawButton: Node=null!;
    @property(Node) openButton: Node=null!;
    @property(Node) actionButton: Node=null!;
    @property(Node) groupButton: Node=null!;
    @property(Node) declareButton: Node=null!;
    @property(Node) sortButton: Node=null!;
    @property(Node) dropButton: Node=null!;
    @property(Node) backButton: Node=null!;
    @property(Label) statusLabel: Label=null!;
    @property(Label) pointLabel: Label=null!;
    @property(Label) turnLabel: Label=null!;
    @property([Label]) playerStates: Label[]=[];
    @property([Label]) playerNames: Label[]=[];
    @property([Sprite]) playerAvatars: Sprite[]=[];
    @property([Sprite]) resultAvatars: Sprite[]=[];
    @property([SpriteFrame]) avatarFrames: SpriteFrame[]=[];
    @property(Node) resultPanel: Node=null!;
    @property(Node) winTitle: Node=null!;
    @property(Node) loseTitle: Node=null!;
    @property([Label]) resultNames: Label[]=[];
    @property([Label]) resultStates: Label[]=[];
    @property([Label]) resultAmounts: Label[]=[];
    @property([Node]) resultCards: Node[]=[];
    @property(Node) continueButton: Node=null!;
    @property(Node) lobbyButton: Node=null!;
    @property(Node) confirmation: Node=null!;
    @property(Label) confirmationText: Label=null!;
    @property(Node) confirmButton: Node=null!;
    @property(Node) cancelButton: Node=null!;
    @property({tooltip:'Original CardMain.HANDSIZE[0]'}) handWidth=1070;
    @property({tooltip:'Original CardMain.GROUPDIS[0]'}) groupDistance=1;
    @property({tooltip:'Original Game_Define.MOST_ACTION_DELAY'}) turnSeconds=20;
    @property([Sprite]) countdowns: Sprite[]=[];
    @property(Label) balanceLabel: Label=null!;
    @property(Label) pointsLabel: Label=null!;
    @property(Label) dropAmount: Label=null!;
    @property(Node) firstDrop: Node=null!;
    @property(Node) laterDrop: Node=null!;
    @property([Animation]) drawHints: Animation[]=[];
    @property(Animation) pickHint: Animation=null!;
    @property(Label) pickText: Label=null!;
    @property([Label]) seatClocks:Label[]=[];
    @property([Label]) seatCoins:Label[]=[];
    @property([Animation]) groupSweeps:Animation[]=[];
    @property(Node) flightLayer:Node=null!;
    @property(CardView) flightCard:CardView=null!;
    @property(Node) celebration:Node=null!;
    @property([Node]) celebrationPieces:Node[]=[];
    private celebrationHomes:Vec3[]=[];
    private localCoins:number[]=[];
    private groupKeys:string[]=[];
    getBalance:()=>number=()=>0;
    private preview=false;
    private hintState='';
    round: Round=null!;
    onLobby:()=>void=()=>{};
    onContinue:()=>void=()=>{};
    onSettlement:(delta:number)=>void=()=>{};
    private pool:CardView[]=[];
    private openView:CardView=null!;
    private wildView:CardView=null!;
    private selected=new Set<number>();
    private ids=new Map<CardView,number>();
    private remaining=20;
    private hurryPlayed=false;
    private lastTick=Date.now();
    private nextBotAt=0;
    private settled=false;
    private motionBusy=false;
    private shownTurn=-1;
    private animationEnds=new Map<Animation,()=>void>();
    private pending:(()=>void)|null=null;
    private lastTouch='';
    private names=['You','Player 1','Player 2','Player 3','Player 4'];
    localPlayer:{avatar:number;name:string}|undefined;
    private assignPlayers(){const players=randomPlayers(Math.random,this.localPlayer);this.names=players.map(p=>p.name);players.forEach((p,i)=>{this.playerNames[i].string=p.name;this.playerAvatars[i].spriteFrame=this.avatarFrames[p.avatar];this.resultAvatars[i].spriteFrame=this.avatarFrames[p.avatar];});}
    onLoad(){
        this.confirmation.setParent(this.node,true);this.confirmation.setSiblingIndex(this.node.children.length-1);
        if(DEBUG)this.node.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const target=e.target as Node;const canvas=document.getElementById('GameCanvas');if(canvas)canvas.dataset.rummyTarget=target?.name+' / '+target?.parent?.name;},this,true);
        this.celebrationHomes=this.celebrationPieces.map(n=>n.position.clone());
        this.pool=Array.from({length:14},()=>{
            const v=this.makeCard(this.cardRoots[0]);let origin=new Vec3(),down=new Vec3(),moved=false;
            v.node.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{origin.set(v.node.position);const p=e.getUILocation();down.set(p.x,p.y,0);moved=false;});
            v.node.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{
                if(!this.canTouch()||this.guideStep>=0)return;const p=e.getUILocation();if(!moved&&Math.hypot(p.x-down.x,p.y-down.y)<8)return;moved=true;
                v.node.parent!.getComponent(Layout)!.enabled=false;
                const local=v.node.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));v.node.setPosition(local.x,local.y-80,0);
            });
            v.node.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{
                this.lastTouch=String(this.ids.get(v));
                if(!this.canTouch())return;const id=this.ids.get(v)!;
                if(moved){const p=e.getUILocation();const target=this.pool.find(c=>c!==v&&c.node.activeInHierarchy&&c.node.getComponent(UITransform)!.getBoundingBoxToWorld().contains(p));if(target)this.round.move(id,this.ids.get(target)!);v.node.setPosition(origin);v.node.parent!.getComponent(Layout)!.enabled=true;}
                else if(this.selected.has(id))this.selected.delete(id);else this.selected.add(id);this.render();
            });
            v.node.on(Node.EventType.TOUCH_CANCEL,()=>{v.node.setPosition(origin);v.node.parent!.getComponent(Layout)!.enabled=true;});return v;
        });
        this.openView=this.makeCard(this.discardRoot);this.wildView=this.makeCard(this.wildRoot);
        this.drawButton.on(Node.EventType.TOUCH_END,()=>this.draw(false));this.openButton.on(Node.EventType.TOUCH_END,()=>this.draw(true));
        this.click(this.actionButton,()=>this.discardSelected());
        this.click(this.groupButton,()=>{if(this.canTouch()&&this.round.group(Array.from(this.selected)))this.selected.clear();this.render();});
        this.addGroupButtons.forEach((button,i)=>this.click(button,()=>{if(this.canTouch()&&this.round.addToGroup(Array.from(this.selected),i)){this.selected.clear();this.render();}}));
        this.click(this.sortButton,()=>this.sortCards());
        this.click(this.declareButton,()=>{if(!this.canTouch())return;const id=this.round.phase==='discard'?Array.from(this.selected)[0]:undefined;this.confirm('Declare this hand? An invalid declaration costs 80 points.',()=>{this.round.declare(id);this.advance();});});
        this.click(this.dropButton,()=>this.drop());this.click(this.backButton,()=>this.leaveTable());
        this.click(this.continueButton,()=>this.closeResult(()=>this.preview?this.onLobby():this.onContinue()));this.click(this.lobbyButton,()=>this.closeResult(()=>this.onLobby()));
        this.click(this.cancelButton,()=>{this.pending=null;this.confirmation.active=false;});
        this.click(this.confirmButton,()=>{const fn=this.pending;this.pending=null;this.confirmation.active=false;fn?.();});
    }
    private click(n:Node,fn:()=>void){n.on(Button.EventType.CLICK,fn);}
    private makeCard(parent:Node){const n=instantiate(this.cardPrefab);parent.addChild(n);return n.getComponent(CardView)!;}
    begin(perPoint:number){this.guideStep=-1;this.firstPlayGuide.active=false;this.guidePending=sys.localStorage.getItem('rummyA.firstPlayGuide.v1')!=='done';this.preview=false;this.hintState="";this.stopMotions();this.shownTurn=-1;this.nextBotAt=0;this.lastTick=Date.now();this.hurryPlayed=false;this.round=new Round(perPoint);this.localCoins=[this.getBalance(),...Array.from({length:4},(_,i)=>perPoint*80*(i+2))];this.groupKeys=[];this.assignPlayers();this.selected.clear();this.settled=false;this.resultPanel.active=false;this.confirmation.active=false;this.setTableControls(true);this.pointLabel.string=String(perPoint);this.wildView.show(this.round.indicator,this.round.wildRank);this.remaining=this.turnSeconds;this.render();this.effects.playOneShot(this.drawSound,this.effects.volume);this.motionBusy=true;this.playMotion(this.startAnimation,'Clip_StartGame',()=>{this.startAnimation.node.active=false;this.handRoot.active=false;this.shuffleCards.forEach((v,i)=>v.show(this.round.seats[0].hand[i],this.round.wildRank));this.playMotion(this.shuffleAnimation,'Shuffle',()=>{this.shuffleAnimation.node.active=false;this.handRoot.active=true;this.motionBusy=false;this.groupKeys=[];this.render();this.lastTick=Date.now();if(this.guidePending){this.guideStep=0;this.refreshGuide();}});});}
    private refreshGuide(){
        if(this.guideStep<0||!this.round)return;
        this.firstPlayGuide.active=!this.confirmation.active;
        // The hole follows the actual controls after responsive layout and card grouping.
        this.guideStep=this.round.phase==='draw'?0:this.selected.size===1?2:1;
        this.actionButton.active=true;this.declareButton.active=false;
        const card=this.pool.find(v=>v.node.activeInHierarchy&&this.ids.get(v)!==this.round.pickedOpen)?.node;
        const target=this.guideStep===0?this.drawButton:this.guideStep===1?card:this.actionButton;
        if(!target)return;
        const box=target.getComponent(UITransform)!.getBoundingBoxToWorld(),space=this.firstPlayGuide.getComponent(UITransform)!;
        const lo=space.convertToNodeSpaceAR(new Vec3(box.xMin,box.yMin,0)),hi=space.convertToNodeSpaceAR(new Vec3(box.xMax,box.yMax,0));
        // Cards overlap: reveal only the left exposed portion of the chosen card.
        if(this.guideStep===1)hi.x=Math.min(hi.x,lo.x+60);
        const left=lo.x-4,right=hi.x+4,bottom=lo.y-4,top=hi.y+4,edge=4096;
        const rect=(name:string,x:number,y:number,w:number,h:number)=>{const n=this.firstPlayGuide.getChildByName(name)!;n.setPosition(x,y,0);n.getComponent(UITransform)!.setContentSize(w,h);};
        rect('Top',0,(edge+top)/2,edge*2,edge-top);
        rect('Bottom',0,(-edge+bottom)/2,edge*2,edge+bottom);
        rect('Left',(-edge+left)/2,(bottom+top)/2,edge+left,top-bottom);
        rect('Right',(edge+right)/2,(bottom+top)/2,edge-right,top-bottom);
        const finger=this.firstPlayGuide.getChildByName('Finger')!;
        finger.angle=this.guideStep===1?180:0;finger.setPosition((left+right)/2,this.guideStep===1?top+10:bottom-10,0);
        const messages=['1 / 3   Tap the highlighted pile to draw a card.','2 / 3   Tap the highlighted card to select it.','3 / 3   Tap Discard to play your selected card.'];
        this.firstPlayGuide.getChildByName('Instruction')!.getChildByName('Label')!.getComponent(Label)!.string=messages[this.guideStep];
    }
    private sorting=false;
    private sortCards(){
        if(!this.canUseTableAction())return;
        const starts=new Map(this.pool.filter(v=>v.node.activeInHierarchy).map(v=>[this.ids.get(v)!,v.face.worldPosition.clone()]));
        if(!this.round.sort()){this.confirm('Your cards are already sorted.\nNo changes are needed.');return;}
        this.groupKeys=[];this.selected.clear();this.render();
        this.sorting=true;this.motionBusy=true;
        const cards=this.pool.filter(v=>v.node.activeInHierarchy);
        cards.forEach((v,i)=>v.animateSort(starts.get(this.ids.get(v)!)!,i*.015,()=>{
            if(i===cards.length-1){this.sorting=false;this.motionBusy=false;this.lastTick=Date.now();this.render();}
        }));
    }
    private canTouch(){return !!this.round&&!this.motionBusy&&this.round.turn===0&&this.round.phase!=='ended'&&!this.confirmation.active;}
    private canUseTableAction(){
        if(!this.round||this.round.phase==='ended'||this.confirmation.active)return false;
        if(this.round.seats[0].dropped){this.confirm('You have already dropped this hand.\nPlease wait for the next hand.');return false;}
        if(this.round.turn!==0){this.confirm('Please wait for your turn.\nAnother player is playing.');return false;}
        if(this.motionBusy){this.confirm('Cards are moving.\nPlease wait a moment.');return false;}
        return true;
    }
    private fly(card:{id:number;suit:number;rank:number},from:Vec3,to:Vec3,fromScale:number,toScale:number,done:()=>void){
        this.motionBusy=true;const space=this.flightLayer.getComponent(UITransform)!;
        const start=space.convertToNodeSpaceAR(from),end=space.convertToNodeSpaceAR(to);
        this.flightCard.show(card,this.round.wildRank);const n=this.flightCard.node;n.active=true;n.setPosition(start);n.setScale(fromScale,fromScale,1);
        tween(n).to(.32,{position:end,scale:new Vec3(toScale,toScale,1)},{easing:'quadOut'}).call(()=>{n.active=false;this.motionBusy=false;done();}).start();
    }
    private draw(open:boolean,automatic=false){
        if(!this.canTouch())return;if(open&&!this.round.canDrawOpen){this.statusLabel.node.active=true;this.statusLabel.string='Cannot take a Joker from the open pile';return;}
        const from=(open?this.openView.node:this.drawButton).worldPosition.clone();
        if(this.round.draw(open,automatic)){const card=this.round.seats[0].hand.find(c=>c.id===this.round.actionCard)!;this.selected.clear();this.render();const target=this.pool.find(v=>this.ids.get(v)===card.id)!;const end=target.node.worldPosition.clone();target.node.active=false;
            this.effects.playOneShot(this.cardSound,this.effects.volume);this.fly(card,from,end,.762,1,()=>this.advance());}
    }
    private discardSelected(automatic=false){
        if(!this.canTouch())return;
        if(this.round.phase!=='discard'){if(!automatic)this.confirm('Draw a card first, then select\none card and press Discard.');return;}
        if(this.selected.size!==1){if(!automatic)this.confirm(this.selected.size?'Select only one card to discard.':'Select one card from your hand,\nthen press Discard.');return;}
        const id=Array.from(this.selected)[0],card=this.round.current.hand.find(c=>c.id===id)!;
        if(id===this.round.pickedOpen){if(!automatic)this.confirm('You cannot discard the card just taken\nfrom the open pile. Select another card.');return;}
        const view=this.pool.find(v=>this.ids.get(v)===id)!,from=view.node.worldPosition.clone(),to=this.openView.node.worldPosition.clone();view.node.active=false;
        this.effects.playOneShot(this.cardSound,this.effects.volume);this.fly(card,from,to,1,.762,()=>{this.round.discard(id,automatic);if(!automatic&&this.guideStep>=0){sys.localStorage.setItem('rummyA.firstPlayGuide.v1','done');this.guideStep=-1;this.guidePending=false;this.firstPlayGuide.active=false;}if(automatic)this.round.autoDiscardCount++;this.selected.clear();this.advance();});
    }
    private confirm(text:string,fn?:()=>void){
        this.pending=fn??null;this.cancelButton.active=!!fn;
        const p=this.confirmButton.position;this.confirmButton.setPosition(fn?-this.cancelButton.position.x:0,p.y,p.z);
        this.confirmButton.getChildByName('Label')!.getComponent(Label)!.string=fn?'Confirm':'OK';
        this.confirmationText.string=text;this.confirmation.active=true;
    }
    private leaveTable(){
        if(!this.round||this.confirmation.active)return;
        if(this.settled){this.stopMotions();this.onLobby();return;}
        const seat=this.round.seats[0],penalty=seat.dropped?seat.penalty:seat.draws?40:20;
        this.confirm(`Return to lobby for ${penalty} points?`,()=>{
            this.nextBotAt=0;this.stopMotions();
            // Leaving abandons this local round; never drop the current AI seat.
            if(!this.settled){this.settled=true;this.onSettlement(-penalty*this.round.perPoint);}
            this.guideStep=-1;this.firstPlayGuide.active=false;this.onLobby();
        });
    }
    private drop(){if(!this.canUseTableAction())return;const penalty=this.round.seats[0].draws?40:20;this.confirm(`Drop for ${penalty} points?`,()=>{this.round.drop();this.advance();});}
    private advance(){this.remaining=this.turnSeconds;this.hurryPlayed=false;this.lastTick=Date.now();this.render();this.nextBotAt=this.round.phase!=='ended'&&this.round.turn!==0?Date.now()+3000:0;}
    private bot=()=>{if(!this.node.activeInHierarchy||this.round.phase==='ended')return;const seat=this.round.turn,top=this.round.pile.at(-1);this.round.bot();const a=this.opponentAnimations[seat-1];if(!a){this.advance();return;}const fromOpen=!!top&&!this.round.pile.some(c=>c.id===top.id),prefix=String(seat).padStart(2,'0');this.motionBusy=true;this.playMotion(a,prefix+(fromOpen?'_Get_Dis':'_Get_Deck'),()=>this.playMotion(a,prefix+'_Dis',()=>{a.node.active=false;this.motionBusy=false;this.advance();}));};
    update(){const now=Date.now(),elapsed=(now-this.lastTick)/1000;this.lastTick=now;if(this.guideStep>=0){this.refreshGuide();this.guidePulse+=elapsed;const finger=this.firstPlayGuide.getChildByName('Finger')!;const scale=1+Math.sin(this.guidePulse*5)*.06;finger.setScale(scale,scale,1);return;}if(!this.round||this.round.phase==='ended'||this.confirmation.active||this.motionBusy)return;if(this.nextBotAt&&now>=this.nextBotAt){this.nextBotAt=0;this.bot();return;}this.remaining-=elapsed;this.seatClocks.forEach((l,i)=>{l.node.active=i===this.round.turn;l.string=String(Math.max(0,Math.ceil(this.remaining)));});this.countdowns.forEach((s,i)=>{s.node.active=i===this.round.turn;s.fillRange=-Math.max(0,this.remaining/this.turnSeconds);});this.turnLabel.string=String(Math.max(0,Math.ceil(this.remaining)));if(this.round.turn===0&&this.remaining<=5&&!this.hurryPlayed){this.hurryPlayed=true;this.effects.playOneShot(this.hurrySound,this.effects.volume);}if(this.remaining<=0&&this.round.turn===0){if(this.round.phase==='draw'){this.draw(false,true);}else if(this.round.autoDiscardCount<1){const id=this.round.current.hand.find(c=>c.id===this.round.actionCard&&c.id!==this.round.pickedOpen)?.id??this.round.current.hand.find(c=>c.id!==this.round.pickedOpen)!.id;this.selected=new Set([id]);this.discardSelected(true);}else{this.round.timeout();this.selected.clear();this.advance();}}}
    private render(){
        if(this.sorting)return;
        const r=this.round,groups=r.seats[0].groups,count=r.seats[0].hand.length;
        this.statusLabel.node.active=false;
        this.balanceLabel.string=this.getBalance().toLocaleString('en-US');
        this.pointsLabel.string=String(analyze(r.seats[0].hand,r.wildRank).score);
        const penalty=r.seats[0].draws?40:20;this.dropAmount.string=String(-penalty*r.perPoint);this.firstDrop.active=penalty===20;this.laterDrop.active=penalty===40;
        this.countdowns.forEach((s,i)=>{s.node.active=i===r.turn&&r.phase!=='ended';s.fillRange=-Math.max(0,this.remaining/this.turnSeconds);});
        this.seatClocks.forEach((l,i)=>{l.node.active=i===r.turn&&r.phase!=='ended';l.string=String(Math.max(0,Math.ceil(this.remaining)));});
        this.seatCoins.forEach((l,i)=>l.string=(i===0?this.getBalance():this.localCoins[i]||0).toLocaleString('en-US'));

        // Exact original CardMain.CardGroupUpdate overlap formula. Layout components position cards.
        const overlap=count>groups.length?-(110*count-8*groups.length+(groups.length-1)*this.groupDistance-this.handWidth)/(count-groups.length):0;
        this.pool.forEach(v=>v.node.active=false);let index=0;
        const first=groups.findIndex(g=>r.groupState(g)==='pure');const second=groups.findIndex((g,i)=>i!==first&&['pure','impure'].includes(r.groupState(g)||''));
        for(let i=0;i<7;i++){
            const group=groups[i]||[],root=this.groupRoots[i],cards=this.cardRoots[i];root.active=!!group.length;if(!group.length)continue;
            const layout=cards.getComponent(Layout)!;layout.enabled=false;layout.spacingX=overlap;
            for(const id of group){const v=this.pool[index++];v.node.setParent(cards);v.node.setSiblingIndex(group.indexOf(id));v.node.active=true;this.ids.set(v,id);v.show(r.seats[0].hand.find(c=>c.id===id)!,r.wildRank);v.select(this.selected.has(id));}
            const width=110*group.length+(group.length-1)*overlap-8;root.getComponent(UITransform)!.width=width;cards.getComponent(UITransform)!.width=width;
            this.groupTags[i].node.getComponent(UITransform)!.width=width;this.groupLabels[i].node.getComponent(UITransform)!.width=width;
            const type=r.groupState(group);let tag=7,text='';
            if(i===first){tag=0;text='First Life';}else if(i===second&&first>=0){tag=1;text='Second Life';}else if(type==='pure'){tag=2;text='Pure Sequence';}else if(type==='impure'){tag=first>=0?3:5;text=first>=0?'Sequence':'Need First Life';}else if(type==='set'){tag=first>=0&&second>=0?4:6;text=tag===4?'Set':'Need Second Life';}
            const key=group.join(',')+':'+type;if(key!==this.groupKeys[i]){this.groupKeys[i]=key;if(type){const a=this.groupSweeps[i];a.node.active=true;this.playMotion(a,a.clips[0]!.name.replace(/_[0-9a-f]{8}$/,''));}else this.groupSweeps[i].node.active=false;}
            this.groupLabels[i].string=text;this.groupTags[i].spriteFrame=this.tagFrames[tag];layout.enabled=true;layout.updateLayout();
        }
        this.handRoot.getComponent(Layout)!.updateLayout();const top=r.pile[r.pile.length-1];this.openView.node.active=!!top;if(top)this.openView.show(top,r.wildRank);
        this.updateHints();
        const can=r.turn===0&&!r.seats[0].dropped&&r.phase!=='ended';this.groupButton.active=can&&this.selected.size>1;
        this.addGroupButtons.forEach((button,i)=>button.active=can&&!!groups[i]&&Array.from(this.selected).some(id=>!groups[i].includes(id)));
        const id=this.selected.size===1?Array.from(this.selected)[0]:undefined;
        this.declareButton.active=can&&this.selected.size<=1&&r.canDeclare(id);this.actionButton.active=can&&this.selected.size<=1&&!this.declareButton.active;
        this.actionButton.getComponent(Button)!.interactable=can;
        this.sortButton.getComponent(Button)!.interactable=r.phase!=='ended';this.dropButton.getComponent(Button)!.interactable=r.phase!=='ended';
        this.playerStates.forEach((l,i)=>{l.node.active=true;l.string=r.seats[i].dropped?'Drop':r.turn===i?(i===0?'Your turn':'Playing'):`${r.seats[i].hand.length} cards`;});
        if(this.shownTurn!==r.turn){this.turnAnimations.forEach((a,i)=>{a.stop();a.node.active=i===r.turn;if(i===r.turn)this.playMotion(a,'Clip_PlayerTurn');});this.shownTurn=r.turn;}
        this.statusLabel.string=r.phase==='ended'?r.reason:r.turn===0?r.phase==='draw'?'Draw from the closed or open pile':'Select one card to discard · select several cards to group':`${this.names[r.turn]} is playing`;
        if(r.phase==='ended'&&!this.settled)this.showResult();
        if(this.guideStep>=0)this.refreshGuide();
        if(DEBUG && typeof document!=='undefined'){
            const canvas=document.getElementById('GameCanvas');
            if(canvas)canvas.dataset.rummy=JSON.stringify({players:this.names.map((name,i)=>({name,avatar:this.avatarFrames.indexOf(this.playerAvatars[i].spriteFrame!)})),turn:r.turn,phase:r.phase,selected:Array.from(this.selected),lastTouch:this.lastTouch,groups:r.seats[0].groups,hand:r.seats[0].hand,confirmation:this.confirmation.active,cards:this.pool.filter(v=>v.node.activeInHierarchy).map(v=>({id:this.ids.get(v),position:v.node.position,box:v.node.getComponent(UITransform)!.getBoundingBoxToWorld()}))});
        }
    }
    private showResult(){
        const r=this.round;this.settled=true;this.setTableControls(false);this.resultPanel.active=true;this.winTitle.active=r.winner===0;this.loseTitle.active=r.winner!==0;
        const a=this.resultPanel.getComponent(Animation)!;this.playMotion(a,r.winner===0?'Compliment_Start':'Compliment_Start_Lose',()=>this.playMotion(a,r.winner===0?'Compliment_Wait':'Compliment_Wait_Lose'));
        r.seats.forEach((s,i)=>{this.resultNames[i].string=this.names[i];this.resultStates[i].string=i===r.winner?'Winner':s.dropped?`Drop · ${s.penalty}`:`${s.penalty} points`;this.resultAmounts[i].string=(r.deltas[i]>0?'+':'')+r.deltas[i];this.resultCards[i].children.slice().forEach(n=>{n.removeFromParent();n.destroy();});s.hand.forEach(card=>this.makeCard(this.resultCards[i]).show(card,r.wildRank));this.resultCards[i].getComponent(Layout)!.updateLayout();});
        if(!this.preview)this.onSettlement(r.deltas[0]);
        this.localCoins=this.localCoins.map((n,i)=>n+r.deltas[i]);this.seatCoins.forEach((l,i)=>l.string=(i===0?this.getBalance():this.localCoins[i]||0).toLocaleString('en-US'));
        if(r.winner===0)this.startCelebration();
        if(r.winner===0)this.effects.playOneShot(this.winSound,this.effects.volume);
    }
    previewResult(win:boolean){
        this.stopMotions();this.preview=true;this.hintState='';this.nextBotAt=0;this.shownTurn=-1;this.settled=false;this.selected.clear();this.confirmation.active=false;
        this.round=new Round(1);this.localCoins=[this.getBalance(),160,240,320,400];this.assignPlayers();const winner=win?0:1;
        for(let i=0;i<5;i++)if(i!==winner){this.round.turn=i;this.round.drop();}
        this.round.reason='Result preview';this.render();
    }
    private updateHints(){
        const r=this.round,active=r.turn===0&&r.phase==='draw'&&!r.seats[0].dropped;
        const choice=active&&r.canDrawOpen?chooseDiscard([...r.current.hand,r.pile.at(-1)!],r.wildRank,r.pile.at(-1)!.id):null;
        const before=analyze(r.seats[0].hand,r.wildRank),after=choice?.result;
        let hint='Pick up a Card';if(after?.valid)hint='Pick up to Declare';else if(after&&after.groups.some(g=>g.type==='pure')&&!before.groups.some(g=>g.type==='pure'))hint='Click to Get {1st Life}';
        if(after&&hint!=='Pick up a Card'){const meld=after.groups.find(g=>g.cards.some(c=>c.id===r.pile.at(-1)!.id));this.pool.forEach(v=>{if(meld?.cards.some(c=>c.id===this.ids.get(v)))v.showHint();});}
        const key=active?'draw-'+r.canDrawOpen+hint:'off';if(key===this.hintState)return;this.hintState=key;
        this.drawHints.forEach((a,i)=>{a.stop();a.node.parent!.active=active&&(i===0||r.canDrawOpen);if(a.node.parent!.active)this.playMotion(a,'Clip_Hint_Card_Loop');});
        this.pickHint.stop();this.pickHint.node.active=active;
        if(active){this.pickText.node.active=true;this.pickText.string=hint;this.playMotion(this.pickHint,'Clip_Hint_Pick');}
    }
    private startCelebration(){this.celebration.active=true;this.celebrationPieces.forEach((n,i)=>{Tween.stopAllByTarget(n);n.setPosition(this.celebrationHomes[i]);const home=this.celebrationHomes[i],duration=2+(i%7)*.16;n.angle=0;tween(n).delay((i%12)*.08).repeatForever(tween().to(duration,{position:new Vec3(home.x+(i%2?65:-65),home.y-850,0),angle:i%2?360:-360}).set({position:home,angle:0})).start();});}
    private stopCelebration(){this.celebrationPieces.forEach(n=>Tween.stopAllByTarget(n));this.celebration.active=false;}
    private playMotion(a:Animation,name:string,finished?:()=>void){
        const old=this.animationEnds.get(a);if(old){a.off(Animation.EventType.FINISHED,old);this.animationEnds.delete(a);}a.stop();
        const clip=a.clips.find(c=>c&&c.name.replace(/_[0-9a-f]{8}$/,'')===name);
        if(!clip){finished?.();return;}
        a.node.active=true;
        if(finished){const end=()=>{this.animationEnds.delete(a);finished();};this.animationEnds.set(a,end);a.once(Animation.EventType.FINISHED,end);}
        a.play(clip.name);
    }
    private setTableControls(active:boolean){[this.handRoot.parent!,this.balanceLabel.node.parent!.parent!,this.statusLabel.node,this.pointLabel.node,this.backButton].forEach(n=>n.active=active);}
    private closeResult(done:()=>void){if(this.motionBusy)return;this.stopCelebration();this.motionBusy=true;this.playMotion(this.resultPanel.getComponent(Animation)!,this.round.winner===0?'Compliment_End':'Compliment_End__Lose',()=>{this.motionBusy=false;done();});}
    private stopMotions(){this.sorting=false;this.pool.forEach(v=>Tween.stopAllByTarget(v.face));this.stopCelebration();Tween.stopAllByTarget(this.flightCard.node);this.flightCard.node.active=false;this.animationEnds.forEach((end,a)=>{a.off(Animation.EventType.FINISHED,end);a.stop();});this.animationEnds.clear();this.drawHints.forEach(a=>{a.stop();a.node.parent!.active=false;});this.pickHint.stop();this.pickHint.node.active=false;this.opponentAnimations.forEach(a=>{a.stop();a.node.active=false;});this.shuffleAnimation.stop();this.shuffleAnimation.node.active=false;this.handRoot.active=true;this.motionBusy=false;}
    onDisable(){this.nextBotAt=0;this.stopMotions();}
}
