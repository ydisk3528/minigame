const assert = require('node:assert/strict');
const {reelFrame,reelStop,REEL}=require('./test-output/ReelMotion.js');
for(const turbo of [false,true])for(let c=0;c<5;c++) {
 const start=turbo?0:REEL.rise*5,stop=start+reelStop(c,turbo);
 for(let row=-1;row<5;row++) {
  const base=153.75-row*REEL.height;
  assert.equal(reelFrame(stop+.11,c,row,turbo).y,base);
  assert.ok(Math.abs(reelFrame(stop+.05,c,row,turbo).y-(base-30))<1e-8);
 }
 // The six wrapped cells remain evenly spaced throughout the full revolution.
 for(let t=start+.003;t<stop;t+=.013) {
  const ys=Array.from({length:6},(_,i)=>reelFrame(t,c,i-1,turbo).y).sort((a,b)=>a-b);
  for(let i=1;i<6;i++)assert.ok(Math.abs(ys[i]-ys[i-1]-102.5)<1e-7);
 }
}
assert.ok(reelStop(4,false)>reelStop(0,false));
assert.equal(reelStop(4,true),reelStop(0,true));
console.log('PASS continuous six-cell belt, spacing, sequential/turbo stops, overshoot and exact settling');

for(let c=0;c<5;c++)for(let r=0;r<4;r++){
 const stop=REEL.rise*5+.54;
 assert.equal(reelFrame(stop+.11,c,r,false,.54).y,153.75-r*102.5);
 assert.ok(reelFrame(stop+.11,c,r,false,.54).stopped);
}
console.log('PASS manual stop on an aligned belt cycle');
