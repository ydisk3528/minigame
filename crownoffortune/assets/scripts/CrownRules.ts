// Original 20 line routes; local simulation weights/paytable, not server odds.
export const LINES = [[1,4,7,10,13],[0,3,6,9,12],[2,5,8,11,14],[0,4,8,10,12],[2,4,6,10,14],[1,5,8,11,13],[1,3,6,9,13],[0,3,7,9,12],[2,5,7,11,14],[1,3,7,9,13],[1,5,7,11,13],[0,4,6,10,12],[2,4,8,10,14],[1,4,6,10,13],[1,4,8,10,13],[0,4,7,10,12],[2,4,7,10,14],[0,4,8,11,14],[2,4,6,9,12],[0,5,6,11,12]];
export const PAY = [[2,5,10],[3,6,15],[4,8,20],[5,10,30],[6,15,40],[8,20,60],[10,40,160],[10,50,1000]];
export const BETS = [1,2,3,5,10,15,20,30,50,75,100,150,200,300,500];
export const SYMBOLS = ['CHERRY','LEMON','ORANGE','PLUM','GRAPE','MELON','RED 7','WILD'];
export const money = (n: number) => Math.round(n * 100) / 100;
export type Hit = { line: number; symbol: number; count: number; win: number };
export type Step = { raw: number[]; grid: number[]; locks: boolean[]; hits: Hit[]; win: number };
export type Round = { id: number; bet: number; steps: Step[]; payout: number };
export type Save = { game: 'crownoffortune'; version: 1; balance: number; bet: number; muted: boolean; turbo: boolean; intro: boolean; pending: Round | null; history: { id: number; bet: number; payout: number; respins: number }[] };
export const fresh = (): Save => ({ game:'crownoffortune',version:1,balance:10000,bet:10,muted:false,turbo:false,intro:false,pending:null,history:[] });
export function evaluate(grid: number[], bet: number): Hit[] {
    const hits: Hit[] = [];
    LINES.forEach((line, index) => {
        let best: Hit | null = null;
        for (let symbol=0; symbol<8; symbol++) {
            let count=0;
            for (const i of line) { if (grid[i] === symbol || grid[i] === 7) count++; else break; }
            if (count<3) continue;
            const win=money(bet / 20 * PAY[symbol][count-3]);
            if (!best || win>best.win) best={line:index,symbol,count,win};
        }
        if (best) hits.push(best);
    });
    return hits;
}
export function makeRound(bet: number, rng = Math.random, id = Date.now()): Round {
    if (!BETS.includes(bet)) throw new Error('Invalid bet');
    const weights=[22,21,20,17,14,10,5,1];
    const draw = () => { let v=Math.min(.999999999,Math.max(0,rng()))*110; for(let s=0;s<8;s++){v-=weights[s];if(v<0)return s;}return 7; };
    let locks=Array(5).fill(false) as boolean[], payout=0;
    const steps: Step[]=[];
    // Each continuation must add a locked column, so no unbounded respin loop.
    for(let turn=0;turn<6;turn++) {
        const raw=Array.from({length:15},(_,i)=>locks[Math.floor(i/3)]?7:draw());
        const next=locks.map((locked,c)=>locked || raw.slice(c*3,c*3+3).includes(7));
        const grid=raw.map((s,i)=>next[Math.floor(i/3)]?7:s);
        const hits=evaluate(grid,bet), win=money(Math.min(bet*1000-payout,hits.reduce((a,h)=>a+h.win,0)));
        steps.push({raw,grid,locks:next,hits,win});payout=money(payout+win);
        const added=next.some((v,c)=>v&&!locks[c]);locks=next;
        if(!added || next.every(Boolean) || payout>=bet*1000) break;
    }
    return {id,bet,steps,payout};
}
export function begin(save: Save, rng = Math.random): Round | null {
    if(save.pending || save.balance<save.bet)return null;
    const r=makeRound(save.bet,rng);save.balance=money(save.balance-r.bet);save.pending=r;return r;
}
export function settle(save: Save): Round | null {
    const r=save.pending;if(!r)return null;
    save.balance=money(save.balance+r.payout);save.pending=null;
    save.history.unshift({id:r.id,bet:r.bet,payout:r.payout,respins:r.steps.length-1});save.history.length=Math.min(30,save.history.length);return r;
}
