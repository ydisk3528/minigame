const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('coderesoures/assets/main/index.007b7.js','utf8');
const ctx=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function _0x4a5d(')),ctx,{timeout:2000});vm.runInContext(source.slice(0,source.indexOf('System['))+'0);',ctx,{timeout:2000});
let aliases=[...source.matchAll(/(_0x\w+)\s*=\s*_0x5d1a\b/g)].map(x=>x[1]);aliases.push('_0x5d1a');
for(let pass=0;pass<8;pass++)for(const m of source.matchAll(/(_0x\w+)\s*=\s*(_0x\w+)\b/g))if(aliases.includes(m[2])&&!aliases.includes(m[1]))aliases.push(m[1]);
const re=new RegExp('(?:'+aliases.join('|')+')\\((0x[0-9a-f]+)\\)','g');
const decoded=source.replace(re,(_,num)=>JSON.stringify(ctx._0x5d1a(Number(num))));
fs.writeFileSync('coderesoures/main-readable.js',decoded.replace(/System\[/g,'\nSystem[').replace(/\},\{/g,'},\n{'));
console.log(aliases.length,decoded.length);
