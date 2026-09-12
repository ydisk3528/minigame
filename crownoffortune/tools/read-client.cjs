// Decode only the client's string table and its bounded rotation, never run the game or network code.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../coderesoures'),s=fs.readFileSync(path.join(root,'assets/game/index.df5e3.js'),'utf8');
const table=s.slice(s.lastIndexOf('function _0x2ae0(){'));
const init=s.slice(0,s.indexOf(',System['))+');';
const ctx=vm.createContext({});vm.runInContext(table+'\n'+init,ctx,{timeout:1000});
const aliases=new Set(['_0x3f6e',...Array.from(s.matchAll(/(_0x[0-9a-f]+)\s*=\s*_0x3f6e\b/g),m=>m[1])]);
for(let pass=0;pass<12;pass++)for(const m of s.matchAll(/(_0x[0-9a-f]+)\s*=\s*(_0x[0-9a-f]+)\b/g))if(aliases.has(m[2]))aliases.add(m[1]);
const readable=s.replace(/(_0x[0-9a-f]+)\((0x[0-9a-f]+)\)/g,(m,n,i)=>aliases.has(n)?JSON.stringify(ctx._0x3f6e(Number(i))):m);
const out=path.join(root,'analysis');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'game-readable.js'),readable);
console.log('Decoded string table; aliases:',aliases.size,'bytes:',readable.length);
