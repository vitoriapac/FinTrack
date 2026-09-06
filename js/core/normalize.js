(function(){
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const arrays=['contas','categorias','lancamentos','metas','cartoes','dividas','pagamentosCartao','pagamentosDividas','historico','lixeira','operacoes','series'];
  function normalizeData(input,fallback){
    const source=input||fallback||{},data=window.FinTrackMigrations.migrateData(source);
    arrays.forEach(key=>{if(!Array.isArray(data[key])) data[key]=[];});
    ['planejamentos','fechamentos'].forEach(key=>{if(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key])) data[key]={};});
    data._backups=Array.isArray(data._backups)?data._backups:[];
    data.lancamentos=data.lancamentos.map(item=>({...item,tipoOperacao:item.tipoOperacao||(item.natureza==='transferencia'?'transferencia':item.natureza==='investimento'?'investimento':item.tipo==='Receita'?'receita':'despesa'),operacaoId:item.operacaoId||null,serieStatus:item.serieId?(item.serieStatus||'ativa'):undefined}));
    const known=new Set(data.series.map(series=>series.id));
    data.lancamentos.filter(item=>item.serieId&&!known.has(item.serieId)).forEach(item=>{data.series.push({id:item.serieId,tipo:item.serieTipo||'serie',status:item.serieStatus||'ativa',criadaEm:item.data});known.add(item.serieId);});
    data.categorias=data.categorias.map(category=>{const name=String(category.nome||'').toLowerCase();return category.id==='cat-investimento'||category.id==='cat-transferencia'||name.includes('investimento')||name.includes('transferência')?{...category,natureza:'movimentacao'}:category;});
    return data;
  }
  window.FinTrackNormalize={normalizeData,clone};
})();
