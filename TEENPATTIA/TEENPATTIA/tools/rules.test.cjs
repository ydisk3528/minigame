const assert = require('node:assert/strict');
const { Round, rank, compare } = require('./test-build/TeenPattiRules.js');
const counts = [0,0,0,0,0,0];
for(let a=0;a<52;a++)for(let b=a+1;b<52;b++)for(let c=b+1;c<52;c++) counts[rank([a,b,c])[0]]++;
assert.deepEqual(counts,[16440,3744,1096,720,48,52]);
assert.equal(compare([12,0,1],[11,10,9]),1); // A23 beats KQJ
assert.equal(compare([12,11,10],[12,0,1]),1); // AKQ beats A23
let seed=17; const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let n=0;n<1000;n++) {
 const r=new Round(1,[1000,1000,1000,1000,1000],n%5,rng);
 assert.equal(new Set(r.players.flatMap(p=>p.cards)).size,15);
 let steps=0;
 while(!r.ended && steps++<2000){
  if(r.pending)r.respond(rng()<.7);
  else {
   if(rng()<.25)r.see(r.turn);
   const actions=['pack','call','raise','show'].filter(a=>r.can(a));
   r.act(actions[Math.floor(rng()*actions.length)]);
  }
  assert.equal(r.players.reduce((s,p)=>s+p.money,0)+r.pot,5000);
  assert.ok(r.players.every(p=>p.money>=0));
 }
 assert.ok(r.ended,'round must terminate');
 const before=r.players.map(p=>p.money);r.finish();assert.deepEqual(r.players.map(p=>p.money),before);
}
const r=new Round(1,[1000,1000,1000,1000,1000],4,rng);
assert.equal(r.can('show'),false);
assert.throws(()=>r.act('show'));
for(const p of r.players)p.seen=true;
r.act('show');assert.equal(r.pending.to,4);r.respond(false);assert.equal(r.alive.length,5);
r.turn=0;r.players[0].cards=[12,11,10];r.players[4].cards=[25,24,23];r.act('show');r.respond(true);assert.ok(r.players[0].folded,'tied requester loses side show');
console.log('PASS: all 22,100 hands, 1,000 seeded rounds, conservation, unique deal, eligibility and idempotent settlement');
