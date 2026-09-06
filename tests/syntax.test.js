const fs=require('node:fs');
const vm=require('node:vm');
const files=[];
function collect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory()) collect(path);else if(path.endsWith('.js')) files.push(path);}}
collect('js');
for(const file of files) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
const html=fs.readFileSync('index.html','utf8');
const inline=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
new vm.Script(inline,{filename:'index.html:inline'});
console.log('syntax tests: OK');
