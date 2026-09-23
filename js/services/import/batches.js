(function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const signature=entry=>JSON.stringify([entry.data,entry.descricao,entry.tipo,entry.contaId,entry.categoriaId,entry.valor,entry.status,entry.tipoOperacao,entry.importBatchId,entry.importSource]);
  const key=(accountId,date,amountCents)=>[accountId,date,amountCents].join('|');

  function candidateIndex(state){
    const byKey=new Map(),bySource=new Map();
    (state.lancamentos||[]).forEach(entry=>{
      const signed=entry.tipo==='Despesa'?-entry.valor:entry.valor;
      const identity=key(entry.contaId,entry.data,signed);
      if(!byKey.has(identity))byKey.set(identity,[]);
      byKey.get(identity).push(entry);
      if(entry.importSource?.sourceId){
        const sourceKey=`${entry.contaId}|${entry.importSource.sourceId}`;
        if(!bySource.has(sourceKey))bySource.set(sourceKey,[]);
        bySource.get(sourceKey).push(entry);
      }
    });
    return {byKey,bySource};
  }

  function candidates(state,transaction,index=candidateIndex(state)){
    const identity=key(transaction.source.accountId,transaction.date,transaction.amountCents);
    const sourceKey=`${transaction.source.accountId}|${transaction.sourceId}`;
    const matches=[...(index.byKey.get(identity)||[]),...(transaction.sourceId?index.bySource.get(sourceKey)||[]:[])];
    return [...new Map(matches.map(entry=>[entry.id,entry])).values()].map(entry=>({id:entry.id,description:entry.descricao,categoryId:entry.categoriaId,compatible:entry.data===transaction.date&&(entry.tipo==='Despesa'?-entry.valor:entry.valor)===transaction.amountCents,exactSource:Boolean(transaction.sourceId&&entry.importSource?.sourceId===transaction.sourceId),exactDescription:String(entry.descricao||'').trim().toLowerCase()===transaction.description.toLowerCase()}));
  }

  function commit(state,decisions,metadata,idFactory){
    if(!Array.isArray(decisions)||!decisions.length)throw new Error('Nenhuma linha para importar.');
    const next=clone(state),batchId=idFactory('import-batch'),created=[],linked=[],ignored=[];
    const accountIds=new Set((next.contas||[]).map(item=>item.id));
    const categories=new Map((next.categorias||[]).map(item=>[item.id,item]));
    const existingIds=new Set((next.lancamentos||[]).map(item=>item.id));
    const reservedKeys=new Set();
    for(const decision of decisions){
      const transaction=decision.transaction,action=decision.action;
      if(!transaction||!['import','link','ignore'].includes(action))throw new Error('Revise a decisão de cada linha.');
      if(!accountIds.has(transaction.source.accountId))throw new Error('Conta de origem indisponível.');
      if(transaction.source.currency!=='BRL'||!Number.isSafeInteger(transaction.amountCents)||!transaction.amountCents||!window.FinTrackBankImport.normalizeDate(transaction.date))throw new Error(`Linha ${transaction.source.rowNumber}: transação inválida.`);
      if(action==='ignore'){ignored.push(transaction.source.rowNumber);continue;}
      if(action==='link'){
        const match=candidates(next,transaction).find(item=>item.id===decision.matchId&&item.compatible);
        if(!match)throw new Error(`Linha ${transaction.source.rowNumber}: selecione um lançamento compatível.`);
        linked.push({rowNumber:transaction.source.rowNumber,entryId:match.id});continue;
      }
      const category=categories.get(decision.categoryId),type=transaction.amountCents<0?'Despesa':'Receita';
      if(next.fechamentos?.[transaction.date.slice(0,7)]?.status==='fechado')throw new Error(`Linha ${transaction.source.rowNumber}: mês fechado.`);
      if(!category||category.tipo!==(type==='Despesa'?'Saída':'Entrada')||category.natureza==='movimentacao')throw new Error(`Linha ${transaction.source.rowNumber}: escolha uma categoria operacional válida.`);
      const identity=transaction.sourceId?`${transaction.source.accountId}|${transaction.sourceId}`:null;
      if(identity&&reservedKeys.has(identity))throw new Error(`Linha ${transaction.source.rowNumber}: identificador repetido neste lote.`);
      if(identity)reservedKeys.add(identity);
      const id=idFactory('import-entry');
      if(existingIds.has(id))throw new Error('Identificador de lançamento repetido.');
      existingIds.add(id);
      const entry={id,data:transaction.date,descricao:transaction.description,tipo:type,contaId:transaction.source.accountId,categoriaId:category.id,valor:Math.abs(transaction.amountCents),status:'Pago',fixa:false,tipoOperacao:type==='Despesa'?'despesa':'receita',importBatchId:batchId,importSource:{format:transaction.source.format,rowNumber:transaction.source.rowNumber,sourceId:transaction.sourceId,originalDescription:transaction.originalDescription,documentNumber:transaction.documentNumber}};
      next.lancamentos.push(entry);
      created.push({entryId:id,rowNumber:transaction.source.rowNumber,signature:signature(entry)});
    }
    if(!created.length&&!linked.length)throw new Error('Selecione ao menos uma linha para importar ou vincular.');
    const batch={id:batchId,format:'csv',fileName:String(metadata.fileName||''),accountId:String(metadata.accountId||''),createdAt:new Date().toISOString(),status:'active',created,linked,ignored,totalRows:decisions.length};
    next.importBatches=[...(next.importBatches||[]),batch];
    return {state:next,batch};
  }

  function undo(state,batchId){
    const next=clone(state),batch=(next.importBatches||[]).find(item=>item.id===batchId);
    if(!batch||batch.status!=='active')throw new Error('Lote não encontrado ou já desfeito.');
    const ids=new Set();
    for(const record of batch.created){
      const entry=next.lancamentos.find(item=>item.id===record.entryId);
      if(!entry||signature(entry)!==record.signature)throw new Error('O lote possui lançamentos alterados ou removidos. Revise-os antes de desfazer.');
      if(next.fechamentos?.[entry.data.slice(0,7)]?.status==='fechado')throw new Error('O lote pertence a um mês fechado. Reabra o mês antes de desfazer.');
      ids.add(entry.id);
    }
    if((next.importBatches||[]).some(other=>other.id!==batchId&&other.status==='active'&&(other.linked||[]).some(link=>ids.has(link.entryId))))throw new Error('Outro lote ativo está vinculado a um lançamento deste lote. Desfaça primeiro o vínculo mais recente.');
    next.lancamentos=next.lancamentos.filter(item=>!ids.has(item.id));
    batch.status='undone';batch.undoneAt=new Date().toISOString();
    return {state:next,batch};
  }
  window.FinTrackImportBatches={candidateIndex,candidates,commit,undo};
})();
