const fs=require('node:fs');
const vm=require('node:vm');
const files=[];
function collect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory()) collect(path);else if(path.endsWith('.js')) files.push(path);}}
collect('js');
for(const file of files) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const html=fs.readFileSync('index.html','utf8');
assertNoInlineScripts(html);
console.log('syntax tests: OK');

function assertNoInlineScripts(source){
  if(/<script(?![^>]*\bsrc=)[^>]*>/i.test(source)) throw new Error('index.html contém JavaScript inline');
}
