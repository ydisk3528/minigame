// Execute only the pure model modules from Creator's actual output, with engine registration stubbed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const definitions=new Map(),loaded=new Map();
const stub={cclegacy:{_RF:{push(){},pop(){}}},__checkObsolete__(){},__checkObsoleteInNamespace__(){}};
const context=vm.createContext({console,System:{register(id,deps,declare){if(Array.isArray(id)){deps(()=>{},{}).execute();return;}definitions.set(id,{deps,declare});}}});
function builtScript(folder,base){const dir=path.join(__dirname,'../build/web-mobile',folder);const name=fs.readdirSync(dir).find(n=>n===base+'.js'||(n.startsWith(base+'.')&&n.endsWith('.js')));if(!name)throw Error('Missing built script '+base);return fs.readFileSync(path.join(dir,name),'utf8');}
vm.runInContext(builtScript('assets/main','index'),context);
vm.runInContext(builtScript('src/chunks','bundle'),context);
function load(id){
    if(id==='cc')return stub;
    if(loaded.has(id))return loaded.get(id);
    const entry=definitions.get(id);if(!entry)throw Error('Missing module '+id);
    const exports={};loaded.set(id,exports);
    const declaration=entry.declare((name,value)=>{if(typeof name==='object')Object.assign(exports,name);else exports[name]=value;return value;},{id});
    entry.deps.forEach((dep,i)=>declaration.setters[i](load(dep.startsWith('.')?new URL(dep,id).href:dep)));
    declaration.execute();return exports;
}
module.exports={loadSave:load('chunks:///_virtual/GameSave.ts').loadSave,storeSave:load('chunks:///_virtual/GameSave.ts').storeSave,randomPlayers:load('chunks:///_virtual/PlayerIdentity.ts').randomPlayers,Round:load('chunks:///_virtual/Round.ts').Round,deck:load('chunks:///_virtual/Rules.ts').deck};
