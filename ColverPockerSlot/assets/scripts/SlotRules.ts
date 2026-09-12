// Original client WIN_LINE (column-major 5 x 4). Local demo payout weights below.
export const LINES: number[][] = [[1, 5, 9, 13, 17], [2, 6, 10, 14, 18], [0, 4, 8, 12, 16], [3, 7, 11, 15, 19], [2, 7, 11, 15, 18], [1, 4, 8, 12, 17], [0, 5, 9, 13, 16], [3, 6, 10, 14, 19], [2, 7, 10, 15, 18], [1, 4, 9, 12, 17], [0, 5, 8, 13, 16], [3, 6, 11, 14, 19], [1, 7, 9, 15, 17], [2, 4, 10, 12, 18], [0, 6, 8, 14, 16], [3, 5, 11, 13, 19], [0, 4, 9, 12, 16], [3, 7, 10, 15, 19], [2, 6, 11, 14, 18], [1, 5, 8, 13, 17], [0, 7, 8, 15, 16], [3, 4, 11, 12, 19], [1, 6, 9, 14, 17], [2, 5, 10, 13, 18], [0, 5, 10, 14, 19], [3, 6, 9, 13, 16], [1, 7, 11, 15, 17], [2, 4, 8, 12, 18], [0, 6, 11, 13, 16], [3, 5, 8, 14, 19], [1, 7, 10, 12, 18], [2, 4, 9, 15, 17], [0, 5, 10, 13, 16], [3, 6, 9, 14, 19], [2, 7, 8, 15, 17], [1, 4, 11, 12, 18], [1, 6, 10, 15, 16], [2, 5, 9, 12, 19], [0, 4, 11, 13, 18], [3, 7, 8, 14, 17], [1, 5, 11, 12, 18], [2, 6, 8, 15, 17], [0, 4, 10, 13, 19], [3, 7, 9, 14, 16], [1, 6, 8, 13, 19], [2, 5, 11, 14, 16], [0, 7, 10, 15, 17], [3, 4, 9, 12, 18], [1, 5, 10, 15, 16], [2, 6, 9, 12, 19], [0, 7, 11, 14, 17], [3, 4, 8, 13, 18], [2, 7, 9, 14, 16], [1, 4, 10, 13, 19], [0, 6, 8, 15, 17], [3, 5, 11, 12, 18], [0, 4, 9, 14, 19], [3, 7, 10, 13, 16], [1, 6, 11, 12, 17], [2, 5, 8, 15, 18], [1, 5, 10, 12, 19], [2, 6, 9, 15, 16], [1, 5, 11, 14, 16], [2, 6, 8, 13, 19], [0, 5, 10, 15, 19], [3, 6, 9, 12, 16], [2, 7, 8, 13, 18], [1, 4, 11, 14, 17], [2, 7, 10, 13, 16], [1, 4, 9, 14, 19], [0, 4, 10, 15, 17], [3, 7, 9, 12, 18], [0, 5, 11, 14, 16], [3, 6, 8, 13, 19], [0, 6, 9, 15, 17], [3, 5, 10, 12, 18], [0, 6, 10, 15, 17], [3, 5, 9, 12, 18], [2, 7, 11, 13, 16], [1, 4, 8, 14, 19], [0, 6, 11, 15, 17], [3, 5, 8, 12, 18], [0, 7, 8, 14, 17], [3, 4, 11, 13, 18], [1, 7, 8, 14, 16], [2, 4, 11, 13, 19], [1, 7, 9, 12, 18], [2, 4, 10, 15, 17], [0, 7, 9, 14, 17], [3, 4, 10, 13, 18], [1, 6, 11, 15, 16], [2, 5, 8, 12, 19], [1, 6, 9, 12, 19], [2, 5, 10, 15, 16], [0, 7, 11, 13, 18], [3, 4, 8, 14, 17], [0, 7, 10, 13, 18], [3, 4, 9, 14, 17], [1, 6, 8, 12, 19], [2, 5, 11, 15, 16]];
export const PAYOUTS = [[5,15,40],[5,15,40],[8,20,50],[8,20,50],[15,40,100],[12,30,80],[12,30,80],[25,100,250],[0,0,0],[25,100,250]];
export function evaluate(board: number[], bet: number) {
    if (board.length !== 20 || board.some(v => !Number.isInteger(v) || v < 0 || v > 9) || !Number.isFinite(bet) || bet <= 0) throw new Error('Invalid spin');
    const expanded = board.slice(); const wildColumns: number[] = [];
    for (let c = 0; c < 5; c++) if (board.slice(c*4,c*4+4).includes(9)) {
        wildColumns.push(c); for (let r = 0; r < 4; r++) expanded[c*4+r] = 9;
    }
    const wins: {line:number; cells:number[]; amount:number}[] = [];
    LINES.forEach((line,index) => {
        // Pay the best interpretation, including an initial run of wilds.
        let best = 0, count = 0;
        for (let symbol = 0; symbol < 10; symbol++) {
            if (symbol === 8) continue;
            let n = 0; for (const p of line) { if (expanded[p] !== symbol && expanded[p] !== 9) break; n++; }
            const amount = n >= 3 ? Math.round(bet * PAYOUTS[symbol][n-3]) : 0;
            if (amount > best) { best = amount; count = n; }
        }
        if (best) wins.push({line:index,cells:line.slice(0,count),amount:best/100});
    });
    return {expanded,wildColumns,wins,total:Math.round(wins.reduce((v,w)=>v+w.amount,0)*100)/100,bonus:board.filter(v=>v===8).length>=3};
}
export function makeBoard(random:()=>number = Math.random): number[] {
    // ponytail: local demonstration distribution; original server reel strips and RTP are unavailable.
    return Array.from({length:20},()=> {const r=random(); return r<0.008?9:r<0.025?8:Math.floor((r-0.025)/0.975*8);}).map(v=>Math.max(0,v));
}
export function bonusDeck(random:()=>number = Math.random):number[] {
    const deck = [...Array.from({length:12},(_,i)=>i%4),4,5,6];
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    return deck;
}

export interface BonusState { deck:number[]; picked:number[]; counts:number[]; multiplier:number; clubRemoved:boolean; winner:number; }
export function newBonus(random:()=>number=Math.random):BonusState {return {deck:bonusDeck(random),picked:[],counts:[0,0,0,0],multiplier:1,clubRemoved:false,winner:-1};}
export function revealCard(state:BonusState,index:number):number[] {
    if(!Number.isInteger(index)||index<0||index>=state.deck.length)throw new Error('Invalid card');
    if(state.winner>=0||state.picked.includes(index))return [];
    const changed=[index],face=state.deck[index];state.picked.push(index);
    if(face===4)state.multiplier*=2;
    else if(face===5)state.multiplier*=5;
    else if(face===6){
        state.clubRemoved=true;state.counts[3]=0;
        state.deck.forEach((card,i)=>{if(card===3){if(!state.picked.includes(i))state.picked.push(i);changed.push(i);}});
    } else {state.counts[face]++;if(state.counts[face]===3)state.winner=face;}
    return changed;
}
