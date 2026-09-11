import {randomPlayers} from './PlayerIdentity';
export type GameSave={game:'rummy';version:1;balance:number;player:{avatar:number;name:string};music:boolean;sound:boolean;records:{time:string;delta:number;balance:number}[]};
type Bridge={getGameSave():string;setGameSave(json:string):void};
const key='rummy.save.v1';
function parse(raw:string|null):GameSave|null {
    try{const s=JSON.parse(raw||'null');return s?.game==='rummy'&&s.version===1&&Number.isFinite(s.balance)&&Number.isInteger(s.player?.avatar)&&s.player.avatar>=0&&s.player.avatar<8&&typeof s.player.name==='string'&&s.player.name.length>0&&s.player.name.length<=40&&typeof s.music==='boolean'&&typeof s.sound==='boolean'&&Array.isArray(s.records)&&s.records.every((r:any)=>typeof r?.time==='string'&&Number.isFinite(r.delta)&&Number.isFinite(r.balance))?s:null;}catch{return null;}
}
export function loadSave(storage:Storage,bridge?:Bridge):GameSave {
    let saved:GameSave|null=null;
    try{saved=parse(bridge?.getGameSave()||null);}catch(e){console.warn('Native save read failed',e);}
    if(!saved)try{saved=parse(storage.getItem(key));}catch{}
    if(saved)return saved;
    const fresh:GameSave={game:'rummy',version:1,balance:10000,player:randomPlayers()[0],music:false,sound:false,records:[]};
    try{
        const raw=storage.getItem('rummy.local.balance');if(raw!==null&&raw.trim()!==''&&Number.isFinite(Number(raw)))fresh.balance=Number(raw);
        fresh.music=storage.getItem('rummy.music')==='on';fresh.sound=storage.getItem('rummy.sound')==='on';
        const records=JSON.parse(storage.getItem('rummy.local.records')||'[]');
        if(Array.isArray(records))fresh.records=records.filter(r=>typeof r?.time==='string'&&Number.isFinite(r.delta)&&Number.isFinite(r.balance)).slice(-30);
    }catch{}
    return fresh;
}
export function storeSave(save:GameSave,storage:Storage,bridge?:Bridge){
    const json=JSON.stringify(save);
    try{storage.setItem(key,json);}catch(e){console.warn('Browser save failed',e);}
    try{bridge?.setGameSave(json);}catch(e){console.warn('Native save write failed',e);}
}
export function nativeSaveBridge():Bridge|undefined{return (window as Window&{cocosJava?:Bridge}).cocosJava;}
