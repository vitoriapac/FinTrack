const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');
const views=['home','lancamentos','vencimentos','balanco','planejamento','metas','cadastro'];
const viewFiles={
  home:'js/views/home.js',
  lancamentos:'js/views/lancamentos.js',
  vencimentos:'js/views/vencimentos.js',
  balanco:'js/views/balanco.js',
  planejamento:'js/views/planejamento.js',
  metas:'js/views/metas.js',
  cadastro:'js/views/cadastro.js',
};

for(const view of views){
  const file=viewFiles[view];
  assert.ok(html.includes(`src="${file}"`),`view não carregada: ${file}`);
  const source=fs.readFileSync(file,'utf8');
  assert.match(source,new RegExp(`register\\(['"]${view}['"]`),`view não registrada: ${view}`);
}

for(const required of ['btn-novo-lancamento','btn-nova-transferencia','btn-novo-investimento','btn-nova-meta']){
  assert.ok(html.includes(required)||Object.values(viewFiles).some(file=>fs.readFileSync(file,'utf8').includes(required)),`ação ausente: ${required}`);
}

assert.ok(app.includes('FinTrackStorage.set'),'persistência não conectada');
assert.ok(app.includes('normalizeData(DEFAULT_DATA)'),'fallback não normalizado');
console.log('ui smoke tests: OK');
