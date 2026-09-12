(async()=>{
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
let queue=[],now=0;const storage=new Map();global.window={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
class Component {get isValid(){return true;}scheduleOnce(fn,delay){queue.push({fn,time:now+delay});}unscheduleAllCallbacks(){queue=[];}getComponent(t){return this.node.getComponent(t);}}
class Node {constructor(){this.children=[];this.components=[];this.events={};this.active=true;this.position={x:0,y:0,z:0};this.angle=0;}
 get activeInHierarchy(){return this.active&&(!this.parent||this.parent.activeInHierarchy);}
 getChildByName(n){return this.children.find(x=>x.name===n)||null;}
 getChildByPath(p){return p.split('/').reduce((n,s)=>n?.getChildByName(s),this);}
 getComponent(t){return this.components.find(c=>c instanceof t)||null;}
 addComponent(t){const c=new t();c.node=this;this.components.push(c);return c;}
 addChild(n){n.parent=this;this.children.push(n);}
 setSiblingIndex(i){const a=this.parent?.children;if(a){a.splice(a.indexOf(this),1);a.splice(i,0,this);}}
 on(e,f,ctx){(this.events[e]??=[]).push(ctx?f.bind(ctx):f);}off(e){this.events[e]=[];}emit(e){for(const f of this.events[e]||[])f();}
 getComponentsInChildren(t){return [...this.components.filter(c=>c instanceof t),...this.children.flatMap(n=>n.getComponentsInChildren(t))];} getComponentInChildren(t){return this.getComponentsInChildren(t)[0]||null;} setScale(){} setPosition(x,y,z=0){this.position=typeof x==='object'?{...x}:{x,y,z};}
}
Node.EventType={TOUCH_END:'touch',TOUCH_START:'start',TOUCH_CANCEL:'cancel'};
class UITransform extends Component{setContentSize(w,h){this.width=w;this.height=h;}} class Sprite extends Component{} class Label extends Component{} class Button extends Component{} Button.EventType={CLICK:'click'};
class Skeleton extends Component{set skeletonData(v){this._data={getRuntimeData:()=>({findAnimation:()=>({duration:.5})})};}get skeletonData(){return this._data||{getRuntimeData:()=>({findAnimation:()=>({duration:.5})})};} findAnimation(){return true;}setAnimation(){}setSkin(){}setCompleteListener(fn){this.complete=fn;}}
class AudioSource extends Component{play(){this.playing=true;}stop(){this.playing=false;}playOneShot(){}}
class Vec3{constructor(x,y,z){Object.assign(this,{x,y,z});}}
const cc={_decorator:{ccclass:()=>c=>c,property:()=>()=>{}},Component,Node,Label,Button,Sprite,UITransform,SpriteFrame:class{},Prefab:class{},AudioClip:class{},AudioSource,CCString:String,Vec3,sp:{Skeleton,SkeletonData:class{}},sys:{localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},Tween:{stopAllByTarget(){}},tween:n=>{let actions=[],delay=0;return {to(t,v){delay+=t;actions.push({time:delay,fn:()=>Object.assign(n,v)});return this;},call(fn){actions.push({time:delay,fn});return this;},start(){for(const a of actions)queue.push({fn:a.fn,time:now+a.time});}};}};
cc.view={setDesignResolutionSize(){}};cc.ResolutionPolicy={SHOW_ALL:1};
const load=Module._load;Module._load=function(n,...a){return n==='cc'?cc:load.call(this,n,...a);};
const {CrownGame}=require('./test-build/CrownGame.js'),{CrownBoot}=require('./test-build/CrownBoot.js');Module._load=load;
function graph(doc){const types={'cc.UITransform':UITransform,'cc.Node':Node,'cc.Scene':Node,'cc.Sprite':Sprite,'cc.Label':Label,'cc.Button':Button,'sp.Skeleton':Skeleton,'cc.AudioSource':AudioSource};
 const os=doc.map(o=>new (o&&'soundNames'in o?CrownGame:types[o?.__type__]||class{})());
 const resolve=v=>Array.isArray(v)?v.map(resolve):v&&typeof v==='object'?('__id__'in v?os[v.__id__]:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,resolve(v)]))):v;
 doc.forEach((o,i)=>{Object.assign(os[i],resolve(o));if(os[i] instanceof Node){Object.assign(os[i],{name:o._name,children:os[i]._children||[],components:os[i]._components||[],parent:os[i]._parent,active:o._active!==false,position:{x:0,y:0,z:0,...o._lpos}});}});return os;}
const prefab=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/resources',n+'.prefab')));
cc.instantiate=a=>graph(a)[0].data;
let requests=[],failNext=false;cc.resources={load(n,t,progress,done){requests.push(n);progress(1,2);queueMicrotask(()=>{if(failNext){failNext=false;done(Error('simulated failure'));}else done(null,prefab(n));});}};
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const tick=async(secs)=>{for(let i=0;i<secs*20;i++){now+=.05;app?.update(.05);const due=queue.filter(t=>t.time<=now);queue=queue.filter(t=>t.time>now);for(const t of due)t.fn();await flush();}};
assert.ok(!prefab('deferred/CrownAuto').some(c=>c.__type__==='cc.RichText'),'AUTO numeric labels must not overlap retained source RichText');
const rules=require('./test-build/CrownRules.js');
const {parseSave,loadSave,storeSave}=require('./test-build/GameSave.js');
const makeApp=()=>{const root=cc.instantiate(prefab('deferred/CrownGame')),app=new CrownGame();app.node=root;Object.assign(app,root.components.find(o=>'soundNames'in o));app.start();return app;};
const click=async(p,r)=>{const n=r.getChildByPath(p);assert.ok(n,p);if(n.activeInHierarchy&&n.getComponent(Button)?.interactable!==false)n.emit('click');await flush();};
let app=makeApp();await flush();let root=app.node;
assert.equal(app.node.getComponent(AudioSource).playing,true);assert.equal(app.node.getComponent(AudioSource).loop,true);assert.equal(app.panel.name,'CrownIntro');await click('Close',app.panel);assert.equal(app.save.intro,true);
await click('BetButton',root);const bet=app.panel.getComponentsInChildren(Button).find(b=>b.node.name==='Bet20');assert.ok(bet);bet.node.emit('click');await flush();assert.equal(app.save.bet,20);
// Deliberately all-wild round: cap, double-tap, deferred result retry, idempotent settlement.
Math.random=()=>.999;failNext=true;await click('Spin',root);await click('Spin',root);assert.equal(app.save.balance,9980);assert.ok(app.save.pending);
assert.ok(app.rolling);await tick(.05);assert.notEqual(root.getChildByPath('Reels/Cells/Cell0').position.y,156);assert.ok(root.getChildByPath('Reels/Cells/Upper0'));
const pendingSnapshot=JSON.stringify(app.save);assert.ok(parseSave(pendingSnapshot).pending);
await tick(10);assert.equal(app.save.balance,29980);assert.equal(app.save.pending,null);assert.ok(root.getChildByName('Loading').active);
await click('Loading/Retry',root);assert.equal(app.panel.name,'CrownWin');const balance=app.save.balance;await click('Close',app.panel);assert.equal(app.save.balance,balance);
// Resume persisted pending result without a new bet or random outcome.
queue=[];storage.set('crownoffortune.local.v1',pendingSnapshot);app=makeApp();root=app.node;await tick(10);assert.equal(app.save.balance,29980);assert.equal(app.save.history.length,1);await flush();await click('Close',app.panel);
await click('Settings',root);await click('Help',app.panel);assert.equal(app.panel.name,'CrownHelp');await click('Next',app.panel);assert.ok(app.panel.getChildByName('Page1').active);await click('Next',app.panel);assert.ok(app.panel.getChildByName('Page2').active);await click('Close',app.panel);
await click('Settings',root);await click('History',app.panel);assert.match(app.panel.getChildByName('Body').getComponent(Label).string,/WIN/);await click('Close',app.panel);
await click('Settings',root);assert.equal(app.panel.name,'CrownSettings');await click('Sound',app.panel);assert.equal(app.save.muted,true);await click('Shade',app.panel);await click('Turbo',root);assert.equal(app.save.turbo,true);
root.getChildByName('Auto').emit('start');await tick(.6);root.getChildByName('Auto').emit('touch');await click('Auto',root);assert.equal(app.panel.name,'CrownAuto');await click('Btn/ScrollView/view/content/Toggle_01/Btn/Btn_Bet50',app.panel);assert.equal(app.panel.getChildByPath('Btn/ScrollView/view/content/Toggle_01/Btn/Under/Num_Round').getComponent(Label).string,'50');await click('Btn/ScrollView/view/content/Toggle_02',app.panel);assert.ok(app.panel.getChildByPath('Btn/ScrollView/view/content/Toggle_02/Checked_Bg').active);await click('Close',app.panel);
// Different symbol per reel gives a deterministic losing round.
let counter=0;const samples=[.05,.25,.45,.6,.74];Math.random=()=>samples[Math.floor(counter++/3)%5];
await click('Auto',root);assert.equal(app.auto,10);await click('Auto',root);assert.equal(app.auto,0);await tick(10);assert.equal(app.save.pending,null);assert.equal(app.save.history[0].payout,0);assert.equal(app.save.history.length,2);
// Original AUTO panel: balance condition stops after a paid round; stop icon has native dimensions.
await click('Settings',root);await click('Auto',app.panel);
await click('Btn/ScrollView/view/content/Toggle_01/Btn/Btn_Bet50',app.panel);
await click('Btn/ScrollView/view/content/Toggle_03/Btn/btn_increase',app.panel);
counter=0;await click('Start',app.panel);assert.equal(app.auto,50);
assert.equal(root.getChildByPath('Auto/Icon').getComponent(UITransform).width,34);
await tick(10);assert.equal(app.auto,0);assert.equal(app.save.history.length,3);
assert.equal(root.getChildByPath('Auto/Icon').getComponent(UITransform).width,50);
// First respin keeps its locked column and stops when no new wild is drawn.
let draws=0;const respin=rules.makeRound(10,()=>draws++===4?.999:.25);assert.equal(respin.steps.length,2);assert.equal(respin.steps[1].grid[3],7);assert.equal(respin.steps[1].grid[4],7);assert.equal(respin.steps[1].grid[5],7);
const poor=rules.fresh();poor.balance=0;assert.equal(rules.begin(poor),null);assert.equal(rules.settle(poor),null);
const invalid=JSON.parse(pendingSnapshot);invalid.pending.steps[0].grid=[99];assert.equal(parseSave(JSON.stringify(invalid)),null);
assert.equal(parseSave('{'),null);assert.equal(parseSave(JSON.stringify({...rules.fresh(),game:'chicken'})),null);
const bridge={getGameSave(){throw Error('offline');},setGameSave(){throw Error('offline');}};storeSave(app.save,window.localStorage,bridge);assert.equal(loadSave(window.localStorage,bridge).balance,app.save.balance);
const loaded=graph(JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/scenes/Crown.scene'))));const canvas=loaded.find(n=>n.name==='Canvas');const boot=new CrownBoot();boot.node=canvas;failNext=true;boot.start();await flush();assert.ok(canvas.getChildByPath('Boot/Retry').active);canvas.getChildByPath('Boot/Retry').emit('click');await flush();assert.ok(!canvas.getChildByName('Boot').active);assert.equal(canvas.getChildByName('CrownGame').active,false);storage.set('crownoffortune.local.v1',JSON.stringify({...rules.fresh(),muted:false}));await click('CrownOpening/Play',canvas);assert.equal(canvas.getComponent(AudioSource).playing,true);assert.equal(canvas.getComponent(AudioSource).loop,false);await tick(1);assert.equal(canvas.getComponent(AudioSource).playing,false);assert.equal(canvas.getChildByName('CrownGame').active,true);
storage.set('crownoffortune.local.v1',JSON.stringify({...rules.fresh(),muted:true}));
const mutedCanvas=graph(JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/scenes/Crown.scene')))).find(n=>n.name==='Canvas');
const mutedBoot=new CrownBoot();mutedBoot.node=mutedCanvas;mutedBoot.start();await flush();await click('CrownOpening/Play',mutedCanvas);assert.notEqual(mutedCanvas.getComponent(AudioSource).playing,true);
const mutedGame=makeApp();assert.notEqual(mutedGame.node.getComponent(AudioSource).playing,true);
assert.equal(rules.LINES.length,20);assert.equal(new Set(rules.LINES.map(x=>x.join(','))).size,20);
for(let i=0;i<1000;i++){let seed=i+1;const r=rules.makeRound(10,()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});assert.ok(r.steps.length<=6);assert.ok(r.payout<=10000);assert.equal(r.payout,rules.money(r.steps.reduce((a,s)=>a+s.win,0)));}
console.log('PASS: authored prefab buttons, intro, help/paytable/lines, history, settings, win/loss, max cap, wild locks/respin, auto stop, rapid clicks, resume/settle once, bridge fallback, load/boot retries, 1000 seeded rounds');
})().catch(e=>{console.error(e);process.exitCode=1;});
