(async () => {
// Executes controller logic against the authored scene graph, without a renderer.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const storage=new Map();global.window={cocosJava:{getGameSave:()=>storage.get('native')||'',setGameSave:s=>storage.set('native',s)}};
let randomSeed=91;Math.random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
class Component { scheduleOnce(fn,delay){queue.push({fn,time:now+delay});} unscheduleAllCallbacks(){queue=[];} }
class Node {
 constructor(){this.children=[];this.components=[];this.events={};this.active=true;this.position={x:0,y:0,z:0,clone(){return {...this};}};}
 getChildByName(name){return this.children.find(n=>n.name===name)||null;}
 getComponent(type){return this.components.find(c=>c instanceof type)||null;}
 addComponent(type){const c=new type();c.node=this;this.components.push(c);return c;}
 addChild(child){this.children.push(child);child.parent=this;}
 getComponentsInChildren(type){return [...this.components.filter(c=>c instanceof type),...this.children.flatMap(c=>c.getComponentsInChildren(type))];}
 getSiblingIndex(){return this.parent?.children.indexOf(this)??0;}
 setSiblingIndex(i){const a=this.parent?.children;if(a){a.splice(a.indexOf(this),1);a.splice(i,0,this);}}
 on(event,fn){(this.events[event]??=[]).push(fn);}
 emit(event){for(const fn of this.events[event]||[])fn();}
 setPosition(x,y,z=0){if(typeof x==='object')Object.assign(this.position,x);else Object.assign(this.position,{x,y,z});}
}
class Label extends Component{}class Sprite extends Component{}class Button extends Component{}Button.EventType={CLICK:'click'};
class UIOpacity extends Component{}class ProgressBar extends Component{}class Skeleton extends Component{setAnimation(){}}
class Animation extends Component{clips=[];getState(){return null;}play(name){this.played=name;}}
class AudioSource extends Component{play(){this.playing=true;}stop(){this.playing=false;}playOneShot(){}}
const cc={_decorator:{ccclass:()=>c=>c,property:()=>()=>{}},Component,Node,Label,Sprite,Button,UIOpacity,ProgressBar,Animation,AudioSource,AudioClip:class{},SpriteFrame:class{},sp:{Skeleton},view:{setDesignResolutionSize(){}},ResolutionPolicy:{SHOW_ALL:1},sys:{localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},tween:n=>({to(_d,v){Object.assign(n,v);return this;},start(){}})};
cc.profiler={hideStats(){}};
let now=0,queue=[];const load=Module._load;Module._load=function(name,...args){return name==='cc'?cc:load.call(this,name,...args);};
const {TeenPattiApp}=require('./test-build/TeenPattiApp.js');const {DeferredAssets}=require('./test-build/DeferredAssets.js');Module._load=load;

function graph(doc){
 const classes={'cc.Node':Node,'cc.Scene':Node,'cc.Label':Label,'cc.Sprite':Sprite,'cc.Button':Button,'cc.UIOpacity':UIOpacity,'cc.ProgressBar':ProgressBar,'cc.Animation':Animation,'sp.Skeleton':Skeleton};
 const objects=doc.map(o=>new (o&&'portraits'in o&& !('lobbyRoot'in o)?DeferredAssets:classes[o?.__type__]||class{})());
 const resolve=v=>Array.isArray(v)?v.map(resolve):v&&typeof v==='object'?('__id__'in v?objects[v.__id__]:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,resolve(x)]))):v;
 doc.forEach((o,i)=>{Object.assign(objects[i],resolve(o));if(objects[i] instanceof Node){objects[i].name=o._name;objects[i].children=objects[i]._children||[];objects[i].components=objects[i]._components||[];objects[i].parent=objects[i]._parent;objects[i].active=o._active!==false;Object.assign(objects[i].position,o._lpos||{});}});
 return objects;
}
const objects=graph(JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/scenes/TeenPatti.scene'))));
const config=objects.find(o=>o.quickSettingRoot);const app=new TeenPattiApp();Object.assign(app,config);
const requests=[];let failNext=false;
cc.isValid=()=>true;cc.instantiate=asset=>graph(asset)[0].data;
cc.resources={load(name,type,progress,callback){requests.push(name);progress(1,2);queueMicrotask(()=>{if(failNext){failNext=false;callback(Error('simulated network failure'));}else callback(null,JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/resources',name+'.prefab'))));});}};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const tick=async(seconds)=>{for(let i=0;i<seconds*10;i++){now+=.1;const due=queue.filter(q=>q.time<=now);queue=queue.filter(q=>q.time>now);for(const q of due)q.fn();app.update(.1);await flush();}};
const click=async(root,p)=>{app.at(root,p).emit('click');await flush();};
app.start();assert.ok(!app.quickSettingRoot.active);await flush();assert.deepEqual(requests,['deferred/TeenPattiLobby'],'startup loads only lobby');assert.ok(app.lobby.active&&!app.quickSettingRoot.active);assert.equal(app.round,null);
failNext=true;app.at(app.lobby,'Room/btn_01/RoomCard/01/joinBtn').emit('click');app.at(app.lobby,'Room/btn_01/RoomCard/01/joinBtn').emit('click');await flush();assert.equal(requests.length,2,'rapid room clicks share one table load');assert.ok(app.loadingOverlay.active&&!app.quickSettingRoot.active);assert.equal(app.round,null);assert.equal(app.save.balance,10000);
await click(app.loadingOverlay,'Retry');assert.ok(app.quickSettingRoot.active&&app.table.active&&!app.lobby.active);assert.equal(app.round,null,'entry confirmation precedes deal');assert.equal(app.save.balance,10000,'showing quickSetting does not charge');
await click(app.quickSettingRoot,'Button2');await tick(2);assert.ok(app.round&&!app.quickSettingRoot.active&&!app.loadingOverlay.active);assert.equal(app.faces.length,52);assert.equal(app.sounds.length,16);assert.equal(app.save.balance,9999);
await click(app.table,'Btn/Btn_00');assert.ok(app.round.players[2].seen);
await click(app.table,'Btn/Btn_01');failNext=true;for(let i=0;!app.round.ended&&i<400;i++)await tick(1);assert.ok(app.round.ended);await tick(3);
assert.ok(app.loadingOverlay.active&&app.round.ended);const beforeResultRetry=JSON.stringify(app.save);await click(app.loadingOverlay,'Retry');assert.equal(JSON.stringify(app.save),beforeResultRetry,'result retry never changes settled save');assert.ok(app.loseRoot?.active&&!app.winnerRoot);assert.equal(requests.filter(n=>n.includes('Winner')).length,0,'losing does not load winner panel');const snapshot=JSON.stringify(app.save);app.finish();assert.equal(JSON.stringify(app.save),snapshot);
const tableRequests=requests.filter(n=>n.includes('Table')).length;
await click(app.loseRoot,'Content/Continue');await tick(2);assert.ok(!app.round.ended);assert.equal(requests.filter(n=>n.includes('Table')).length,tableRequests,'continue reuses loaded table');
for(let i=0;i<5;i++)if(i!==2)app.round.players[i].folded=true;app.round.finish();app.finish();await tick(3);assert.ok(app.winnerRoot.active&&!app.loseRoot.active);
await click(app.winnerRoot,'Content/Lobby');assert.ok(app.lobby.active&&!app.table.active);assert.equal(app.round,null);
await click(app.lobby,'Room/btn_02/RoomCard/02/joinBtn');assert.ok(app.quickSettingRoot.active);assert.equal(app.at(app.quickSettingRoot,'Layout1/num').getComponent(Label).string,'5');
const lobbyRequests=requests.filter(n=>n.includes('Lobby')).length;await click(app.quickSettingRoot,'Button1');assert.ok(app.lobby.active);assert.equal(requests.filter(n=>n.includes('Lobby')).length,lobbyRequests);
await click(app.lobby,'Sound');assert.equal(JSON.parse(storage.get('native')).game,'teenpatti');
console.log('PASS: lobby-first startup and quickSetting only after table entry, failed load/retry without charge, deferred table/lobby/results, seen/pack, both settlements, cached continue/switch, save');
})().catch(error=>{console.error(error);process.exitCode=1;});
