import {_decorator,Component,Node,Button,Label,Sprite,sys,profiler,view,ResolutionPolicy,CCFloat,AudioSource,Prefab,resources,instantiate,isValid} from 'cc';
import {TableController} from './TableController';
import {GameSave,loadSave,storeSave,nativeSaveBridge} from './GameSave';
import {DEBUG} from 'cc/env';
const {ccclass,property}=_decorator;
@ccclass('RummyApp')
export class RummyApp extends Component {
    @property(Node) loadingOverlay:Node=null!;
    @property(Node) lobby:Node=null!;
    @property(TableController) table:TableController=null!;
    @property([Node]) rooms:Node[]=[];
    @property([CCFloat]) perPoint:number[]=[1,2,5,10,20];
    @property(Label) wallet:Label=null!;
    @property(AudioSource) music:AudioSource=null!;
    @property(AudioSource) effects:AudioSource=null!;
    @property(Node) musicOn:Node=null!;
    @property(Node) musicOff:Node=null!;
    @property(Node) soundOn:Node=null!;
    @property(Node) soundOff:Node=null!;
    @property(Node) helpButton:Node=null!;
    @property(Node) recordButton:Node=null!;
    @property(Node) infoPanel:Node=null!;
    @property(Label) infoTitle:Label=null!;
    @property(Label) infoText:Label=null!;
    @property(Node) closeInfo:Node=null!;
    @property(Node) testWin:Node=null!;
    @property(Node) testLose:Node=null!;
    @property(Sprite) lobbyAvatar:Sprite=null!;
    @property(Label) lobbyName:Label=null!;
    private save:GameSave=null!;
    private balance=10000;
    private musicEnabled=true;
    private soundEnabled=true;
    private records:{time:string;delta:number;balance:number}[]=[];
    private loading=false;
    private retryRoom:number|null=null;
    private avatarLoading=false;
    private avatarReady=false;
    private musicLoad:Promise<void>|null=null;
    onLoad(){
        if(DEBUG)this.node.on(Node.EventType.TOUCH_END,(event)=>{const canvas=document.getElementById('GameCanvas');if(canvas)canvas.dataset.rummyTarget=event.target?.name+' / '+event.target?.parent?.name;},this,true);
        view.setDesignResolutionSize(1136,640,ResolutionPolicy.SHOW_ALL);
        profiler.hideStats();this.save=loadSave(sys.localStorage,nativeSaveBridge());
        this.balance=this.save.balance;this.records=this.save.records;
        this.musicEnabled=this.save.music;this.soundEnabled=this.save.sound;
        this.lobbyName.string=this.save.player.name;
        this.persist();
        [this.musicOn,this.musicOff].forEach(n=>n.on(Button.EventType.CLICK,()=>{this.musicEnabled=!this.musicEnabled;this.persist();this.audioState();}));
        [this.soundOn,this.soundOff].forEach(n=>n.on(Button.EventType.CLICK,()=>{this.soundEnabled=!this.soundEnabled;this.persist();this.audioState();}));
        this.helpButton.on(Button.EventType.CLICK,()=>this.info('How to Play','Draw one card, then discard one card.\nSelect multiple cards and press Group. Drag a card to change its group or order.\nA declaration needs all 13 cards in valid melds, with at least two sequences and one pure sequence.\nA pure sequence uses consecutive ranks of one suit. Other sequences and sets may use wild cards.\nFirst drop: 20 points. Drop after drawing: 40. Invalid declaration: 80.\nA = 10 points. J, Q and K = 10. Wild cards = 0. Maximum loss = 80 points.'));
        this.recordButton.on(Button.EventType.CLICK,()=>this.info('Round History',this.records.length?this.records.slice(-10).reverse().map(r=>`${r.time}    ${r.delta>0?'+':''}${r.delta}    ${r.balance}`).join('\n'):'No completed rounds yet.'));
        this.closeInfo.on(Button.EventType.CLICK,()=>this.infoPanel.active=false);
        this.rooms.forEach((room,i)=>room.on(Button.EventType.CLICK,()=>this.enterRoom(i)));
        this.loadingOverlay.on(Node.EventType.TOUCH_END,()=>{if(this.retryRoom!==null)this.enterRoom(this.retryRoom);},this);
        this.node.on(Node.EventType.TOUCH_END,()=>{this.audioState();this.loadAvatar();},this,true);
        this.testWin.active=false;this.testLose.active=false;
        this.audioState(false);
        this.showLobby();
    }
    start(){this.scheduleOnce(()=>{this.loadMusic();this.loadAvatar();},.25);}
    update(dt:number){
        if(this.loadingOverlay.active&&this.loading){const spinner=this.loadingOverlay.getChildByName('Spinner')!;spinner.angle=(spinner.angle-240*dt)%360;}
    }
    private loadAvatar(){
        if(this.avatarReady||this.avatarLoading)return;
        this.avatarLoading=true;
        resources.load('deferred/Avatar'+this.save.player.avatar,Prefab,(error,prefab)=>{
            this.avatarLoading=false;if(!isValid(this.node))return;
            if(error){console.warn('Lobby avatar could not load',error);return;}
            this.lobbyAvatar.node.addChild(instantiate(prefab));this.avatarReady=true;
        });
    }
    private loadMusic(){
        if(this.music.clip||this.musicLoad)return;
        this.musicLoad=new Promise<void>((resolve,reject)=>resources.load('deferred/LobbyMusic',Prefab,(error,prefab)=>{
            if(error){reject(error);return;}
            if(isValid(this.node)){const source=prefab.data.getComponent(AudioSource)!;this.music.loop=source.loop;this.music.clip=source.clip;this.audioState();}
            resolve();
        })).catch(error=>{console.warn('Lobby music could not load',error);}).finally(()=>{this.musicLoad=null;});
    }
    private async enterRoom(index:number){
        if(this.loading)return;
        const point=this.perPoint[index];
        if(this.balance<point*80){this.info('Room Entry',`This room requires ${point*80} local chips.`);return;}
        this.retryRoom=null;this.loading=true;this.audioState();
        const label=this.loadingOverlay.getChildByName('LoadingLabel')!.getComponent(Label)!;
        if(!this.table){
            this.loadingOverlay.active=true;this.loadingOverlay.getChildByName('Spinner')!.active=true;label.string='Loading… 0%';
            let tableNode:Node|null=null;
            try {
                const prefab=await new Promise<Prefab>((resolve,reject)=>resources.load('deferred/RummyTable',Prefab,(finished,total)=>{
                    if(isValid(this.node))label.string=`Loading… ${total>0?Math.min(99,Math.floor(finished/total*100)):0}%`;
                },(error,asset)=>error?reject(error):resolve(asset)));
                if(!isValid(this.node))return;
                tableNode=instantiate(prefab);tableNode.active=false;this.node.addChild(tableNode);tableNode.setSiblingIndex(this.lobby.getSiblingIndex());
                this.table=tableNode.getComponent(TableController)!;this.effects=this.table.effects;
                this.table.localPlayer=this.save.player;this.table.getBalance=()=>this.balance;
                this.table.onLobby=()=>this.showLobby();
                this.table.onContinue=()=>{const point=this.table.round.perPoint;if(this.balance<point*80){this.showLobby();this.info('Room Entry',`This room requires ${point*80} local chips.`);}else this.table.begin(point);};
                this.table.onSettlement=(delta)=>{this.balance+=delta;this.records.push({time:new Date().toLocaleTimeString(),delta,balance:this.balance});this.records=this.records.slice(-30);this.persist();};
                label.string='Loading… 100%';
            }catch(error){
                tableNode?.destroy();this.table=null!;this.effects=null!;this.loading=false;
                if(!isValid(this.node))return;
                console.warn('Table could not load',error);this.retryRoom=index;
                this.loadingOverlay.getChildByName('Spinner')!.active=false;label.string='Unable to load\nTap to retry';return;
            }
        }
        this.loading=false;this.loadingOverlay.active=false;
        this.audioState();this.lobby.active=false;this.table.node.active=true;this.table.begin(point);
    }
    private persist(){Object.assign(this.save,{balance:this.balance,records:this.records,music:this.musicEnabled,sound:this.soundEnabled});storeSave(this.save,sys.localStorage,nativeSaveBridge());}
    private audioState(play=true){this.musicOn.active=this.musicEnabled;this.musicOff.active=!this.musicEnabled;this.soundOn.active=this.soundEnabled;this.soundOff.active=!this.soundEnabled;if(this.effects)this.effects.volume=this.soundEnabled?1:0;if(play&&!this.music.clip)this.loadMusic();if(this.musicEnabled&&play&&this.music.clip&&!this.music.playing)this.music.play();else if(!this.musicEnabled)this.music.stop();}
    private info(title:string,text:string){this.infoTitle.string=title;this.infoText.string=text;this.infoPanel.active=true;}
    private showLobby(){if(this.table)this.table.node.active=false;this.lobby.active=true;this.wallet.string=this.balance.toLocaleString('en-US');}
}
