const assert=require('node:assert/strict');
const {randomPlayers}=process.env.RUMMY_BUILT?require('./built-model.cjs'):require('../temp/round-check/PlayerIdentity.js');
let seed=1234;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const seen=new Set(),sets=new Set();
for(let i=0;i<200;i++){const players=randomPlayers(random);assert.equal(players.length,5);assert.equal(new Set(players.map(p=>p.avatar)).size,5);assert.equal(new Set(players.map(p=>p.name)).size,5);players.forEach(p=>{assert.ok(p.avatar>=0&&p.avatar<8);assert.ok(p.name.length>0);seen.add(p.avatar);});sets.add(players.map(p=>p.avatar).join(','));}
assert.equal(seen.size,8);assert.ok(sets.size>1);console.log('PASS: 200 rounds, unique avatars and names in every round, all 8 avatars selected');
