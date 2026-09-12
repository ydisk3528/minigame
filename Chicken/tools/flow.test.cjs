(async()=>{
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
let queue=[],now=0;const storage=new Map();global.window={};
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
 setPosition(x,y,z=0){this.position=typeof x==='object'?{...x}:{x,y,z};}
}
Node.EventType={TOUCH_END:'touch'};
class Label extends Component{} class Button extends Component{} Button.EventType={CLICK:'click'};
class Skeleton extends Component{findAnimation(){return true;}setAnimation(){}setSkin(){}}
class AudioSource extends Component{play(){this.playing=true;}stop(){this.playing=false;}playOneShot(){}}
class Vec3{constructor(x,y,z){Object.assign(this,{x,y,z});}}
const cc={_decorator:{ccclass:()=>c=>c,property:()=>()=>{}},Component,Node,Label,Button,Prefab:class{},AudioClip:class{},AudioSource,CCString:String,Vec3,sp:{Skeleton},sys:{localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},Tween:{stopAllByTarget(){}},tween:n=>{let actions=[],delay=0;return {to(t,v){delay+=t;actions.push({time:delay,fn:()=>Object.assign(n,v)});return this;},call(fn){actions.push({time:delay,fn});return this;},start(){for(const a of actions)queue.push({fn:a.fn,time:now+a.time});}};}};
cc.view={setDesignResolutionSize(){}};cc.ResolutionPolicy={SHOW_ALL:1};
const load=Module._load;Module._load=function(n,...a){return n==='cc'?cc:load.call(this,n,...a);};
const {ChickenGame}=require('./test-build/ChickenGame.js'),{ChickenBoot}=require('./test-build/ChickenBoot.js');Module._load=load;
function graph(doc){const types={'cc.Node':Node,'cc.Scene':Node,'cc.Label':Label,'cc.Button':Button,'sp.Skeleton':Skeleton,'cc.AudioSource':AudioSource};
 const os=doc.map(o=>new (types[o?.__type__]||class{})());
 const resolve=v=>Array.isArray(v)?v.map(resolve):v&&typeof v==='object'?('__id__'in v?os[v.__id__]:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,resolve(v)]))):v;
 doc.forEach((o,i)=>{Object.assign(os[i],resolve(o));if(os[i] instanceof Node){Object.assign(os[i],{name:o._name,children:os[i]._children||[],components:os[i]._components||[],parent:os[i]._parent,active:o._active!==false,position:{x:0,y:0,z:0,...o._lpos}});}});return os;}
const prefab=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/resources',n+'.prefab')));
cc.instantiate=a=>graph(a)[0].data;
let requests=[],failNext=false;cc.resources={load(n,t,progress,done){requests.push(n);progress(1,2);queueMicrotask(()=>{if(failNext){failNext=false;done(Error('simulated failure'));}else done(null,prefab(n));});}};
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const tick=async(secs)=>{for(let i=0;i<secs*20;i++){now+=.05;const due=queue.filter(t=>t.time<=now);queue=queue.filter(t=>t.time>now);for(const t of due)t.fn();await flush();}};
const root=cc.instantiate(prefab('deferred/ChickenGame')),app=new ChickenGame();app.node=root;Object.assign(app,root.components.find(o=>'soundNames'in o));app.start();await flush();
const click=async(p,r=root)=>{const n=r.getChildByPath(p);assert.ok(n,p);if(n.activeInHierarchy && n.getComponent(Button)?.interactable!==false)n.emit('click');await flush();};
assert.equal(requests.length,0,'game initially loads no optional panels');assert.equal(app.save.round,null);
await click('ButtonLayer/Difficulty');await click('ListLayer/DifficultyList/Layout/item-001');assert.equal(app.save.mode,1);
await click('ButtonLayer/Bet');await click('ListLayer/BetList/Layout/Bet25');assert.equal(app.save.bet,25);
Math.random=()=>0;await click('ButtonLayer/Spin');await click('ButtonLayer/Spin');assert.equal(app.save.balance,9975,'rapid start charges once');await tick(1);
assert.equal(app.save.round.stage,1);assert.ok(root.getChildByPath('ButtonLayer/CashOut').active);
failNext=true;await click('ButtonLayer/CashOut');const settled=JSON.stringify(app.save);assert.ok(root.getChildByName('Loading').active);
await click('Loading/Retry');assert.equal(JSON.stringify(app.save),settled,'result retry does not settle again');assert.equal(app.modal.name,'ChickenResult');
await click('Continue',app.modal);assert.equal(app.modal,null);
Math.random=()=>1;await click('ButtonLayer/Spin');await tick(3);assert.equal(app.save.history[0].won,false);assert.equal(app.modal.getChildByName('Title').getComponent(Label).string,'ROUND OVER');await click('Continue',app.modal);
await click('ButtonLayer/AutoPlay');assert.equal(app.modal.name,'ChickenAuto');await click('Close',app.modal);
await click('Help');assert.equal(app.modal.name,'ChickenDialog');await click('Close',app.modal);await click('History');await click('Close',app.modal);
Math.random=()=>0;await click('ButtonLayer/Spin');await tick(1);for(let i=0;i<6;i++){await click('ButtonLayer/Jump');await tick(1);}assert.equal(app.modal.name,'ChickenBonus');
const oldBalance=app.save.balance;await click('Spin',app.modal);await click('Spin',app.modal);await tick(5);assert.equal(app.save.balance,oldBalance+app.save.bet*10000);await click('Spin',app.modal);assert.equal(app.modal,null);
await click('ButtonLayer/CashOut');await click('Continue',app.modal);
await click('ButtonLayer/AutoPlay');await click('Start',app.modal);await tick(1);await click('ButtonLayer/StopAutoPlay');assert.equal(app.autoLeft,0);await tick(2);assert.ok(app.save.round,'stop keeps active round under player control');
const loaded=graph(JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/scenes/Chicken.scene'))));const canvas=loaded.find(n=>n.name==='Canvas');const boot=new ChickenBoot();boot.node=canvas;failNext=true;boot.start();await flush();assert.ok(canvas.getChildByPath('Boot/Retry').active);canvas.getChildByPath('Boot/Retry').emit('touch');await flush();assert.ok(!canvas.getChildByName('Boot').active);assert.ok(canvas.getChildByName('ChickenGame'));
console.log('PASS: authored node bindings, all panel routes, double taps, win/loss, load retry, wheel settlement, auto stop, boot retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
