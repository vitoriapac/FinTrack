(function(){
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const cents=value=>Math.round(Number(value||0)*100);
  const mapMoney=(items,fields,convert)=> (items||[]).map(item=>{const next={...item};fields.forEach(field=>{if(next[field]!==undefined) next[field]=convert?cents(next[field]):Math.round(Number(next[field]||0));});if(next.orcamentos&&typeof next.orcamentos==='object') next.orcamentos=Object.fromEntries(Object.entries(next.orcamentos).map(([key,value])=>[key,convert?cents(value):Math.round(Number(value||0))]));return next;});
  const mapCollection=(collection,fields,convert)=>Array.isArray(collection)?mapMoney(collection,fields,convert):Object.fromEntries(Object.entries(collection||{}).map(([key,value])=>[key,mapMoney([value],fields,convert)[0]]));
  function migrateData(input){
    const data=clone(input),schema=window.FinTrackSchema||{version:5,moneyFields:{}};
    const legacyCents=Boolean(data.__centsVersion)||Number(data.schemaVersion||0)>=2;
    if(!legacyCents){
      Object.entries(schema.moneyFields).forEach(([collection,fields])=>{data[collection]=mapCollection(data[collection],fields,true);});
    }else{
      Object.entries(schema.moneyFields).forEach(([collection,fields])=>{data[collection]=mapCollection(data[collection],fields,false);});
    }
    data.lancamentos=(Array.isArray(data.lancamentos)?data.lancamentos:[]).map(item=>({...item}));
    const installmentGroups=new Map();
    data.lancamentos.filter(item=>item.serieId&&item.serieTipo==='parcelamento').forEach(item=>{const group=installmentGroups.get(item.serieId)||[];group.push(item);installmentGroups.set(item.serieId,group);});
    installmentGroups.forEach(items=>{items.sort((a,b)=>(Number(a.parcelaAtual)||0)-(Number(b.parcelaAtual)||0)||String(a.data||'').localeCompare(String(b.data||'')));const originId=items[0]?.lancamentoOrigemId||items[0]?.id;items.forEach(item=>{item.lancamentoOrigemId=originId;});});
    data.pagamentosCartao=(Array.isArray(data.pagamentosCartao)?data.pagamentosCartao:[]).map(payment=>({...payment,faturaId:payment.faturaId||`${payment.cartaoId||'cartao'}:${payment.invoiceKey||'sem-fatura'}`}));
    const operations=new Map((Array.isArray(data.operacoes)?data.operacoes:[]).filter(item=>item?.id).map(item=>[item.id,item]));
    data.lancamentos.filter(item=>item.operacaoId).forEach(item=>{if(!operations.has(item.operacaoId)) operations.set(item.operacaoId,{id:item.operacaoId,tipo:item.tipoOperacao||item.natureza||'operacao',criadaEm:item.data});});
    data.operacoes=[...operations.values()];
    data.schemaVersion=schema.version;
    data.__centsVersion=1;
    delete data._schemaMigrationPending;
    return data;
  }
  window.FinTrackMigrations={migrateData};
})();
