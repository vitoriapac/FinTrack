(function(){
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const cents=value=>Math.round(Number(value||0)*100);
  const mapMoney=(items,fields,convert)=> (items||[]).map(item=>{const next={...item};fields.forEach(field=>{if(next[field]!==undefined) next[field]=convert?cents(next[field]):Math.round(Number(next[field]||0));});if(next.orcamentos&&typeof next.orcamentos==='object') next.orcamentos=Object.fromEntries(Object.entries(next.orcamentos).map(([key,value])=>[key,convert?cents(value):Math.round(Number(value||0))]));return next;});
  const mapCollection=(collection,fields,convert)=>Array.isArray(collection)?mapMoney(collection,fields,convert):Object.fromEntries(Object.entries(collection||{}).map(([key,value])=>[key,mapMoney([value],fields,convert)[0]]));
  function migrateData(input){
    const data=clone(input),schema=window.FinTrackSchema||{version:4,moneyFields:{}};
    const legacyCents=Boolean(data.__centsVersion)||Number(data.schemaVersion||0)>=2;
    if(!legacyCents){
      Object.entries(schema.moneyFields).forEach(([collection,fields])=>{data[collection]=mapCollection(data[collection],fields,true);});
    }else{
      Object.entries(schema.moneyFields).forEach(([collection,fields])=>{data[collection]=mapCollection(data[collection],fields,false);});
    }
    data.schemaVersion=schema.version;
    data.__centsVersion=1;
    delete data._schemaMigrationPending;
    return data;
  }
  window.FinTrackMigrations={migrateData};
})();
