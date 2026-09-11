const fs=require('fs'),vm=require('vm'),path=require('path');
const src=path.resolve('../codesoures/GET-cyh1hmna250.bdlqzy99.com/h5/games/18/18032/fa00246/assets/main/index.js');
const ctx=vm.createContext({System:{register(){}}});
vm.runInContext(fs.readFileSync(src,'utf8'),ctx,{timeout:10000});
const map={};for(let i=0x100;i<0x1b00;i++){try{map['0x'+i.toString(16)]=vm.runInContext('_0160_0x4970('+i+')',ctx,{timeout:100});}catch{}}
fs.writeFileSync('tools/reference/strings.json',JSON.stringify(map));console.log(Object.keys(map).length);
