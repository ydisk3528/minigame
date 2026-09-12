const assert=require('node:assert/strict');
const {LINES,evaluate,makeBoard,bonusDeck,newBonus,revealCard}=require('./test-output/SlotRules.js');
assert.equal(LINES.length,100);assert.equal(new Set(LINES.map(JSON.stringify)).size,100);
for(const line of LINES){assert.equal(line.length,5);line.forEach((p,c)=>assert.equal(Math.floor(p/4),c));}
assert.equal(evaluate(Array(20).fill(0),100).total,4000);
assert.equal(evaluate(Array(20).fill(8),100).total,0);
assert.equal(evaluate(Array(20).fill(8),100).bonus,true);
const expanded=Array.from({length:20},(_,i)=>i%8);expanded[6]=9;
const result=evaluate(expanded,100);assert.deepEqual(result.expanded.slice(4,8),[9,9,9,9]);assert.notDeepEqual(expanded.slice(4,8),[9,9,9,9]);
assert.throws(()=>evaluate([],100));assert.throws(()=>evaluate(Array(20).fill(0),0));assert.throws(()=>evaluate(Array(20).fill(10),100));
for(let i=0;i<300;i++){const board=makeBoard();assert.equal(board.length,20);const r=evaluate(board,100);assert.ok(Number.isFinite(r.total)&&r.total>=0);const d=bonusDeck();assert.equal(d.length,15);const state=newBonus();for(let j=0;j<15;j++)revealCard(state,j);assert.ok(state.winner>=0);assert.ok([1,2,5,10].includes(state.multiplier));}
console.log('PASS: original paylines, payouts, expansion, scatter, validation, 300 boards and card decks');

const state={deck:[4,5,3,6,0,0,0,1,1,1,2,2,2,3,3],picked:[],counts:[0,0,0,0],multiplier:1,clubRemoved:false,winner:-1};
revealCard(state,0);revealCard(state,1);assert.equal(state.multiplier,10);revealCard(state,1);assert.equal(state.multiplier,10);
revealCard(state,2);assert.equal(state.counts[3],1);revealCard(state,3);assert.equal(state.counts[3],0);assert.ok(state.picked.includes(13)&&state.picked.includes(14));
revealCard(state,4);revealCard(state,5);revealCard(state,6);assert.equal(state.winner,0);assert.deepEqual(revealCard(state,7),[]);
console.log('PASS: x2/x5 multipliers, club removal, repeat-click and post-win guards');
