// @ts-nocheck
// Local rules, independent of the original remote game service.
export const SUITS=['♣','♦','♥','♠'];
export const rankName=n=>({1:'A',11:'J',12:'Q',13:'K',0:'★'}[n]||String(n));
export const wild=(c,j)=>c.rank===0||c.rank===j;
export const points=(c,j)=>wild(c,j)?0:c.rank===1?10:Math.min(10,c.rank);
export function deck(){let out=[];for(let copy=0;copy<2;copy++){for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)out.push({id:out.length,suit,rank});out.push({id:out.length,suit:4,rank:0});}return out;}
export function shuffle(a,rng=Math.random){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function meld(cards,j){
 if(cards.length<3)return null;
 const naturalRun=cards.every(c=>c.rank>0&&c.suit===cards[0].suit)&&new Set(cards.map(c=>c.rank)).size===cards.length;
 const consecutive=a=>{a.sort((a,b)=>a-b);return a.at(-1)-a[0]+1===a.length;};
 if(naturalRun&&(consecutive(cards.map(c=>c.rank))||consecutive(cards.map(c=>c.rank===1?14:c.rank))))return 'pure';
 const n=cards.filter(c=>!wild(c,j));
 if(!n.length)return null;
 if(cards.length<=4&&n.every(c=>c.rank===n[0].rank)&&new Set(n.map(c=>c.suit)).size===n.length)return 'set';
 if(cards.length>13||!n.every(c=>c.suit===n[0].suit)||new Set(n.map(c=>c.rank)).size!==n.length)return null;
 for(const high of [false,true]){
  const ranks=n.map(c=>c.rank===1&&high?14:c.rank).sort((a,b)=>a-b);
  const lo=high?2:1,hi=high?14:13;
  if(ranks.at(-1)-ranks[0]+1<=cards.length&&Math.max(lo,ranks.at(-1)-cards.length+1)<=Math.min(ranks[0],hi-cards.length+1))return 'impure';
 }
 return null;
}
// Exact subset search: 13/14 cards only. Physical card IDs keep duplicate decks distinct.
export function analyze(hand,j){
 const n=hand.length,full=(1<<n)-1,groups=[],byBit=Array.from({length:n},()=>[]),sums=new Int16Array(full+1);
 for(let mask=1;mask<=full;mask++){
  const bit=mask&-mask,i=31-Math.clz32(bit);sums[mask]=sums[mask^bit]+points(hand[i],j);
  const cards=[];for(let k=0;k<n;k++)if(mask&(1<<k))cards.push(hand[k]);
  const type=meld(cards,j);if(type){const g={mask,type,cards};groups.push(g);for(let k=0;k<n;k++)if(mask&(1<<k))byBit[k].push(g);}
 }
 const cache=new Map();
 function solve(mask){
  if(!mask)return new Map([[0,{cost:0,groups:[]}]]);
  if(cache.has(mask))return cache.get(mask);
  const bit=mask&-mask,i=31-Math.clz32(bit),out=new Map();
  const coverage=r=>r.groups.reduce((n,g)=>n+g.cards.length,0);
  const keep=(key,value)=>{const old=out.get(key);if(!old||value.cost<old.cost||(value.cost===old.cost&&coverage(value)>coverage(old)))out.set(key,value);};
  for(const [key,r] of solve(mask^bit))keep(key,{cost:r.cost+points(hand[i],j),groups:r.groups});
  for(const g of byBit[i])if((mask&g.mask)===g.mask){
   for(const [key,r] of solve(mask^g.mask)){
    const pure=(key&1)||(g.type==='pure'?1:0),seq=Math.min(2,(key>>1)+(g.type==='set'?0:1));
    keep((seq<<1)|pure,{cost:r.cost,groups:[g,...r.groups]});
   }
  }
  cache.set(mask,out);return out;
 }
 const outcomes=solve(full),complete=outcomes.get(5);
 let best={cost:sums[full],groups:[]};
 // Before two sequences exist, only a pure sequence can reduce penalty points.
 for(const g of groups)if(g.type==='pure'&&sums[full]-sums[g.mask]<best.cost)best={cost:sums[full]-sums[g.mask],groups:[g]};
 if(complete&&complete.cost<=best.cost)best=complete;
 const used=best.groups.reduce((m,g)=>m|g.mask,0);
 return {score:Math.min(80,best.cost),rawScore:best.cost,valid:n===13&&complete?.cost===0&&complete.groups.reduce((m,g)=>m|g.mask,0)===full,groups:best.groups,loose:hand.filter((_,i)=>!(used&(1<<i)))};
}
export function chooseDiscard(hand,j,blockedId=null){
 let best;
 for(let i=0;i<hand.length;i++){
  if(hand[i].id===blockedId)continue;
  const remaining=hand.filter((_,k)=>k!==i),r=analyze(remaining,j);
  // Prefer complete declarations, then lower unmatched points; preserve wildcards on ties.
  const value=(r.valid?-1000:0)+r.rawScore*10+(wild(hand[i],j)?5:0)-points(hand[i],j)/20;
  if(!best||value<best.value)best={index:i,result:r,value};
 }
 return best;
}
