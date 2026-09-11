const assert=require('node:assert/strict');
const {loadSave,storeSave,randomPlayers}=require('./built-model.cjs');
const map=new Map([['rummy.local.balance','0']]);
const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
let s=loadSave(storage);assert.equal(s.balance,0);assert.equal(s.music,false);assert.equal(s.sound,false);
let native='';const bridge={getGameSave:()=>native,setGameSave:v=>native=v};
storeSave(s,storage,bridge);assert.equal(native,map.get('rummy.save.v1'));
const identity=JSON.stringify(s.player);s.balance=-40;storeSave(s,storage,bridge);
assert.equal(loadSave(storage,bridge).balance,-40);assert.equal(JSON.stringify(loadSave(storage,bridge).player),identity);
native=JSON.stringify({...s,balance:2000});assert.equal(loadSave(storage,bridge).balance,2000);
native='{broken';assert.equal(loadSave(storage,bridge).balance,-40);
const broken={getGameSave(){throw Error('expected read failure')},setGameSave(){throw Error('expected write failure')}};
storeSave(s,storage,broken);assert.equal(loadSave(storage,broken).balance,-40);
for(let i=0;i<200;i++){const players=randomPlayers(Math.random,s.player);assert.equal(players[0],s.player);assert.equal(new Set(players.map(p=>p.avatar)).size,5);assert.equal(new Set(players.map(p=>p.name)).size,5);}
console.log('PASS: native/browser saves, migration, zero/negative balance, corrupt/failed native fallback, fixed unique identity');
