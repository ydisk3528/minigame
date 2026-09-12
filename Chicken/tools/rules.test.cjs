const assert = require('node:assert/strict');
const R = require('./test-build/ChickenRound.js');
const S = require('./test-build/GameSave.js');
let s=R.fresh();
assert.ok(R.startRound(s)); assert.equal(s.balance,9990); assert.equal(R.startRound(s),false);
assert.equal(R.settle(s,true),null); assert.equal(R.jump(s,()=>0),'safe');
assert.equal(R.settle(s,true).payout,10.6); assert.equal(s.balance,10000.6);
assert.equal(R.settle(s,true),null,'settlement is idempotent');
R.startRound(s); assert.equal(R.jump(s,()=>1),'lost'); assert.equal(s.balance,9990.6); assert.equal(s.round,null);
s=R.fresh();R.startRound(s);for(let i=0;i<6;i++)R.jump(s,()=>0);
assert.equal(R.jump(s,()=>0),'bonus');assert.equal(s.round.pending,0);
assert.equal(R.jump(s,()=>0),'blocked');assert.equal(R.settle(s,true),null);
s=S.parseSave(JSON.stringify(s));assert.equal(s.round.pending,0,'uncollected prize survives reload');
assert.equal(R.collectBonus(s),100000);assert.equal(R.collectBonus(s),0);assert.equal(s.balance,109990);
R.jump(s,()=>1);assert.equal(s.balance,109990,'collision retains collected bonus');
assert.equal(s.history[0].payout,100000);
for(let mode=0;mode<3;mode++){
 s=R.fresh();s.mode=mode;R.startRound(s);
 for(let i=0;i<R.LANES[mode];i++){R.jump(s,()=>0);if(s.round.pending!==null)R.collectBonus(s);}
 assert.equal(R.jump(s,()=>0),'blocked');const h=R.settle(s,true);assert.ok(h.payout<=s.bet*30000);
 assert.equal(s.balance,10000-s.bet+h.payout);
}
for(const raw of ['null','{',JSON.stringify({game:'other',version:1,balance:10}),JSON.stringify({game:'chicken',version:1,balance:-1})])assert.equal(S.parseSave(raw),null);
let bad=R.fresh();bad.bet=-100;bad.mode=9;bad.round={bet:10,mode:8,stage:1,bonus:0,pending:100};assert.equal(S.parseSave(JSON.stringify(bad)).round,null);
const storage=new Map(),bridge={getGameSave:()=>storage.get('native')||'',setGameSave:v=>storage.set('native',v)},local={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
S.storeSave(s,local,bridge);assert.deepEqual(S.loadSave(local,bridge),s);
storage.set('native','invalid');assert.deepEqual(S.loadSave(local,bridge),s,'native failure falls back to browser save');
console.log('PASS: stake/settlement, collision, pending bonus reload, bonus idempotence, caps, all modes, validation and save bridge');
