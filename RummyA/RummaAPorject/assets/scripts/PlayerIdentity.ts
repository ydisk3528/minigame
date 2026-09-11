import {shuffle} from './Rules';

const femaleNames=['Alice','Sophie','Mia','Emma','Chloe','Nina','Grace','Ruby','Lily','Zoe','Anna','Eva'];
const maleNames=['Leo','Jack','Noah','Ryan','Alex','Ethan','Lucas','Adam','Owen','Max','Oscar','Liam'];

/** Sample without replacement: four female assets followed by four male assets. */
export function randomPlayers(random:()=>number=Math.random,local?:{avatar:number;name:string}):{avatar:number;name:string}[]{
    const women=shuffle(femaleNames.slice(),random),men=shuffle(maleNames.slice(),random);
    const pool=shuffle(Array.from({length:8},(_,i)=>i).filter(i=>i!==local?.avatar),random);
    if(local){for(const names of [women,men]){const i=names.indexOf(local.name);if(i>=0)names.splice(i,1);}}
    const opponents=pool.slice(0,local?4:5).map(avatar=>({avatar,name:(avatar<4?women:men).pop()!}));
    return local?[local,...opponents]:opponents;
}
