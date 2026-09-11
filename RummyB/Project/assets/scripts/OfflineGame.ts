import {_decorator,Component,Node,Label,Sprite,SpriteFrame,AudioSource,AudioClip,view,ResolutionPolicy,profiler,sp,sys,Button,EventTouch,UITransform,Vec3,UIOpacity,Layout,ScrollView,ProgressBar,Animation,Tween,tween,resources,Prefab,instantiate,isValid} from 'cc';
import {DeferredAssets} from './DeferredAssets';
import {Round,Card} from './Round';
import {analyze} from './Rules';
const {ccclass,property}=_decorator;

/** Original B prefab controls, driven by a local table authority. UI is authored in prefabs; heavy panels load on demand. */
@ccclass('OfflineGame')
export class OfflineGame extends Component {
    @property(Node) app:Node=null!;
    @property([Node]) rooms:Node[]=[];
    @property([Node]) cards:Node[]=[];
    @property([SpriteFrame]) blackRanks:SpriteFrame[]=[];
    @property([SpriteFrame]) redRanks:SpriteFrame[]=[];
    @property([SpriteFrame]) suits:SpriteFrame[]=[];
    @property([SpriteFrame]) portraits:SpriteFrame[]=[];
    @property([SpriteFrame]) avatars:SpriteFrame[]=[];
    @property(Label) status:Label=null!;
    @property(Node) noticeDialog:Node=null!;
    @property(Node) loadingOverlay:Node=null!;
    @property(AudioSource) music:AudioSource=null!;
    @property(AudioClip) backgroundMusic:AudioClip=null!;
    @property(AudioClip) winMusic:AudioClip=null!;
    @property(AudioClip) cardSound:AudioClip=null!;
    private lobby:Node=null!;
    private table:Node=null!;
    private hand:Node=null!;
    private result:Node=null!;
    private menu:Node=null!;
    private round:Round|null=null;
    private selected=new Set<number>();
    private settled=false;
    private balance=10000;
    private rates=[1,2,5,10,20];
    private muted=false;
    private drag:{index:number;start:Vec3;moved:boolean}|null=null;
    private turnTime=30;
    private phaseKey='';
    private avatarIndex=0;
    private pendingAvatar=0;
    private presenting=false;
    private presentationToken=0;
    private navigationEpoch=0;
    private pendingPanels=new Map<string,Promise<Node>>();
    private loadingPanel="";
    private panelProgress=new Map<string,number>();
    private retryAction:(()=>void)|null=null;
    private panel(name:string):Promise<Node>{
        const existing=this.app.getChildByName(name);if(existing)return Promise.resolve(existing);
        const pending=this.pendingPanels.get(name);if(pending)return pending;
        const loading=new Promise<Node>((resolve,reject)=>{
            resources.load('deferred/'+name,Prefab,(finished,total)=>{
                this.setLoadProgress(name,total>0?Math.min(99,Math.floor(finished/total*100)):0);
            },(error,prefab)=>{
                if(error){reject(error);return;}
                if(!isValid(this.node)){reject(new Error('Scene closed'));return;}
                let node:Node|undefined;
                try {
                    node=instantiate(prefab);node.active=false;this.app.addChild(node);
                    const order=['LobbyView','TableView','ResultView','MenuVertical','ChangeAvatorView','Help','AudioBank','Status','LoadingOverlay','NoticeDialog'];
                    [...this.app.children].sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name)).forEach((n,i)=>n.setSiblingIndex(i));
                    if(name==='TableView'){
                        this.table=node;this.hand=this.find(node,'HandSettingView')!;
                        const assets=node.getComponent(DeferredAssets)!;
                        this.cards=assets.cards;this.blackRanks=assets.blackRanks;this.redRanks=assets.redRanks;this.suits=assets.suits;this.portraits=assets.portraits;
                        for(const n of this.all(node)){const sk=n.getComponent(sp.Skeleton);if(sk?.skeletonData)sk.setAnimation(0,'idle',true);}
                        this.setupTable();
                    }else if(name==='ResultView'){this.result=node;this.setupResult();}
                    else if(name==='Help')this.setupHelp();
                    else if(name==='ChangeAvatorView')this.setupProfile();
                    else if(name==='AudioBank'){
                        const assets=node.getComponent(DeferredAssets)!;
                        this.backgroundMusic=assets.backgroundMusic;this.winMusic=assets.winMusic;this.cardSound=assets.cardSound;
                        this.playMusic(this.round?.winner===0);
                    }
                    this.setLoadProgress(name,100);resolve(node);
                }catch(e){node?.destroy();if(name==='TableView')this.table=null!;if(name==='ResultView')this.result=null!;reject(e);}
            });
        }).catch(error=>{this.pendingPanels.delete(name);this.panelProgress.delete(name);throw error;});
        this.pendingPanels.set(name,loading);return loading;
    }
    private loadFailed(retry:()=>void,error:unknown,foreground=true){
        console.warn('Deferred panel failed',error);this.unschedule(this.clearMessage);
        if(!foreground&&this.loadingOverlay?.active)return;
        if(foreground&&this.loadingOverlay?.active){
            this.retryAction=retry;this.loadingOverlay.getChildByName('Spinner')!.active=false;
            this.text(this.loadingOverlay,'LoadingLabel','Unable to load\nTap to retry');return;
        }
        this.retryAction=retry;this.status.string='加载失败，点击此处重试';this.status.node.active=true;
    }
    start(){
        // Yield the first frames to the lobby before any optional downloads start.
        this.scheduleOnce(()=>this.loadAudio(),.25);
        this.scheduleOnce(()=>resources.preload('deferred/TableView',Prefab,()=>{}),.75);
    }
    private loadAudio(){this.panel('AudioBank').catch(e=>this.loadFailed(()=>this.loadAudio(),e,false));}
    private async openProfile(){
        const epoch=++this.navigationEpoch;
        if(!this.picker())this.showLoading('ChangeAvatorView');
        try {await this.panel('ChangeAvatorView');}catch(e){if(epoch===this.navigationEpoch)this.loadFailed(()=>this.openProfile(),e);return;}
        if(epoch!==this.navigationEpoch||!isValid(this.node))return;
        this.clearMessage();this.setMenu(false);this.picker().active=true;this.selectAvatar(this.avatarIndex);
    }
    private ownAvatar(){return this.avatars[this.avatarIndex]||this.avatars[0];}
    private playMusic(win=false){
        const clip=win?this.winMusic:this.backgroundMusic;if(!clip)return;
        if(this.music.clip!==clip){this.music.stop();this.music.clip=clip;}
        this.music.loop=true;this.music.volume=this.muted?0:.35;
        if(!this.music.playing)this.music.play();
    }
    private picker(){return this.app.getChildByName('ChangeAvatorView')!;}
    private roomMenu(){return this.table.getChildByName('RoomMenu')!;}
    private setRooms(open:boolean){this.toggle(this.roomMenu(),'Board',open);this.toggle(this.roomMenu(),'BG',open);}
    private selectAvatar(index:number){this.pendingAvatar=index;this.find(this.picker(),'Group')!.children.forEach((n,i)=>this.toggle(n,'UI_Avator_FX',i===index));}
    private setupProfile(){
        this.find(this.picker(),'Group')!.children.forEach((n,i)=>n.on(Node.EventType.TOUCH_END,()=>this.selectAvatar(i),this));
        this.bind(this.picker(),'UI_Avator_X',()=>this.picker().active=false);
        this.bind(this.picker(),'UI_Avator_BTN',()=>{this.avatarIndex=this.pendingAvatar;sys.localStorage.setItem('rummyB.offline.avatar',String(this.avatarIndex));this.find(this.lobby,'Avator')!.getComponent(Sprite)!.spriteFrame=this.ownAvatar();this.picker().active=false;});
    }
    private setupRooms(){
        this.bind(this.roomMenu(),'MenuButton',()=>this.setRooms(!this.find(this.roomMenu(),'Board')!.active));
        this.bind(this.roomMenu(),'BG',()=>this.setRooms(false));
        this.find(this.roomMenu(),'Board')!.children.forEach((row,i)=>{
            this.text(row,'AnteNum',String(this.rates[i]));this.text(row,'AllowedNum',String(this.rates[i]*80)+'+');
            this.bind(row,'JoinButton',()=>{
                const r=this.round,seat=r?.seats[0],cost=r&&r.phase!=='ended'?(seat!.dropped?seat!.penalty:seat!.draws?40:20)*r.perPoint:0;
                if(this.balance-cost<this.rates[i]*80){this.message('Not enough chips after the current hand drop cost.');return;}
                this.home();this.begin(i);
            });
        });
    }
    private cancelPresentation(){
        this.presentationToken++;this.presenting=false;
        for(const n of this.all(this.app))n.getComponent(Animation)?.stop();
        for(const n of this.cards)Tween.stopAllByTarget(n);
    }
    private playClip(n:Node,name:string){
        const anim=n.getComponent(Animation);
        const clip=anim?.clips.find(c=>c&&(c.name===name||c.name.replace(/_[0-9a-f]{8}$/i,'')===name));
        if(clip)anim!.play(clip.name);
    }
    private dealCards(){
        const token=this.presentationToken;this.presenting=true;this.render();
        const info=this.find(this.table,'TableInfoView')!,start=this.find(info,'StartGame')!;info.active=true;start.active=true;this.playClip(start,'Base_GameStart');
        const pile=this.find(this.table,'CardPile')!,parent=this.cards[0].parent!.getComponent(UITransform)!;
        const origin=parent.convertToNodeSpaceAR(pile.worldPosition);
        this.cards.filter(n=>n.active).forEach((n,i)=>{
            const target=n.position.clone();n.setPosition(origin);n.setScale(.65,.65,1);this.toggle(n,'Base_Poker_Back',true);
            tween(n).delay(.35+i*.065).to(.22,{position:target,scale:new Vec3(1,1,1)}).call(()=>{
                if(token!==this.presentationToken)return;this.toggle(n,'Base_Poker_Back',false);
                if(!this.muted&&this.cardSound)this.music.playOneShot(this.cardSound,.3);
            }).start();
        });
        this.scheduleOnce(()=>{if(token!==this.presentationToken)return;start.active=false;this.presenting=false;this.turnTime=30;this.render();},1.6);
    }
    private finishRound(){
        const r=this.round!,token=this.presentationToken;this.presenting=true;
        if(r.winner===0)this.playMusic(true);
        let winner:Node|undefined;
        if(r.winner===0){this.table.getChildByName('Player')!.active=false;winner=this.table.getChildByName('PlayerWin')!;winner.active=true;this.find(winner,'Avator')!.getComponent(Sprite)!.spriteFrame=this.ownAvatar();this.text(winner,'Uid','YOU');this.playClip(winner,'Base_PlayerWin');}
        else if(r.winner>0){winner=this.players()[r.winner];this.playClip(winner,'Base_OtherWin');this.toggle(winner,'OtherWINGlow',true);this.toggle(winner,'Base_Crown',true);this.toggle(winner,'Base_Other_Win_Board',true);}
        this.scheduleOnce(()=>{if(token!==this.presentationToken)return;if(r.winner===0&&winner)winner.active=false;this.presenting=false;this.showResult();},1.6);
    }
    private all(n:Node):Node[]{return [n,...n.children.flatMap(c=>this.all(c))];}
    private find(n:Node,name:string){return this.all(n).find(c=>c.name===name);}
    private text(n:Node,name:string,s:string){const label=this.find(n,name)?.getComponent(Label);if(label)label.string=s;}
    private toggle(n:Node,name:string,on:boolean){const target=this.find(n,name);if(target)target.active=on;}
    private bind(n:Node,name:string,fn:()=>void){const target=this.find(n,name);if(target)target.on(target.getComponent(Button)?Button.EventType.CLICK:Node.EventType.TOUCH_END,fn,this);}
    private setLoadProgress(name:string,percent:number){
        this.panelProgress.set(name,percent);
        if(isValid(this.node)&&this.loadingPanel===name&&this.loadingOverlay?.active&&!this.retryAction)
            this.text(this.loadingOverlay,'LoadingLabel',`Loading… ${percent}%`);
    }
    private showLoading(name:string){
        this.unschedule(this.clearMessage);this.loadingPanel=name;this.retryAction=null;
        this.status.node.active=false;this.loadingOverlay.active=true;
        const spinner=this.loadingOverlay.getChildByName('Spinner')!;spinner.active=true;spinner.angle=0;
        this.setLoadProgress(name,this.panelProgress.get(name)??0);
    }
    private message(s:string){
        this.unschedule(this.clearMessage);this.status.string=s;this.status.node.active=true;
        this.scheduleOnce(this.clearMessage,3);
    }
    private clearMessage=()=>{this.loadingPanel='';this.status.node.active=false;if(this.loadingOverlay)this.loadingOverlay.active=false;};
    onLoad(){
        view.setDesignResolutionSize(1344,756,ResolutionPolicy.SHOW_ALL);profiler.hideStats();
        const saved=sys.localStorage.getItem('rummyB.offline.balance');
        if(saved!==null&&Number.isFinite(Number(saved)))this.balance=Math.max(0,Number(saved));
        this.lobby=this.app.getChildByName('LobbyView')!;this.menu=this.app.getChildByName('MenuVertical')!;
        const avatar=Number(sys.localStorage.getItem('rummyB.offline.avatar'));
        this.avatarIndex=Number.isInteger(avatar)&&avatar>=0&&avatar<this.avatars.length?avatar:0;
        this.bind(this.lobby,'Avator',()=>this.openProfile());
        this.status.node.on(Node.EventType.TOUCH_END,()=>this.retryAction?.(),this);
        this.bind(this.noticeDialog,'OK',()=>this.noticeDialog.active=false);
        this.loadingOverlay?.on(Node.EventType.TOUCH_END,()=>this.retryAction?.(),this);
        for(const n of this.all(this.app)){const skeleton=n.getComponent(sp.Skeleton);if(skeleton?.skeletonData)skeleton.setAnimation(0,'idle',true);}
        this.rooms.forEach((n,i)=>{this.text(n,'AnteLabel',String(this.rates[i]));this.text(n,'AllowedLabel',String(this.rates[i]*80)+'+');
            for(const c of this.all(n))if(/^LV[1-5]$/.test(c.name))c.active=c.name==='LV'+(i+1);
            n.on(Node.EventType.TOUCH_END,()=>this.begin(i),this);
        });
        this.bind(this.menu,'UI_Menu_BTN',()=>this.setMenu(!this.find(this.menu,'UI_Menu_Board_Mask')!.active));
        this.bind(this.menu,'InputLayer',()=>this.setMenu(false));
        this.bind(this.menu,'UI_Menu_Home_BTN',()=>this.home());
        this.bind(this.menu,'UI_Menu_Help_BTN',()=>{this.setMenu(false);this.showHelp(0);});
        this.bind(this.menu,'UI_Menu_Sound_BTN',()=>{this.muted=!this.muted;this.playMusic(this.round?.winner===0);this.toggle(this.menu,'UI_Menu_Sound_On_BTN',!this.muted);this.toggle(this.menu,'UI_Menu_Sound_Off_BTN',this.muted);});
        this.home();
        this.bind(this.lobby,'TestWinButton',()=>this.begin(0,0));
        this.bind(this.lobby,'TestLoseButton',()=>this.begin(0,1));
    }
    private setupTable(){
        this.cards.forEach((n,i)=>{
            n.on(Node.EventType.TOUCH_START,()=>{if(this.canArrange())this.drag={index:i,start:n.position.clone(),moved:false};},this);
            n.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>this.dragMove(i,e),this);
            n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>this.dragEnd(i,e),this);
            n.on(Node.EventType.TOUCH_CANCEL,()=>{this.drag=null;this.render();},this);
        });
        this.bind(this.hand,'AutoSortButton',()=>{if(this.canArrange()){if(!this.round!.sort()){this.noticeDialog.active=true;return;}this.selected.clear();this.render();}});
        this.bind(this.hand,'GroupButton',()=>{if(this.round?.group(Array.from(this.selected))){this.selected.clear();this.render();}});
        this.bind(this.hand,'DumpButton',()=>this.discard());
        this.bind(this.hand,'DeclareButton',()=>this.declare());
        this.bind(this.hand,'DropButton',()=>{if(this.canArrange()){this.round!.drop();this.afterAction();}});
        this.bind(this.table,'CardPile',()=>this.draw(false));this.bind(this.table,'DiscardCards',()=>this.draw(true));
        this.setupRooms();
    }
    private setupResult(){
        this.bind(this.result,'LobbyButton',()=>this.home());this.bind(this.result,'ContinueButton',()=>this.begin(this.rates.indexOf(this.round?.perPoint||1)));
    }
    private setupHelp(){
        const help=this.app.getChildByName('Help')!;
        this.bind(help,'Base_Help_Cancel',()=>help.active=false);
        ['HowToPlayButton','HandExampleButton','AdditionNoteButton'].forEach((name,i)=>this.bind(help,name,()=>this.showHelp(i)));
    }
    private canArrange(){return !this.noticeDialog.active&&!this.presenting&&!!this.round&&this.round.turn===0&&this.round.phase!=='ended'&&!this.round.seats[0].dropped;}
    private setMenu(open:boolean){this.toggle(this.menu,'InputLayer',open);this.toggle(this.menu,'UI_Menu_Board_Mask',open);}
    private async showHelp(index:number){
        const epoch=++this.navigationEpoch;
        if(!this.app.getChildByName('Help'))this.showLoading('Help');
        try { await this.panel('Help'); } catch(e){if(epoch===this.navigationEpoch)this.loadFailed(()=>this.showHelp(index),e);return;}
        if(epoch!==this.navigationEpoch||!isValid(this.node))return;
        this.clearMessage();
        const help=this.app.getChildByName('Help')!;help.active=true;
        const content=this.find(help,'content')!;
        content.children.forEach((page,i)=>{page.active=i===index;if(page.active)page.getComponent(Layout)?.updateLayout();});
        content.getComponent(Layout)?.updateLayout();
        for(const n of this.all(help))n.getComponent(ScrollView)?.scrollToTop(0);
    }
    private home(){
        this.noticeDialog.active=false;
        ++this.navigationEpoch;this.retryAction=null;
        this.clearMessage();
        this.cancelPresentation();
        this.playMusic();
        // Leaving a live hand has the same local drop cost; leaving a settled hand never charges twice.
        if(this.round&&this.round.phase!=='ended'){
            const seat=this.round.seats[0],cost=(seat.dropped?seat.penalty:seat.draws?40:20)*this.round.perPoint;
            this.balance=Math.max(0,this.balance-cost);this.saveBalance();
        }
        this.unschedule(this.botTurn);this.round=null;this.drag=null;
        for(const n of this.app.children)n.active=['LobbyView','MenuVertical'].includes(n.name);
        this.setMenu(false);this.text(this.lobby,'userName','Offline Player');this.text(this.lobby,'balance',this.balance.toLocaleString());
        this.toggle(this.lobby,'InfoPanel',true);const avatar=this.find(this.lobby,'Avator')?.getComponent(Sprite);if(avatar)avatar.spriteFrame=this.ownAvatar();
    }
    private async begin(level:number,previewWinner?:number){
        const epoch=++this.navigationEpoch;this.retryAction=null;
        if(!this.table)this.showLoading('TableView');
        try { await this.panel('TableView'); } catch(e){if(epoch===this.navigationEpoch)this.loadFailed(()=>this.begin(level,previewWinner),e);return;}
        if(epoch!==this.navigationEpoch||!isValid(this.node))return;
        this.clearMessage();
        const rate=this.rates[level]||1;if(previewWinner===undefined&&this.balance<rate*80){this.message('Not enough chips for this room.');return;}
        this.cancelPresentation();this.unschedule(this.botTurn);this.round=new Round(rate);this.selected.clear();this.settled=false;this.phaseKey='';this.drag=null;
        this.lobby.active=false;this.table.active=true;this.table.getChildByName('Player')!.active=true;if(this.result)this.result.active=false;this.status.node.active=false;this.setMenu(false);
        this.toggle(this.app,'Help',false);this.toggle(this.app,'ChangeAvatorView',false);this.roomMenu().active=true;this.setRooms(false);this.text(this.roomMenu(),'Label','LV'+(level+1));this.toggle(this.table,'PlayerWin',false);
        this.playMusic();
        for(const name of ['CardPile','WildJokerCard','DiscardCards','HandSettingView','Base_RestCard_Board','BubbleMsgView'])this.toggle(this.table,name,true);
        this.find(this.table,'CardPile')!.setPosition(-150,70,0);this.find(this.table,'WildJokerCard')!.angle=30;
        this.find(this.table,'OtherPlayer')?.children.forEach(n=>n.active=true);
        for(const name of ['Mask','ResultCardGroup','Base_Calculating_BTN','Base_Calculating_Win_BTN']){const n=this.hand.getChildByName(name);if(n)n.active=false;}
        this.text(this.table,'PerPointNum',String(rate));
        this.players().forEach((n,i)=>{this.text(n,'Uid',i?'CPU '+i:'YOU');const s=this.find(n,'Avator')?.getComponent(Sprite);if(s)s.spriteFrame=i?this.avatars[i]:this.ownAvatar();const bar=this.find(n,'TimeProgressBar')?.getChildByName('Bar')?.getComponent(Sprite);if(bar)bar.spriteFrame=i?this.avatars[i]:this.ownAvatar();});
        if(previewWinner!==undefined){
            // Presentation preview: fixed sample scores, never credit/debit the saved balance.
            const r=this.round;r.winner=previewWinner;r.phase='ended';r.reason='Presentation test';
            r.seats.forEach((seat,i)=>{seat.penalty=i===previewWinner?0:40;r.deltas[i]=-seat.penalty*rate;});
            r.deltas[previewWinner]=-r.deltas.reduce((a,b)=>a+b,0);
            this.settled=true;this.render();this.finishRound();return;
        }
        this.schedule(this.botTurn,.85);this.render();this.dealCards();
    }
    private players(){return [this.table.getChildByName('Player')!,...this.find(this.table,'OtherPlayer')!.children];}
    private draw(open:boolean){if(!this.canArrange()||this.round!.phase!=='draw')return;
        if(this.round!.draw(open)){if(!this.muted&&this.music&&this.cardSound)this.music.playOneShot(this.cardSound,.6);this.selected.clear();this.render();}
        else this.message('This card cannot be taken from the open pile.');
    }
    private discard(){if(!this.canArrange()||this.selected.size!==1)return;
        if(this.round!.discard(Array.from(this.selected)[0]))this.afterAction();else this.message('A card taken from the open pile cannot be returned immediately.');
    }
    private declare(){if(!this.canArrange())return;const r=this.round!,id=r.phase==='discard'?Array.from(this.selected)[0]:undefined;
        if(!r.canDeclare(id)){this.message('Form two runs, including a pure run, before declaring.');return;}
        r.declare(id);this.afterAction();
    }
    private afterAction(){this.selected.clear();this.render();}
    private paused(){return this.noticeDialog.active||this.loadingOverlay?.active||this.presenting||!!this.picker()?.active||this.find(this.roomMenu(),'Board')!.active||!!this.app.getChildByName('Help')?.active||this.find(this.menu,'UI_Menu_Board_Mask')!.active;}
    private botTurn=()=>{if(!this.round||this.round.phase==='ended'||this.paused())return;if(this.round.turn!==0||this.round.seats[0].dropped){this.round.bot();this.afterAction();}};
    update(dt:number){
        if(this.loadingOverlay?.active){const spinner=this.loadingOverlay.getChildByName('Spinner')!;if(spinner.active)spinner.angle=(spinner.angle-240*dt)%360;}
        const r=this.round;if(!r||r.phase==='ended'||this.paused())return;
        this.turnTime=Math.max(0,this.turnTime-dt);
        const p=this.find(this.players()[r.turn],'TimeProgressBar')?.getComponent(ProgressBar);if(p)p.progress=this.turnTime/30;
        if(r.turn===0&&this.turnTime===0){r.timeout();this.turnTime=30;this.afterAction();}
    }
    private dragMove(index:number,e:EventTouch){
        if(!this.drag||this.drag.index!==index||!this.canArrange())return;
        const n=this.cards[index],p=e.getUILocation(),local=n.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
        const start=e.getUIStartLocation();if(Math.abs(p.x-start.x)+Math.abs(p.y-start.y)>12)this.drag.moved=true;
        if(this.drag.moved){n.setPosition(local.x,Math.max(0,local.y),0);n.setSiblingIndex(n.parent!.children.length-1);}
    }
    private dragEnd(index:number,e:EventTouch){
        if(!this.canArrange())return;const r=this.round!,card=r.seats[0].hand[index];if(!card)return;
        if(this.drag?.moved){
            const p=e.getUILocation(),open=this.find(this.table,'DiscardCards')!.getComponent(UITransform)!;
            if(r.phase==='discard'&&open.getBoundingBoxToWorld().contains(p)){this.selected.clear();this.selected.add(card.id);this.discard();}
            else {const target=this.cards.filter((n,i)=>i!==index&&n.active).sort((a,b)=>Math.abs(a.worldPosition.x-p.x)-Math.abs(b.worldPosition.x-p.x))[0];
                if(target){const targetCard=r.seats[0].hand[this.cards.indexOf(target)];if(targetCard)r.move(card.id,targetCard.id);}this.selected.clear();}
        }else if(this.selected.has(card.id))this.selected.delete(card.id);else this.selected.add(card.id);
        this.drag=null;this.render();
    }
    private cardFace(n:Node,c:Card){
        const red=c.suit===1||c.suit===2,number=this.find(n,'Base_Poker_Black_FNT')?.getComponent(Sprite);
        if(number){number.node.active=c.rank!==0;number.spriteFrame=(red?this.redRanks:this.blackRanks)[(c.rank||14)-1];}
        const small=this.find(n,'Base_Poker_Small')?.getComponent(Sprite);if(small){small.spriteFrame=this.suits[c.suit%4];small.node.active=c.rank!==0;}
        // Original Card.setCardType assigns a portrait only for J/Q/K (number cards have no large suit).
        const art=this.find(n,'Base_Poker_Club')?.getComponent(Sprite);if(art){art.node.active=c.rank===0||c.rank>10;art.spriteFrame=c.rank===0?this.portraits[6]:c.rank>10?this.portraits[(red?3:0)+c.rank-11]:null;}
        const joker=this.find(n,'Base_Poker_Red_FNT_14')?.getComponent(Sprite);if(joker){joker.node.active=c.rank===0;joker.spriteFrame=this.blackRanks[13];}
        this.toggle(n,'Base_Poker_Back',false);this.toggle(n,'Base_Declare_Info',false);this.toggle(n,'Base_Card_Crown',c.rank===0||c.rank===this.round?.wildRank);
    }
    private saveBalance(){sys.localStorage.setItem('rummyB.offline.balance',String(this.balance));}
    private async showResult(){
        const round=this.round,token=this.presentationToken;
        if(!this.result)this.showLoading('ResultView');
        try { await this.panel('ResultView'); } catch(e){if(this.round===round)this.loadFailed(()=>this.showResult(),e);return;}
        if(!round||this.round!==round||token!==this.presentationToken||!isValid(this.node))return;
        this.clearMessage();
        const r=this.round!;this.hand.active=false;this.result.active=true;this.setMenu(false);
        const board=this.result.getChildByName('ResultBoard')!;
        for(const n of board.children){if(/Win/.test(n.name))n.active=r.winner===0;else if(/Lose/.test(n.name))n.active=r.winner!==0;}
        const rows=[this.result.getChildByName('PlayerResult')!,...this.result.getChildByName('OtherPlayerResultGroup')!.children];
        rows.forEach((row,i)=>{
            const seat=r.seats[i];row.active=true;const opacity=row.getComponent(UIOpacity);if(opacity)opacity.opacity=255;
            this.text(row,'PlayerName',i?'CPU '+i:'YOU');const avatar=this.find(row,'Avatar')?.getComponent(Sprite);if(avatar)avatar.spriteFrame=i?this.avatars[i]:this.ownAvatar();
            this.text(row,'Points',String(-seat.penalty));this.text(row,'ActualWin',(r.deltas[i]>0?'+':'')+r.deltas[i]);this.text(row,'TotalWin',seat.dropped?'DROP':i===r.winner?'WIN':'');
            this.toggle(row,'Base_FS_Lose_MSG',i!==r.winner);
            const group=row.getChildByName('CardGroup')!;group.children.forEach((n,j)=>{n.active=j<seat.hand.length;if(n.active)this.cardFace(n,seat.hand[j]);});
        });
        const name=r.winner===0?'Base_Result_Win':'Base_Result_Lose';this.playClip(this.result,name);
        if(r.winner===0){const token=this.presentationToken;this.scheduleOnce(()=>{if(token===this.presentationToken&&this.result.active)this.playClip(this.result,'Base_Result_WinLoop');},1);}
    }
    private render(){const r=this.round;if(!r)return;const hand=r.seats[0].hand,groups=r.seats[0].groups;
        const key=r.turn+':'+r.phase;if(key!==this.phaseKey){this.phaseKey=key;this.turnTime=30;}
        const gaps=Math.max(0,groups.length-1)*22,step=Math.min(78,(1180-114-gaps)/Math.max(1,hand.length-1));let offset=0;
        const width=(hand.length-1)*step+gaps;
        this.cards.forEach((n,i)=>{n.active=i<hand.length;if(!n.active)return;if(i&&groups.some(g=>g[0]===hand[i].id))offset+=22;
            n.setSiblingIndex(i);n.setPosition(-width/2+i*step+offset,this.selected.has(hand[i].id)?28:0,0);this.cardFace(n,hand[i]);});
        const open=this.find(this.table,'DiscardCards')!;if(r.pile.length)this.cardFace(open,r.pile[r.pile.length-1]);
        this.cardFace(this.find(this.table,'WildJokerCard')!,r.indicator);this.text(this.table,'Base_RestCard_FNT',String(r.stock.length));
        const active=this.canArrange(),canDiscard=active&&r.phase==='discard'&&this.selected.size===1;
        const canDeclare=active&&r.canDeclare(r.phase==='discard'?Array.from(this.selected)[0]:undefined);
        const buttons:Record<string,boolean>={DropButton:active,AutoSortButton:active,DumpButton:canDiscard&&!canDeclare,GroupButton:active&&this.selected.size>1,DeclareButton:canDeclare};
        for(const [name,on]of Object.entries(buttons)){const n=this.hand.getChildByName(name)!;n.active=on;const b=n.getComponent(Button);if(b)b.interactable=on;}
        const drop=this.hand.getChildByName('DropButton')!,penalty=r.seats[0].draws?40:20;
        this.text(drop,'PointNum','(-'+penalty+')');this.text(drop,'Label-001',String(penalty*r.perPoint));this.toggle(drop,'Base_Drop_Red_BTN',penalty===40);
        const bubbles=this.find(this.table,'BubbleMsgView')!;bubbles.children.forEach(n=>n.active=false);
        this.toggle(bubbles,'PickCardMsg',active&&r.phase==='draw');this.toggle(bubbles,'DiscardButtonMsg',canDiscard&&!canDeclare);this.toggle(bubbles,'GroupButtonMsg',active&&this.selected.size>1);
        this.toggle(this.table,'CardPile_FX',active&&r.phase==='draw');this.toggle(this.table,'DiscardCards_FX',active&&r.phase==='draw'&&r.canDrawOpen);
        this.players().forEach((n,i)=>{this.toggle(n,'TimeProgressBar',!this.presenting&&r.phase!=='ended'&&r.turn===i);this.toggle(n,'OtherWINGlow',false);this.toggle(n,'Base_Crown',false);this.toggle(n,'Base_Other_Win_Board',false);this.toggle(n,'Base_Drop_Black',r.seats[i].dropped);this.toggle(n,'Points',i===0);this.toggle(n,'Credits',i===0);this.text(n,'Credit',this.balance.toLocaleString());if(i===0)this.text(n,'PointNum',String(analyze(hand,r.wildRank).score));});
        if(r.phase==='ended'&&!this.settled){this.settled=true;this.balance=Math.max(0,this.balance+r.deltas[0]);this.saveBalance();this.finishRound();}
    }
}
