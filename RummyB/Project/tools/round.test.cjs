const assert=require('node:assert/strict');
const {Round}=process.env.RUMMY_BUILT?require('./built-model.cjs'):require('../temp/round-check/Round.js');
const {deck}=process.env.RUMMY_BUILT?require('./built-model.cjs'):require('../temp/round-check/Rules.js');
function conserved(round){const cards=[...round.stock,...round.pile,round.indicator,...round.seats.flatMap(s=>s.hand)];assert.equal(cards.length,106);assert.equal(new Set(cards.map(c=>c.id)).size,106);}
const r=new Round(2,()=>.43);conserved(r);
assert.equal(r.seats.length,5);assert.ok(r.seats.every(s=>s.hand.length===13));
r.canDrawJ=true;const open=r.pile.at(-1);assert.equal(r.draw(true),true);conserved(r);
assert.equal(r.discard(open.id),false,'cannot immediately return picked open card');
assert.equal(r.draw(false),false,'cannot draw twice');
assert.equal(r.discard(r.current.hand.find(c=>c.id!==open.id).id),true);assert.equal(r.turn,1);conserved(r);
for(let i=0;i<4&&r.phase!=='ended';i++){r.bot();conserved(r);}
if(r.phase!=='ended')assert.equal(r.turn,0);
const grouping=new Round(1,()=>.33);const ids=grouping.current.hand.slice(0,3).map(c=>c.id);assert.equal(grouping.group(ids),true);assert.ok(grouping.current.groups.some(g=>g.join()===ids.join()));conserved(grouping);
assert.equal(grouping.group([ids[0],ids[0]]),false);grouping.move(ids[0],grouping.current.hand.at(-1).id);conserved(grouping);
const dropping=new Round();dropping.drop();assert.equal(dropping.seats[0].penalty,20);assert.equal(dropping.seats[0].dropped,true);conserved(dropping);
const laterDrop=new Round();laterDrop.draw(false);laterDrop.drop();assert.equal(laterDrop.seats[0].penalty,40);conserved(laterDrop);
const win=new Round(5);win.indicator={id:999,suit:0,rank:13};
const physical=deck();const take=(s,r)=>physical.find(c=>c.suit===s&&c.rank===r);
win.seats[0].hand=[take(0,1),take(0,2),take(0,3),take(1,4),take(1,5),take(1,6),take(0,9),take(1,9),take(2,9),take(3,9),take(2,10),take(2,11),take(2,12)];
win.sort();assert.equal(win.canDeclare(),true);assert.equal(win.canDeclare(-123),false);assert.equal(win.declare(),true);assert.equal(win.winner,0);assert.equal(win.deltas.reduce((a,b)=>a+b),0);assert.ok(win.deltas[0]>=0);
const invalid=new Round();invalid.seats[0].hand=physical.filter(c=>c.suit===0).slice(0,13).map((c,i)=>({...c,rank:i%2+1}));invalid.declare();assert.equal(invalid.seats[0].penalty,80);assert.equal(invalid.seats[0].dropped,true);
console.log('PASS: card conservation, open draw restrictions, five-seat turns, grouping, drops, declarations, zero-sum settlement');

const joker=new Round(1,()=>.43);
const blocked=joker.stock[0];joker.indicator.rank=blocked.rank;joker.stock.splice(joker.stock.indexOf(blocked),1);joker.pile.push(blocked);
assert.equal(joker.canDrawOpen,false);assert.equal(joker.draw(true),false);assert.equal(joker.phase,'draw');conserved(joker);
joker.canDrawJ=true;assert.equal(joker.draw(true),true);assert.equal(joker.discard(blocked.id),false);conserved(joker);
const idle=new Round(1,()=>.43);idle.timeout();assert.equal(idle.phase,'discard');assert.equal(idle.current.hand.length,14);const drawn=idle.actionCard;
idle.timeout();assert.equal(idle.turn,1);assert.equal(idle.autoDiscardCount,1);assert.equal(idle.pile.at(-1).id,drawn);conserved(idle);
// Isolate the next own turn from bot declarations.
idle.turn=0;idle.phase='draw';idle.timeout();idle.timeout();assert.equal(idle.seats[0].dropped,true);assert.equal(idle.seats[0].penalty,40);conserved(idle);
const resumed=new Round(1,()=>.43);resumed.timeout();resumed.timeout();resumed.turn=0;resumed.phase='draw';assert.equal(resumed.draw(false),true);assert.equal(resumed.autoDiscardCount,0);resumed.timeout();assert.equal(resumed.seats[0].dropped,false);conserved(resumed);
const adding=new Round(1,()=>.33);const picked=adding.current.hand.slice(0,2).map(c=>c.id);adding.group(picked);const target=adding.current.groups.findIndex(g=>!g.includes(picked[0]));assert.equal(adding.addToGroup(picked,target),true);assert.ok(adding.current.groups.some(g=>picked.every(id=>g.includes(id))));assert.equal(adding.addToGroup([9999],0),false);conserved(adding);
console.log('PASS: Joker policy, phased timeout, inactivity drop, manual recovery, add to existing group');
