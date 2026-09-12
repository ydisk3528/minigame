import { BETS, fresh, Save, money } from './CrownRules';
type Bridge = { getGameSave(): string; setGameSave(json: string): void };
const KEY='crownoffortune.local.v1';
const cash=(n: unknown): n is number => typeof n==='number' && Number.isFinite(n) && n>=0 && n===money(n) && n<1e14;
export function parseSave(raw: string | null): Save | null {
    try {
        let v=JSON.parse(raw||'null');if(typeof v==='string')v=JSON.parse(v);
        if(v?.game!=='crownoffortune'||v.version!==1||!cash(v.balance))return null;
        const s: Save={...fresh(),balance:v.balance,bet:BETS.includes(v.bet)?v.bet:10,muted:!!v.muted,turbo:!!v.turbo,intro:!!v.intro};
        s.history=Array.isArray(v.history)?v.history.filter((h:any)=>h&&cash(h.id)&&BETS.includes(h.bet)&&cash(h.payout)&&h.payout<=h.bet*1000&&Number.isInteger(h.respins)&&h.respins>=0&&h.respins<=5).slice(0,30):[];
        const r=v.pending;
        if(r) {
            const grid=(g:any)=>Array.isArray(g)&&g.length===15&&g.every((n:any)=>Number.isInteger(n)&&n>=0&&n<8);
            if(!cash(r.id)||!BETS.includes(r.bet)||!cash(r.payout)||r.payout>r.bet*1000||!Array.isArray(r.steps)||r.steps.length<1||r.steps.length>6) return null;
            if(!r.steps.every((t:any)=>grid(t.raw)&&grid(t.grid)&&cash(t.win)&&Array.isArray(t.locks)&&t.locks.length===5&&t.locks.every((n:any)=>typeof n==='boolean')&&Array.isArray(t.hits)&&t.hits.every((h:any)=>Number.isInteger(h.line)&&h.line>=0&&h.line<20&&Number.isInteger(h.count)&&h.count>=3&&h.count<=5&&cash(h.win))))return null;
            if(money(r.steps.reduce((n:number,t:any)=>n+t.win,0))!==r.payout)return null;
            s.pending=r;
        }
        return s;
    }catch{return null;}
}
export function nativeSaveBridge(): Bridge | undefined {return (window as Window & {cocosJava?:Bridge}).cocosJava;}
export function loadSave(storage: Storage,bridge?: Bridge): Save {
    let s: Save|null=null;
    try{s=parseSave(bridge?.getGameSave()||null);}catch(e){console.warn('Native save read failed',e);}
    if(!s)try{s=parseSave(storage.getItem(KEY));}catch(e){console.warn('Local save read failed',e);}
    return s||fresh();
}
export function storeSave(s: Save,storage: Storage,bridge?: Bridge): void {
    const json=JSON.stringify(s);
    try{storage.setItem(KEY,json);}catch(e){console.warn('Local save write failed',e);}
    try{bridge?.setGameSave(json);}catch(e){console.warn('Native save write failed',e);}
}
