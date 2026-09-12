import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Button, Prefab, instantiate, resources, AudioClip, AudioSource, sp, tween, Vec3, UITransform } from 'cc';
import { BETS, PAY, SYMBOLS, LINES, Save, Round, Step, begin, settle } from './CrownRules';
import { loadSave, storeSave, nativeSaveBridge } from './GameSave';
const { ccclass, property } = _decorator;
@ccclass('CrownGame')
export class CrownGame extends Component {
    @property([SpriteFrame]) uiIcons: SpriteFrame[]=[];
    @property([SpriteFrame]) symbols: SpriteFrame[]=[];
    @property([sp.SkeletonData]) symbolEffects: sp.SkeletonData[]=[];
    @property([AudioClip]) sounds: AudioClip[]=[];
    @property([String]) soundNames: string[]=[];
    private save!: Save;
    private busy=false;
    private panel: Node|null=null;
    private cache=new Map<string,Node>();
    private loadId=0;
    private retry: (()=>void)|null=null;
    private auto=0;
    private singleWinLimit:number|null=null;
    private lowerBalance:number|null=null;
    private upperBalance:number|null=null;
    private stopOnFeature=false;
    private rolling=false;
    private rollingTime=0;
    private rollFinish: (()=>void)|null=null;
    private rollStrips: number[][]=[];
    private rollDurations: number[]=[];
    private rollCycles: number[]=[];
    private rollTarget: number[]=[];
    private quickStop=false;
    private autoHeld=false;
    private autoHolding=false;
    private autoHoldTime=0;
    private stopped=0;
    private previousLocks=Array(5).fill(false) as boolean[];
    private audioStarted=false;
    private get(path:string,root=this.node):Node { const n=root.getChildByPath(path);if(!n)throw new Error('Missing authored node: '+path);return n; }
    private text(path:string,value:string,root=this.node){this.get(path,root).getComponent(Label)!.string=value;}
    private click(path:string,fn:()=>void,root=this.node){this.get(path,root).on(Button.EventType.CLICK,fn,this);}
    start(){
        this.save=loadSave(window.localStorage,nativeSaveBridge());
        this.audioStarted=true;this.music();
        this.click('Spin',()=>{if(this.busy){this.quickStop=true;this.auto=0;this.refresh();return;}this.spin();});
        this.click('BetButton',()=>this.betPanel());
        const auto=this.get('Auto');
        auto.on(Node.EventType.TOUCH_START,()=>{this.autoHolding=true;this.autoHeld=false;this.autoHoldTime=0;},this);
        auto.on(Node.EventType.TOUCH_END,()=>{this.autoHolding=false;},this);
        auto.on(Node.EventType.TOUCH_CANCEL,()=>{this.autoHolding=false;this.autoHeld=true;},this);
        this.click('Auto',()=>{if(this.autoHeld){this.autoHeld=false;return;}if(this.auto){this.stopAuto();return;}if(this.busy)return;this.auto=10;this.singleWinLimit=null;this.lowerBalance=null;this.upperBalance=null;this.stopOnFeature=false;this.spin();});
        this.click('Settings',()=>this.settingsPanel());
        this.click('Turbo',()=>{this.save.turbo=!this.save.turbo;this.persist();this.refresh();});
        this.click('Loading/Retry',()=>this.retry?.());this.click('Loading/Cancel',()=>{this.loadId++;this.get('Loading').active=false;this.retry=null;this.auto=0;this.refresh();});
        this.refresh();
        if(this.save.pending){this.busy=true;this.play(this.save.pending);}
        else if(!this.save.intro)this.open('CrownIntro',p=>{this.click('Close',()=>{this.save.intro=true;this.persist();this.close();},p);});
    }
    private persist(){storeSave(this.save,window.localStorage,nativeSaveBridge());}
    private refresh(){
        this.text('Balance',this.save.balance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}));this.text('Bet','Bet '+this.save.bet);
        this.get('Auto/Icon').getComponent(Sprite)!.spriteFrame=this.uiIcons[this.auto?1:0];
        this.get('Auto/Icon').getComponent(UITransform)!.setContentSize(this.auto?34:50,this.auto?34:46);
        this.get('Turbo/Icon').getComponent(Sprite)!.spriteFrame=this.uiIcons[this.save.turbo?3:2];
        this.text('AutoHint',this.auto?this.auto+' remaining':'Hold for setting');
        for(const name of ['BetButton','Settings'])this.get(name).getComponent(Button)!.interactable=!this.busy&&!this.auto;
    }
    private betPanel(){
        if(this.busy||this.auto)return;
        this.open('CrownBet',p=>{
            const buttons=p.getComponentsInChildren(Button).filter(b=>/^Bet\d+$/.test(b.node.name));
            for(const b of buttons){const value=Number(b.node.name.slice(3));const mark=b.node.getChildByName('selected');if(mark)mark.active=value===this.save.bet;
                b.node.on(Button.EventType.CLICK,()=>{this.save.bet=value;this.persist();this.close();this.refresh();},this);
            }
            this.click('Close',()=>this.close(),p);
        });
    }
    private sound(name:string){if(this.save.muted)return;const i=this.soundNames.indexOf(name);if(i>=0)this.getComponent(AudioSource)?.playOneShot(this.sounds[i],.55);}
    private music(){const a=this.getComponent(AudioSource)!;const i=this.soundNames.indexOf('BGM_MG');if(this.save.muted){a.stop();return;}if(i>=0&&this.audioStarted&&!a.playing){a.clip=this.sounds[i];a.loop=true;a.volume=.3;a.play();}}
    private spin(){
        if(this.busy||this.panel||this.get('Loading').active)return;
        const r=begin(this.save);if(!r){this.auto=0;this.text('Status','Insufficient balance. Choose a smaller bet.');this.refresh();return;}
        // Save the entire outcome before animation. Reload resumes it without charging again.
        this.persist();this.audioStarted=true;this.music();this.busy=true;this.refresh();this.play(r);
    }
    private pause(seconds:number){return new Promise<void>(resolve=>this.scheduleOnce(resolve,seconds));}
    private cell(i:number){return this.get('Reels/Cells/Cell'+i);}
    private showGrid(grid:number[]){grid.forEach((v,i)=>this.cell(i).getComponent(Sprite)!.spriteFrame=this.symbols[v]);}
    private clearEffects(){for(let i=0;i<15;i++){this.get('Highlight',this.cell(i)).active=false;this.get('WinEffect',this.cell(i)).active=false;this.cell(i).setPosition((Math.floor(i/3)-2)*154,(1-i%3)*156);}}
    private async play(r:Round){
        this.previousLocks=Array(5).fill(false);this.text('Win','0.00');let total=0;
        for(let turn=0;turn<r.steps.length;turn++){
            const step=r.steps[turn];this.clearEffects();
            for(let c=0;c<5;c++)this.get('Reels/Lock'+c).active=this.previousLocks[c];
            this.text('Respin',turn?'FREE RESPIN '+turn:'');this.text('Status',turn?'Locked Wilds stay. New Wilds extend the feature.':'');
            this.sound(turn?'Reel_Respin':'Reel_Spin');
            await this.roll(step.raw);
            this.showGrid(step.raw);
            const newWild=step.locks.some((v,c)=>v&&!this.previousLocks[c]);
            if(newWild){this.sound('Wild_Extension');await this.pause(.3);}
            this.showGrid(step.grid);
            for(let c=0;c<5;c++){
                const lock=this.get('Reels/Lock'+c);lock.active=step.locks[c];
                if(step.locks[c]&&!this.previousLocks[c]){lock.setScale(1,.02,1);tween(lock).to(.35,{scale:new Vec3(1,1,1)}).start();}
            }
            this.previousLocks=[...step.locks];total+=step.win;this.text('Win',total.toFixed(2));
            this.winning(step);
            this.text('Status',step.win?`${step.hits.length} winning lines  ·  ${step.win.toFixed(2)}`:'No winning line this spin');
            if(step.win)this.sound('Win_Small_01');
            await this.pause(this.save.turbo?.3:1.2);
        }
        const result=settle(this.save);this.persist();this.busy=false;
        if(!result)return;
        this.text('Respin',r.steps.length>1?`RESPIN COMPLETE  ·  ${r.steps.length-1} FREE SPINS`:'');
        this.text('Status',r.payout?`TOTAL WIN ${r.payout.toFixed(2)}  ·  Spin again`:'Try your fortune again');
        if(this.auto>0)this.auto--;
        if((this.singleWinLimit!==null&&r.payout>this.singleWinLimit)||(this.lowerBalance!==null&&this.save.balance<this.lowerBalance)||(this.upperBalance!==null&&this.save.balance>this.upperBalance)||(this.stopOnFeature&&r.steps.some(step=>step.locks.some(Boolean))))this.auto=0;
        this.refresh();
        if(r.payout>=r.bet*6){
            this.auto=0;this.refresh();this.sound('Win_Big');
            this.open('CrownWin',p=>{this.text('Title',r.payout>=r.bet*30?'MEGA WIN':r.payout>=r.bet*15?'SUPER WIN':'BIG WIN',p);this.text('Amount',r.payout.toFixed(2),p);this.text('Detail',(r.payout/r.bet).toFixed(2)+'× TOTAL BET',p);
                const fx=this.get('OriginalEffect',p),sk=fx.getComponent(sp.Skeleton)!;fx.setSiblingIndex(3);fx.setScale(.6,.6,1);fx.setPosition(0,95);fx.active=true;
                const animation=r.payout>=r.bet*30?'MegaWin_Start':r.payout>=r.bet*15?'SuperWin_Start':'BigWin_Start';
                const hasAnimation=!!sk.skeletonData?.getRuntimeData()?.findAnimation(animation);this.get('Title',p).active=!hasAnimation;
                if(hasAnimation)sk.setAnimation(0,animation,false);
                this.click('Close',()=>this.close(),p);});
        }else if(this.auto>0)this.scheduleOnce(()=>{if(this.auto>0)this.spin();},this.save.turbo?.2:.7);
    }
    private winning(step:Step){
        const indices=new Set<number>();for(const hit of step.hits)for(const i of LINES[hit.line].slice(0,hit.count))indices.add(i);
        for(const i of indices){const cell=this.cell(i);this.get('Highlight',cell).active=true;
            const fx=this.get('WinEffect',cell),sk=fx.getComponentInChildren(sp.Skeleton);if(sk){sk.skeletonData=this.symbolEffects[step.grid[i]];fx.active=true;const data=sk.skeletonData?.getRuntimeData();if(data?.findAnimation('Win'))sk.setAnimation(0,'Win',true);}
        }
    }
    private roll(target:number[]):Promise<void>{
        this.rollingTime=0;this.quickStop=false;this.rolling=true;this.stopped=0;this.rollTarget=target;
        this.rollDurations=Array.from({length:5},(_,c)=>this.save.turbo?.36+c*.045:1.1+c*.16);
        this.rollCycles=Array.from({length:5},(_,c)=>this.save.turbo?5:9+c);
        this.rollStrips=this.rollCycles.map((cycles,c)=>{
            const strip=Array.from({length:cycles+7},()=>Math.floor(Math.random()*8));
            for(let row=0;row<3;row++){const frame=this.cell(c*3+row).getComponent(Sprite)!.spriteFrame;strip[cycles+1+row]=Math.max(0,this.symbols.indexOf(frame!));strip[1+row]=target[c*3+row];}
            return strip;
        });
        return new Promise(resolve=>this.rollFinish=resolve);
    }
    update(dt:number){
        const spinArrow=this.get('Spin/Icon');
        spinArrow.angle=(spinArrow.angle-dt*120)%360;
        if(this.autoHolding&&!this.autoHeld){this.autoHoldTime+=dt;if(this.autoHoldTime>=.55){this.autoHeld=true;this.autoHolding=false;if(!this.busy&&!this.auto)this.autoPanel();}}
        if(this.get('Loading').active)this.get('Loading/Spinner').angle-=dt*220;
        if(!this.rolling)return;
        this.rollingTime+=dt*(this.quickStop?5:1);
        for(let c=0;c<5;c++){
            if(this.previousLocks[c])continue;
            const duration=this.rollDurations[c],t=Math.min(this.rollingTime,duration),cycles=this.rollCycles[c],distance=cycles*156;
            const accel=Math.min(.12,duration*.2),brake=Math.min(.26,duration*.3),speed=distance/(duration-(accel+brake)/2);
            const d=t<accel?.5*speed*t*t/accel:t>duration-brake?distance-.5*speed*(duration-t)**2/brake:speed*(t-accel/2);
            const k=Math.min(cycles,Math.floor(d/156)),offset=d-k*156;
            for(let row=-1;row<=3;row++){
                const n=row===-1?this.get('Reels/Cells/Upper'+c):row===3?this.get('Reels/Cells/Lower'+c):this.cell(c*3+row);
                n.setPosition((c-2)*154,(1-row)*156-offset);
                n.getComponent(Sprite)!.spriteFrame=this.symbols[this.rollStrips[c][cycles+1+row-k]];
            }
            if(t===duration&&c>=this.stopped){this.stopped=c+1;this.sound('Reel_Stop');}
        }
        if(this.rollingTime>=this.rollDurations[4]){this.rolling=false;this.showGrid(this.rollTarget);const done=this.rollFinish;this.rollFinish=null;done?.();}
    }
    private stopAuto(){this.auto=0;this.text('Status',this.busy?'Auto stopped after this round':'Auto stopped');this.refresh();}
    private close(){if(this.panel)this.panel.active=false;this.panel=null;this.refresh();}
    private open(name:string,setup:(p:Node)=>void){
        if(this.panel||this.get('Loading').active)return;
        const finish=(p:Node)=>{this.panel=p;p.active=true;p.setSiblingIndex(this.node.children.length-1);for(const n of p.getComponentsInChildren(Button))n.node.off(Button.EventType.CLICK);setup(p);};
        const cached=this.cache.get(name);if(cached){finish(cached);return;}
        const id=++this.loadId;const load=()=>{
            this.get('Loading').active=true;this.get('Loading/Retry').active=false;this.text('Loading/Label','LOADING  0%');
            resources.load('deferred/'+name,Prefab,(done,total)=>{if(this.isValid&&id===this.loadId)this.text('Loading/Label',`LOADING  ${Math.floor(done/Math.max(1,total)*100)}%`);},(err,prefab)=>{
                if(!this.isValid||id!==this.loadId)return;
                if(err){console.error(err);this.text('Loading/Label','Load failed. Retry or close.');this.get('Loading/Retry').active=true;return;}
                this.get('Loading').active=false;this.retry=null;const p=instantiate(prefab);this.node.addChild(p);this.cache.set(name,p);finish(p);
            });
        };this.retry=load;load();
    }
    private dialog(history:boolean){
        if(this.busy||this.auto)return;
        let page=0;const help=[
            'Match 3, 4 or 5 symbols from the left on any of 20 fixed lines.\nWild substitutes for every symbol. The best combination pays.\n\nWilds expand to fill their reel and lock for a free respin.\nEach new locked reel gives another free respin.\nThe feature ends when no new Wild lands or all reels lock.\n\nMaximum round win: 1000× total bet.\nThis is a local simulation; probabilities differ from the online game.',
            'PAYOUTS PER LINE BET     3 / 4 / 5 SYMBOLS\n\n'+SYMBOLS.map((s,i)=>`${s}     ${PAY[i].join(' / ')}`).join('\n')+'\n\nLine bet = total bet ÷ 20.',
            '20 LINE ROUTES  (1 = top, 2 = middle, 3 = bottom)\n\n'+Array.from({length:10},(_,i)=>[i,i+10].map(j=>`${String(j+1).padStart(2,'0')}   ${LINES[j].map(v=>v%3+1).join('—')}`).join('       ')).join('\n')
        ];
        const pages=history?Array.from({length:Math.max(1,Math.ceil(this.save.history.length/7))},(_,p)=>this.save.history.slice(p*7,p*7+7).map(h=>`${new Date(h.id).toLocaleTimeString()}    BET ${h.bet}    WIN ${h.payout.toFixed(2)}    RESPINS ${h.respins}`).join('\n\n')||'No rounds played yet.'):help;
        this.open('CrownDialog',p=>{const draw=()=>{this.text('Title',(history?'ROUND HISTORY':'HOW TO PLAY')+`  ${page+1}/${pages.length}`,p);this.text('Body',pages[page],p);};draw();this.click('Next',()=>{page=(page+1)%pages.length;draw();},p);this.click('Previous',()=>{page=(page+pages.length-1)%pages.length;draw();},p);this.click('Close',()=>this.close(),p);});
    }
    private helpPanel(){
        if(this.busy||this.auto)return;
        this.open('CrownHelp',p=>{let page=0;const draw=()=>{for(let i=0;i<3;i++)this.get('Page'+i,p).active=i===page;this.text('PageNumber',`${page+1} / 3`,p);};
            this.click('Previous',()=>{page=(page+2)%3;draw();},p);this.click('Next',()=>{page=(page+1)%3;draw();},p);this.click('Close',()=>this.close(),p);draw();
        });
    }
    private settingsPanel(){
        if(this.busy||this.auto)return;
        this.open('CrownSettings',p=>{
            const draw=()=>{this.get('Sound',p).getComponent(Sprite)!.spriteFrame=this.uiIcons[this.save.muted?5:4];};draw();
            this.click('Sound',()=>{this.save.muted=!this.save.muted;this.music();this.persist();draw();},p);
            this.click('Help',()=>{this.close();this.helpPanel();},p);
            this.click('History',()=>{this.close();this.dialog(true);},p);
            this.click('Auto',()=>{this.close();this.autoPanel();},p);
            this.click('Shade',()=>this.close(),p);
        });
    }
    private autoPanel(){
        if(this.busy||this.auto)return;
        this.open('CrownAuto',p=>{
            const base='Btn/ScrollView/view/content/';
            let rounds=10,betIndex=BETS.indexOf(this.save.bet);
            const enabled=[true,false,false,false,false],values=[0,this.save.balance,this.save.balance];
            const row=(i:number)=>base+'Toggle_0'+i;
            const fields=['Num_Exceed','Num_BalanceLess','Num_BalanceMore'];
            const draw=()=>{
                for(let i=1;i<=5;i++)this.get(row(i)+'/Checked_Bg',p).active=enabled[i-1];
                this.text(row(1)+'/Btn/Under/Num_Round',String(rounds),p);
                this.text(row(1)+'/InfoNode/BetBtn/Under/Num_Bet',String(BETS[betIndex]),p);
                this.text(row(1)+'/InfoNode/TotalBetText','Total Bet: '+(rounds*BETS[betIndex]).toLocaleString('en-US'),p);
                fields.forEach((name,i)=>this.text(row(i+2)+'/Btn/Under/'+name,values[i].toFixed(2),p));
            };
            // A finite round count is required; the other source checkboxes enable stop conditions.
            for(let i=2;i<=5;i++)this.click(row(i),()=>{enabled[i-1]=!enabled[i-1];draw();},p);
            for(const count of [50,100,200,500,999])this.click(row(1)+'/Btn/Btn_Bet'+count,()=>{rounds=count;draw();},p);
            for(const [key,delta] of [['btn_increase',1],['btn_decrease',-1]] as const){
                this.click(row(1)+'/Btn/'+key,()=>{rounds=Math.max(1,Math.min(999,rounds+delta));draw();},p);
                this.click(row(1)+'/InfoNode/BetBtn/'+key,()=>{betIndex=Math.max(0,Math.min(BETS.length-1,betIndex+delta));draw();},p);
                for(let i=0;i<3;i++)this.click(row(i+2)+'/Btn/'+key,()=>{values[i]=Math.max(0,Math.round((values[i]+delta*BETS[betIndex])*100)/100);enabled[i+1]=true;draw();},p);
            }
            this.click('Close',()=>this.close(),p);
            this.click('Start',()=>{
                this.save.bet=BETS[betIndex];this.persist();this.auto=rounds;
                this.singleWinLimit=enabled[1]?values[0]:null;
                this.lowerBalance=enabled[2]?values[1]:null;this.upperBalance=enabled[3]?values[2]:null;
                this.stopOnFeature=enabled[4];this.close();this.spin();
            },p);draw();
        });
    }
    onDestroy(){this.loadId++;this.getComponent(AudioSource)?.stop();}
}
