import { _decorator, Component, Node, Sprite, SpriteFrame, Label, Button, Color, tween, Tween, Vec3, sys, AudioClip, AudioSource, input, Input, EventKeyboard, KeyCode, view, ResolutionPolicy, Prefab, instantiate, sp, Animation, UIOpacity } from 'cc';
import { reelFrame, reelStop, REEL } from './ReelMotion';
import { CloverLoading, LoadItem } from './CloverLoading';
import { SYMBOL_PATHS, CARD_PATHS } from './LoadingAssets';
import { LINES, evaluate, makeBoard, newBonus, revealCard, BonusState } from './SlotRules';
const { ccclass, property } = _decorator;
const STORE = 'clover-slot-local-v1';
@ccclass('CloverApp')
export class CloverApp extends Component {
    @property(Node) gameRoot: Node = null!;
    private dialogRoot: Node = null!;
    private bonusRoot: Node = null!;
    @property([SpriteFrame]) symbols: SpriteFrame[] = [];
    private cardFaces: SpriteFrame[] = [];
    private sounds: AudioClip[] = [];
    private soundNames: string[] = [];
    private symbolPrefabs: Prefab[] = [];
    private linePrefab: Prefab = null!;
    private flyPrefab: Prefab = null!;
    private belt: {node:Node,col:number,row:number,wrap:number}[] = [];
    private rolling: {time:number,board:number[],turbo:boolean,resolve:()=>void,stops:Set<number>,stopOverride?:number} | null = null;
    private effectEpoch = 0;
    private cardBusy = false;
    private balance = 10000;
    private bets = [10,20,50,100,200,500];
    private betIndex = 3;
    private muted = false;
    private turbo = false;
    private auto = 0;
    private busy = false;
    private cells: Node[] = [];
    private positions: Vec3[] = [];
    private history: string[] = [];
    private music: AudioSource = null!;
    private fx: AudioSource = null!;
    private reelAudio: AudioSource = null!;
    private bonus: BonusState = newBonus();
    private bonusReward = 0;
    private keyHeld = false;
    private readonly keyDown = (event:EventKeyboard) => {
        if(event.keyCode !== KeyCode.SPACE || this.keyHeld) return;
        this.keyHeld = true;
        if(!this.dialogRoot?.active && !this.bonusRoot?.active && !CloverLoading.instance.active) this.spin();
    };
    private readonly keyUp = (event:EventKeyboard) => {if(event.keyCode===KeyCode.SPACE)this.keyHeld=false;};
    private find(root:Node,name:string):Node {
        if(root.name===name)return root;
        for(const n of root.children){const found=this.search(n,name);if(found)return found;}
        throw new Error('Missing authored node '+name);
    }
    private search(n:Node,name:string):Node|null {if(n.name===name)return n;for(const child of n.children){const found=this.search(child,name);if(found)return found;}return null;}
    private label(root:Node,name:string,value:string){this.find(root,name).getComponent(Label)!.string=value;}
    private on(root:Node,name:string,fn:()=>void){this.find(root,name).on(Button.EventType.CLICK,()=>{if(CloverLoading.instance.active)return;console.info('[Clover] click',name);fn();},this);}
    private money(v:number){return v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
    private get bet(){return this.bets[this.betIndex];}
    start(){
        console.info('[Clover] scene ready');
        view.setDesignResolutionSize(1136,640,ResolutionPolicy.SHOW_ALL);
        try {const saved=JSON.parse(sys.localStorage.getItem(STORE)||'null');if(saved){
            if(Number.isFinite(saved.balance)&&saved.balance>=0&&saved.balance<=1e12)this.balance=saved.balance;
            if(Number.isInteger(saved.betIndex)&&saved.betIndex>=0&&saved.betIndex<this.bets.length)this.betIndex=saved.betIndex;
            this.muted=!!saved.muted;this.history=Array.isArray(saved.history)?saved.history.filter((s:unknown)=>typeof s==='string').slice(0,15):[];
        }}catch(e){console.warn('Ignoring invalid local save',e);}
        const plate=this.find(this.gameRoot,'SlotPlate');
        for(let c=0;c<5;c++)for(let r=0;r<4;r++){const n=this.find(this.find(plate,'Reel'+c),'Cell'+r);this.cells.push(n);this.positions.push(n.position.clone());}
        for(let c=0;c<5;c++)for(let r=-1;r<5;r++)this.belt.push({node:this.find(this.find(plate,'Reel'+c),'Cell'+r),col:c,row:r,wrap:-1});
        this.belt.forEach(b=>{if(b.row<0||b.row>3)b.node.active=false;});
        this.music=this.node.addComponent(AudioSource);this.fx=this.node.addComponent(AudioSource);this.reelAudio=this.node.addComponent(AudioSource);
        this.on(this.gameRoot,'Spin',()=>this.spin());
        this.on(this.gameRoot,'BetDown',()=>this.changeBet(-1));this.on(this.gameRoot,'BetUp',()=>this.changeBet(1));
        this.on(this.gameRoot,'Turbo',()=>{this.turbo=!this.turbo;this.status(this.turbo?'TURBO ON':'TURBO OFF');this.updateHud();});
        this.on(this.gameRoot,'Auto',()=>{this.auto=this.auto?0:25;this.updateHud();if(this.auto&&!this.busy)this.spin();});
        this.on(this.gameRoot,'Settings',()=>this.openSettings());
        const qaMode=sys.isBrowser?new URLSearchParams(window.location.search).get('qa'):null;
        if(qaMode==='gallery')this.scheduleOnce(async()=>{while(CloverLoading.instance.active)await this.pause(.05);await this.prepareSpin();for(let i=0;i<20;i++)this.animate(this.symbolEffect(i,i%10).getComponentInChildren(sp.Skeleton)!,'Win',true);},.1);
        input.on(Input.EventType.KEY_DOWN,this.keyDown);input.on(Input.EventType.KEY_UP,this.keyUp);
        this.updateHud();
        if(sys.isBrowser&&new URLSearchParams(window.location.search).has('qa')){
            const data=[...this.gameRoot.getComponentsInChildren(sp.Skeleton).map(s=>s.skeletonData),...this.symbolPrefabs.map(p=>{const n=instantiate(p);const d=n.getComponentInChildren(sp.Skeleton)!.skeletonData;n.destroy();return d;})];
            for(const d of new Set(data))if(d){const runtime=d.getRuntimeData();for(const skin of runtime.skins)for(const entry of skin.getAttachments()){const attachment=entry.attachment as sp.spine.RegionAttachment;if(!attachment.path)console.info('[Clover] non-image attachment',d.name,entry.name);if(attachment.path&&!d.atlasText.split(/\r?\n/).includes(attachment.path))console.warn('[Clover] atlas missing',d.name,skin.name,attachment.path);}
            console.info('[Clover] catalog',d.name,JSON.stringify({animations:runtime.animations.map(a=>[a.name,a.duration]),skins:runtime.skins.map(s=>s.name)}));}
        }
    }
    private bindDialog(){
        this.on(this.dialogRoot,'Close',()=>{this.dialogRoot.active=false;});
        this.on(this.dialogRoot,'Help',()=>this.showRules());
        this.on(this.dialogRoot,'Paytable',()=>{this.label(this.dialogRoot,'Title','PAYTABLE');this.label(this.dialogRoot,'Body','Symbol                    3 / 4 / 5 in a line\nCherry / Lemon                5 / 15 / 40\nOrange / Plum                 8 / 20 / 50\nGrape / Melon               12 / 30 / 80\nBell                             15 / 40 / 100\nRed 7 / Wild                25 / 100 / 250\nAmounts × (total bet ÷ 100). Best match per line.');});
        this.on(this.dialogRoot,'Feature',()=>{this.dialogRoot.active=false;this.busy=true;this.auto=0;this.openBonus();this.updateHud();});
        this.on(this.dialogRoot,'Sound',()=>{this.muted=!this.muted;if(this.muted)this.music.stop();else this.startMusic();this.persist();this.updateHud();});
        this.on(this.dialogRoot,'History',()=>{this.label(this.dialogRoot,'Title','RECENT SPINS');this.label(this.dialogRoot,'Body',this.history.slice(0,9).join('\n')||'No spins yet');});
        this.on(this.dialogRoot,'Reset',()=>{this.balance=10000;this.history=[];this.betIndex=3;this.persist();this.updateHud();this.label(this.dialogRoot,'Title','BALANCE RESET');this.label(this.dialogRoot,'Body','Balance restored to 10,000.00.');});
    }
    private bindBonus(){
        for(let i=0;i<15;i++)this.on(this.bonusRoot,'Card'+i,()=>this.pick(i));
        this.on(this.bonusRoot,'Collect',()=>{this.bonusRoot.active=false;this.busy=false;this.animate(this.find(this.find(this.gameRoot,'Node_Character'),'Spine').getComponent(sp.Skeleton)!,'Lv1_Idle',true);this.music.stop();this.startMusic();this.clearEffects();this.updateHud();this.nextAuto();});
    }
    private async openSettings(){
        if(this.busy)return;
        this.busy=true;this.auto=0;this.updateHud();
        if(!this.dialogRoot)await CloverLoading.instance.load([{path:'panels/CloverDialog',type:Prefab}],assets=>{
            this.dialogRoot=instantiate(assets[0] as Prefab);this.node.addChild(this.dialogRoot);this.bindDialog();
        });
        this.dialogRoot.active=true;this.busy=false;this.showRules();this.updateHud();
    }
    private audioItems(names:string[]):LoadItem[]{return names.map(name=>({path:'audio/'+name,type:AudioClip}));}
    private cacheAudio(names:string[],clips:AudioClip[]){
        names.forEach((name,i)=>{if(!this.soundNames.includes(name)){this.soundNames.push(name);this.sounds.push(clips[i]);}});
    }
    private async prepareSpin(){
        if(this.linePrefab)return;
        const names=['BGM_MG','Reel_Spin','Reel_Rotating','Reel_Stop','Wild_Stop','Scatter_Stop01','Wild_Extension','Wild_Fly','Win_Small_01'];
        const paths=[...SYMBOL_PATHS,'effects/WaysRunEffect','effects/FXEffect','effects/Fx_Expand'];
        await CloverLoading.instance.load([...paths.map(path=>({path,type:Prefab})),...this.audioItems(names)],assets=>{
            this.symbolPrefabs=assets.slice(0,10) as Prefab[];this.linePrefab=assets[10] as Prefab;this.flyPrefab=assets[11] as Prefab;
            const expand=instantiate(assets[12] as Prefab);this.gameRoot.addChild(expand);
            this.cacheAudio(names,assets.slice(paths.length) as AudioClip[]);
        });
    }
    private async prepareBonus(){
        if(this.bonusRoot)return;
        const names=['BGM_MG','BGM_BG','BG_Start','BG_Card_Deal','BG_Card_Flip','BG_Card_Del','BG_Card_Flip_Multiplier_01','BG_Card_Flip_Multiplier_02','BG_Coins'];
        const items:LoadItem[]=[{path:'panels/CloverBonus',type:Prefab},{path:'effects/Node_BGDeclare',type:Prefab},...CARD_PATHS.map(path=>({path,type:SpriteFrame})),...this.audioItems(names)];
        await CloverLoading.instance.load(items,assets=>{
            this.bonusRoot=instantiate(assets[0] as Prefab);this.node.addChild(this.bonusRoot);
            this.gameRoot.addChild(instantiate(assets[1] as Prefab));this.cardFaces=assets.slice(2,9) as SpriteFrame[];
            this.cacheAudio(names,assets.slice(9) as AudioClip[]);this.bindBonus();
        });
    }
    private async prepareBigWin(){
        if(this.search(this.gameRoot,'Node_BigWin'))return;
        const names=['Win_Big','Win_Big_End'];
        await CloverLoading.instance.load([{path:'effects/Node_BigWin',type:Prefab},...this.audioItems(names)],assets=>{
            this.gameRoot.addChild(instantiate(assets[0] as Prefab));this.cacheAudio(names,assets.slice(1) as AudioClip[]);
        });
    }
    onDestroy(){input.off(Input.EventType.KEY_DOWN,this.keyDown);input.off(Input.EventType.KEY_UP,this.keyUp);for(const n of this.cells)Tween.stopAllByTarget(n);}
    private persist(){if(sys.isBrowser&&new URLSearchParams(window.location.search).has("qa"))return;try{sys.localStorage.setItem(STORE,JSON.stringify({balance:this.balance,betIndex:this.betIndex,muted:this.muted,history:this.history}));}catch(e){console.warn('Save unavailable',e);}}
    private status(value:string){this.label(this.gameRoot,'Status',value);}
    private updateHud(){
        this.label(this.gameRoot,'Balance',this.money(this.balance));this.label(this.gameRoot,'Bet',String(this.bet));
        this.label(this.find(this.gameRoot,'Auto'),'Label',this.auto?'STOP '+this.auto:'AUTO');
        this.find(this.gameRoot,'Turbo').getComponent(Sprite)!.color=this.turbo?new Color(255,215,70):Color.WHITE;
        for(const name of ['BetDown','BetUp','Settings'])this.find(this.gameRoot,name).getComponent(Button)!.interactable=!this.busy;
        this.find(this.gameRoot,'Spin').getComponent(Button)!.interactable=!this.busy||!!this.rolling;
        if(this.dialogRoot)this.label(this.find(this.dialogRoot,'Sound'),'Label',this.muted?'SOUND OFF':'SOUND ON');
        for(const [name,mult] of [['JP_Mini',5],['JP_Minor',20],['JP_Major',50],['JP_Grand',1000]] as [string,number][]){this.label(this.find(this.gameRoot,name),'Value',(this.bet*mult).toLocaleString('en-US'));}
    }
    private changeBet(delta:number){if(this.busy)return;this.betIndex=Math.max(0,Math.min(this.bets.length-1,this.betIndex+delta));this.updateHud();this.persist();}
    private play(name:string){if(this.muted)return;const i=this.soundNames.indexOf(name);if(i>=0)this.fx.playOneShot(this.sounds[i],.65);}
    private startMusic(){if(this.muted||this.music.playing)return;const i=this.soundNames.indexOf('BGM_MG');if(i>=0){this.music.clip=this.sounds[i];this.music.loop=true;this.music.volume=.25;this.music.play();}}
    private async pause(seconds:number){return new Promise<void>(resolve=>this.scheduleOnce(resolve,seconds));}
    private async spin(){
        if(this.rolling){const run=this.rolling;const start=run.turbo?0:REEL.rise*5;run.stopOverride??=(Math.ceil(Math.max(0,run.time-start)/REEL.cycle)+1)*REEL.cycle;this.status('STOPPING REELS');return;}
        if(this.busy||CloverLoading.instance.active||this.dialogRoot?.active||this.bonusRoot?.active)return;
        if(this.balance<this.bet){this.auto=0;this.status('Not enough balance · reset in Settings');this.updateHud();return;}
        this.busy=true;this.updateHud();
        await this.prepareSpin();
        if(this.auto)this.auto--;const bet=this.bet;
        this.balance=Math.round((this.balance-bet)*100)/100;this.persist();this.label(this.gameRoot,'Win','0.00');this.status('GOOD LUCK!');this.updateHud();this.startMusic();this.play('Reel_Spin');
        for(const n of this.cells){Tween.stopAllByTarget(n);n.setScale(1,1,1);n.getComponent(Sprite)!.color=Color.WHITE;}
        const qa=sys.isBrowser?new URLSearchParams(window.location.search).get("qa"):null;
        const board=qa==="wild"?[0,1,2,3,4,9,5,6,0,1,9,3,4,5,6,9,0,1,2,3]:qa?.startsWith("symbol")?Array(20).fill(Number(qa.slice(6))):makeBoard();const result=evaluate(board,bet);
        this.clearEffects();
        await this.roll(board);
        if(result.wildColumns.length){
            this.status('CLOVER WILD · EXPANDING REELS');this.play('Wild_Extension');
            await this.expandWild(board,result.wildColumns);
        }
        if(result.total>0){
            this.balance=Math.round((this.balance+result.total)*100)/100;
            this.label(this.gameRoot,'Win',this.money(result.total));this.updateHud();
            this.status(result.wins.length+' WINNING LINES');this.play('Win_Small_01');
            const epoch=this.effectEpoch;
            this.winLines(result.expanded,result.wins,epoch);
            if(result.total>=bet*6)await this.bigWin(result.total,bet);
            else await this.pause(this.turbo?.35:1);
        }else this.status('SPIN AGAIN · 100 LINES');
        this.history.unshift('Bet '+bet+'  |  Win '+this.money(result.total)+'  |  Balance '+this.money(this.balance));this.history=this.history.slice(0,15);this.persist();
        if(result.bonus){
            this.auto=0;this.clearEffects();
            board.forEach((symbol,index)=>{if(symbol===8)this.animate(this.symbolEffect(index,8).getComponentInChildren(sp.Skeleton)!,'Win',true);});
            await this.pause(1.5);this.openBonus();this.updateHud();return;
        }
        this.busy=false;this.updateHud();this.nextAuto();
    }
    private nextAuto(){if(this.auto>0)this.scheduleOnce(()=>{if(this.auto>0)this.spin();},this.turbo?.25:1.2);}
    private async openBonus(){
        this.busy=true;this.clearEffects();this.updateHud();
        await this.prepareBonus();
        this.play('BG_Start');
        const character=this.find(this.find(this.gameRoot,'Node_Character'),'Spine').getComponent(sp.Skeleton)!;
        this.animate(character,'Win_Start');
        await this.showSpinePanel(this.gameRoot,'Node_BGDeclare','BG_Declare_L');
        this.animate(character,'Win_Loop',true);
        this.clearEffects();this.bonusRoot.active=true;this.bonus=newBonus();if(sys.isBrowser&&new URLSearchParams(window.location.search).get("qa")==="cards")this.bonus.deck=[4,5,6,0,1,2,3,0,1,2,3,0,1,2,3];this.bonusReward=0;this.cardBusy=false;
        this.music.stop();const bg=this.soundNames.indexOf('BGM_BG');if(!this.muted&&bg>=0){this.music.clip=this.sounds[bg];this.music.play();}this.play('BG_Card_Deal');
        this.label(this.bonusRoot,'Title','CLOVER CARD BONUS');this.label(this.bonusRoot,'Progress','Collect 3 matching suits to win a prize');this.find(this.bonusRoot,'Collect').active=false;
        for(let i=0;i<15;i++){
            const n=this.find(this.bonusRoot,'Card'+i);n.getComponent(Button)!.interactable=true;
            const art=this.find(n,'CardArt');this.playClip(art,'Idle');
            this.find(art,'SelectSymbol').getComponent(Sprite)!.spriteFrame=this.cardFaces[0];
        }
    }
    private async pick(i:number){
        if(this.cardBusy)return;
        const changed=revealCard(this.bonus,i);if(!changed.length)return;
        this.cardBusy=true;
        const face=this.bonus.deck[i];this.play(face===4?'BG_Card_Flip_Multiplier_01':face===5?'BG_Card_Flip_Multiplier_02':face===6?'BG_Card_Del':'BG_Card_Flip');
        await Promise.all(changed.map(async k=>{
            const n=this.find(this.bonusRoot,'Card'+k);n.getComponent(Button)!.interactable=false;
            const art=this.find(n,'CardArt');this.find(art,'SelectSymbol').getComponent(Sprite)!.spriteFrame=this.cardFaces[this.bonus.deck[k]];
            await this.clip(art,k!==i?'Remove':'Open_Start');
            if(!(this.bonus.clubRemoved&&this.bonus.deck[k]===3))this.playClip(art,'Open_Loop');
        }));
        const c=this.bonus.counts;
        this.label(this.bonusRoot,'Progress','♠ '+c[0]+'/3    ♥ '+c[1]+'/3    ♦ '+c[2]+'/3    ♣ '+(this.bonus.clubRemoved?'REMOVED':c[3]+'/3')+'     PRIZE ×'+this.bonus.multiplier);
        if(this.bonus.winner>=0){
            this.bonusReward=this.bet*[1000,50,20,5][this.bonus.winner]*this.bonus.multiplier;this.balance+=this.bonusReward;
            this.label(this.bonusRoot,'Title','BONUS WIN  '+this.money(this.bonusReward));
            for(let k=0;k<15;k++){
                const n=this.find(this.bonusRoot,'Card'+k);n.getComponent(Button)!.interactable=false;
                if(this.bonus.picked.includes(k)&&this.bonus.deck[k]===this.bonus.winner){
                    const art=this.find(n,'CardArt');this.clip(art,'Win_Start').then(()=>this.playClip(art,'Win_Loop'));
                }
            }
            this.history.unshift('Card bonus +'+this.money(this.bonusReward));this.persist();this.updateHud();this.label(this.gameRoot,'Win',this.money(this.bonusReward));
            const jp=this.find(this.gameRoot,['JP_Grand','JP_Major','JP_Minor','JP_Mini'][this.bonus.winner]);
            const fx=this.find(jp,'JPBroad_Fx');fx.active=true;this.animate(fx.getComponent(sp.Skeleton)!,'JP_Win',true);
            this.play('BG_Coins');
            await this.showSpinePanel(this.bonusRoot,'Node_Compliment','Start',this.bonus.multiplier===10?'All':this.bonus.multiplier===5?'X5':this.bonus.multiplier===2?'X2':'default');
            this.find(this.bonusRoot,'Collect').active=true;
        }
        this.cardBusy=false;
    }
    update(dt:number){
        const run=this.rolling;if(!run)return;run.time+=dt;
        for(const b of this.belt){
            const frame=reelFrame(run.time,b.col,b.row,run.turbo,run.stopOverride);
            b.node.setPosition(0,frame.y,0);
            if(frame.wrap!==b.wrap){
                b.wrap=frame.wrap;
                b.node.getComponent(Sprite)!.spriteFrame=this.symbols[frame.final&&b.row>=0&&b.row<4?run.board[b.col*4+b.row]:Math.floor(Math.random()*8)];
            }
            if(frame.wrap===100&&!run.stops.has(b.col)){
                run.stops.add(b.col);const column=run.board.slice(b.col*4,b.col*4+4);
                this.play(column.includes(9)?'Wild_Stop':column.includes(8)?'Scatter_Stop01':'Reel_Stop');
                console.info('[Clover] reel stopped',b.col,run.time.toFixed(3));
            }
        }
        if(run.time>= (run.turbo?0:REEL.rise*5)+Math.min(reelStop(4,run.turbo),run.stopOverride??Infinity)+REEL.buffer*2){
            this.rolling=null;this.reelAudio.stop();this.updateHud();this.belt.forEach(b=>{b.node.active=b.row>=0&&b.row<4;});run.resolve();
        }
    }
    private roll(board:number[]){
        const sound=this.soundNames.indexOf('Reel_Rotating');if(!this.muted&&sound>=0){this.reelAudio.clip=this.sounds[sound];this.reelAudio.loop=true;this.reelAudio.volume=.35;this.reelAudio.play();}
        this.belt.forEach(b=>{b.wrap=-1;b.node.active=true;});
        return new Promise<void>(resolve=>{this.rolling={time:0,board,turbo:this.turbo,resolve,stops:new Set()};this.updateHud();});
    }
    private clearEffects(){
        this.effectEpoch++;
        const root=this.find(this.gameRoot,'SymbolEffects');for(const n of [...root.children])n.destroy();
        this.cells.forEach(n=>{n.getComponent(Sprite)!.enabled=true;n.getComponent(Sprite)!.color=Color.WHITE;});
        for(const x of this.gameRoot.getComponentsInChildren(sp.Skeleton))if(['JPBroad_Fx','JPBroad_Collect'].includes(x.node.name))x.node.active=false;
    }
    private animate(skeleton:sp.Skeleton,name:string,loop=false){
        skeleton.node.active=true;
        const entry=skeleton.setAnimation(0,name,loop);
        if(!entry)throw new Error('Missing Spine animation '+name+' on '+skeleton.node.name);
        console.info('[Clover] Spine',skeleton.skeletonData?.name,name);
        return entry.animation.duration;
    }
    private playClip(node:Node,name:string){
        const anim=node.getComponent(Animation)!;
        const clip=anim.clips.find(c=>c&&(c.name===name||c.name.startsWith(name+'_')));
        if(!clip)throw new Error('Missing card clip '+name);
        anim.play(clip.name);return anim.getState(clip.name)!;
    }
    private async clip(node:Node,name:string){
        const state=this.playClip(node,name);
        console.info('[Clover] clip',name);await this.pause(state.duration);
    }
    private symbolEffect(index:number,symbol:number){
        const n=instantiate(this.symbolPrefabs[symbol]);this.find(this.gameRoot,'SymbolEffects').addChild(n);
        n.setPosition(-289.2+Math.floor(index/4)*144.6,153.75-index%4*102.5,0);
        this.cells[index].getComponent(Sprite)!.enabled=false;
        return n;
    }
    private async expandWild(board:number[],columns:number[]){
        const root=this.find(this.gameRoot,'SymbolEffects');
        const jobs=columns.map(async col=>{
            const row=board.slice(col*4,col*4+4).indexOf(9);
            const nodes:Node[]=[];let duration=0;
            for(let r=0;r<4;r++){
                const n=this.symbolEffect(col*4+r,9);nodes.push(n);const sk=n.getComponentInChildren(sp.Skeleton)!;
                sk.setSkin(r===row?['Action_Down','Action_Mid','Action_Mid','Action_Top'][row]:board[col*4+r]<8?'Symbol_0'+board[col*4+r]:'default');
                duration=Math.max(duration,this.animate(sk,r===row?'Action':'Expand'));
            }
            if(col>0&&col<4){
                const fx=this.find(this.gameRoot,'Fx_Expand');fx.active=true;
                const sk=this.find(fx,'R'+(col+1)).getComponent(sp.Skeleton)!;
                duration=Math.max(duration,this.animate(sk,'Action_'+(row===0?1:row===3?3:2)));
                this.scheduleOnce(()=>{sk.node.active=false;},duration);
            }
            await this.pause(duration);
            nodes.forEach((n,r)=>{n.destroy();this.cells[col*4+r].getComponent(Sprite)!.spriteFrame=this.symbols[9];this.cells[col*4+r].getComponent(Sprite)!.enabled=true;});
            const fly=instantiate(this.flyPrefab);root.addChild(fly);fly.setPosition(-289.2+col*144.6,153.75-row*102.5,0);
            this.playClip(fly,'FX_Fly_N');
            this.play('Wild_Fly');
            await new Promise<void>(resolve=>tween(fly).to(.55,{position:new Vec3(2,240,0),scale:new Vec3(.2,.2,1)},{easing:'quadIn'}).call(()=>{fly.destroy();resolve();}).start());
        });
        await Promise.all(jobs);
        const character=this.find(this.find(this.gameRoot,'Node_Character'),'Spine').getComponent(sp.Skeleton)!;
        const duration=this.animate(character,'T1_Collect');await this.pause(duration);this.animate(character,'Lv1_Idle',true);
    }
    private async winLines(board:number[],wins:{line:number,cells:number[],amount:number}[],epoch:number){
        let cursor=0;
        while(epoch===this.effectEpoch&&this.isValid){
            const win=wins[cursor++%wins.length];const active=new Set(win.cells),nodes:Node[]=[];
            this.cells.forEach((n,i)=>{n.getComponent(Sprite)!.color=active.has(i)?Color.WHITE:new Color(100,110,105);});
            for(const index of win.cells){const n=this.symbolEffect(index,board[index]);nodes.push(n);this.animate(n.getComponentInChildren(sp.Skeleton)!,'Win',true);}
            const line=instantiate(this.linePrefab);this.find(this.gameRoot,'SymbolEffects').addChild(line);nodes.push(line);line.setPosition(0,0,0);
            const skeleton=line.getComponent(sp.Skeleton)!;
            const points=LINES[win.line].map(i=>new Vec3(-289.2+Math.floor(i/4)*144.6,153.75-i%4*102.5,0));
            points.unshift(new Vec3(-361.5,points[0].y));points.push(new Vec3(361.5,points[points.length-1].y));
            points.forEach((p,i)=>{const bone=skeleton.findBone('HP_'+i);if(bone){bone.x=p.x;bone.y=p.y;}});
            this.animate(skeleton,'WinLine');this.status('LINE '+(win.line+1)+' · '+this.money(win.amount));
            await this.pause(1.5);
            if(epoch!==this.effectEpoch)return;
            nodes.forEach(n=>n.destroy());this.cells.forEach(n=>n.getComponent(Sprite)!.enabled=true);
        }
    }
    private async showSpinePanel(parent:Node,name:string,animation:string,skin?:string){
        const root=this.find(parent,name);root.active=true;
        root.getComponentsInChildren(Label).forEach(l=>{if(l.node.name!=='AwardAmount')l.node.active=false;});
        const sk=root.getComponentInChildren(sp.Skeleton)!;if(skin)sk.setSkin(skin);
        const label=this.search(root,'AwardAmount');if(label)label.getComponent(Label)!.string=this.money(this.bonusReward);
        await this.pause(this.animate(sk,animation));root.active=false;
    }
    private async bigWin(amount:number,bet:number){
        await this.prepareBigWin();
        const root=this.find(this.gameRoot,'Node_BigWin');root.active=true;
        // Old imported bitmap labels require the original controller; the HUD holds the counter.
        root.getComponentsInChildren(Label).forEach(l=>{if(l.node.name!=='AwardAmount')l.node.active=false;});
        const sk=root.getComponentInChildren(sp.Skeleton)!;
        const level=amount>=bet*30?'SuperWin':amount>=bet*15?'MegaWin':'BigWin';
        this.play('Win_Big');const duration=this.animate(sk,level+'_Start');
        const counter={value:0};tween(counter).to(duration,{value:amount},{onUpdate:()=>this.label(root,'AwardAmount',this.money(counter.value))}).start();
        await this.pause(duration);this.label(root,'AwardAmount',this.money(amount));
        this.play('Win_Big_End');await this.pause(this.animate(sk,level+'_End'));root.active=false;
    }
    private showRules(){
        this.label(this.dialogRoot,'Title','100 BLAZING CLOVER · RULES');
        this.label(this.dialogRoot,'Body','5 reels × 4 rows · 100 original paylines\nMatch 3 or more from the leftmost reel.\nClover WILD expands to fill its reel and substitutes symbols.\n3 ladybugs: collect 3 matching suits in the card bonus.\n♠ 1000×   ♥ 50×   ♦ 20×   ♣ 5× total bet\n×2 / ×5 multiply prizes · REMOVE clears all clubs.\nCredits have no cash value.');
    }
}
