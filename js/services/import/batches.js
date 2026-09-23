(function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const signature=entry=>JSON.stringify([entry.data,entry.descricao,entry.tipo,entry.contaId,entry.categoriaId,entry.valor,entry.status,entry.tipoOperacao,entry.importBatchId,entry.importSource,entry.operacaoId||null,entry.natureza||null,entry.movimentoTransferencia||null,entry.contaDestinoId||null,entry.contaOrigemId||null]);
  const operationSignature=operation=>JSON.stringify([operation.id,operation.tipo,operation.status,operation.valor,operation.contaId,operation.referencias,operation.lancamentoIds]);
  const key=(accountId,date,amountCents)=>[accountId,date,amountCents].join('|');
  const offsetDate=(date,offset)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);};
  const similarity=(first,second)=>{const tokens=value=>new Set(String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)||[]);const a=tokens(first),b=tokens(second);return a.size&&b.size?[...a].filter(token=>b.has(token)).length/new Set([...a,...b]).size:0;};

  function candidateIndex(state){
    const byKey=new Map(),bySource=new Map(),byLegacySource=new Map();
    (state.lancamentos||[]).forEach(entry=>{
      const signed=entry.tipo==='Despesa'?-entry.valor:entry.valor;
      const identity=key(entry.contaId,entry.data,signed);
      if(!byKey.has(identity))byKey.set(identity,[]);
      byKey.get(identity).push(entry);
      if(entry.importSource?.sourceId){
        const sourceKey=`${entry.contaId}|${entry.importSource.identityKey||entry.importSource.sourceId}`;
        const target=entry.importSource.identityKey?bySource:byLegacySource;
        if(!target.has(sourceKey))target.set(sourceKey,[]);
        target.get(sourceKey).push(entry);
      }
    });
    return {byKey,bySource,byLegacySource};
  }
  function addCandidate(index,entry){
    const signed=entry.tipo==='Despesa'?-entry.valor:entry.valor,identity=key(entry.contaId,entry.data,signed);
    if(!index.byKey.has(identity))index.byKey.set(identity,[]);index.byKey.get(identity).push(entry);
    if(entry.importSource?.sourceId){const sourceKey=`${entry.contaId}|${entry.importSource.identityKey||entry.importSource.sourceId}`,target=entry.importSource.identityKey?index.bySource:index.byLegacySource;if(!target.has(sourceKey))target.set(sourceKey,[]);target.get(sourceKey).push(entry);}
  }

  function candidates(state,transaction,index=candidateIndex(state)){
    const identities=[-1,0,1].map(offset=>key(transaction.source.accountId,offsetDate(transaction.date,offset),transaction.amountCents));
    const sourceKey=`${transaction.source.accountId}|${transaction.source.identityKey||transaction.sourceId}`;
    const legacyKey=`${transaction.source.accountId}|${transaction.sourceId}`;
    const scoped=transaction.sourceId?index.bySource.get(sourceKey)||[]:[],legacy=transaction.sourceId?index.byLegacySource.get(legacyKey)||[]:[];
    const matches=[...identities.flatMap(identity=>index.byKey.get(identity)||[]),...scoped,...legacy];
    return [...new Map(matches.map(entry=>[entry.id,entry])).values()].map(entry=>{
      const sameAmount=(entry.tipo==='Despesa'?-entry.valor:entry.valor)===transaction.amountCents;
      const distance=Math.abs(Date.parse(`${entry.data}T12:00:00Z`)-Date.parse(`${transaction.date}T12:00:00Z`))/86400000;
      const sameScope=Boolean(transaction.source.identityKey&&entry.importSource?.identityKey===transaction.source.identityKey&&entry.importSource?.sourceId===transaction.sourceId);
      const legacySource=Boolean(!entry.importSource?.identityKey&&transaction.sourceId&&entry.importSource?.sourceId===transaction.sourceId&&distance===0&&sameAmount);
      const likeness=similarity(entry.descricao,transaction.description),exactDescription=String(entry.descricao||'').trim().toLowerCase()===transaction.description.toLowerCase();
      const tier=sameScope&&sameAmount&&distance===0||sameAmount&&distance===0&&exactDescription?'strong':sameAmount&&distance<=1&&(sameScope||likeness>=0.6)?'probable':sameAmount&&distance===0?'weak':'conflict';
      return {id:entry.id,description:entry.descricao,date:entry.data,categoryId:entry.categoriaId,tier,compatible:tier!=='conflict',exactSource:sameScope||legacySource,exactDescription};
    }).filter(candidate=>candidate.tier!=='conflict'||scoped.some(entry=>entry.id===candidate.id)||legacy.some(entry=>entry.id===candidate.id));
  }

  function commit(state,decisions,metadata,idFactory){
    if(!Array.isArray(decisions)||!decisions.length)throw new Error('Nenhuma linha para importar.');
    let next=clone(state);
    const batchId=idFactory('import-batch'),created=[],modified=[],operations=[],linked=[],ignored=[];
    const accountIds=new Set((next.contas||[]).map(item=>item.id));
    const categories=new Map((next.categorias||[]).map(item=>[item.id,item]));
    const existingIds=new Set((next.lancamentos||[]).map(item=>item.id));
    const reservedKeys=new Set();
    let matchIndex=candidateIndex(next);
    for(const decision of decisions){
      const transaction=decision.transaction,action=decision.action;
      if(!transaction||!['import','link','ignore','transfer'].includes(action))throw new Error('Revise a decisão de cada linha.');
      if(!accountIds.has(transaction.source.accountId))throw new Error('Conta de origem indisponível.');
      if(transaction.source.currency!=='BRL'||!Number.isSafeInteger(transaction.amountCents)||!transaction.amountCents||!window.FinTrackBankImport.normalizeDate(transaction.date))throw new Error(`Linha ${transaction.source.rowNumber}: transação inválida.`);
      if(action==='ignore'){ignored.push(transaction.source.rowNumber);continue;}
      if(action==='link'){
        const match=candidates(next,transaction,matchIndex).find(item=>item.id===decision.matchId&&item.compatible);
        if(!match)throw new Error(`Linha ${transaction.source.rowNumber}: selecione um lançamento compatível.`);
        linked.push({rowNumber:transaction.source.rowNumber,entryId:match.id});continue;
      }
      if(action==='transfer'){
        const destination=decision.destinationAccountId;
        if(!accountIds.has(destination)||destination===transaction.source.accountId)throw new Error(`Linha ${transaction.source.rowNumber}: escolha outra conta sua para a transferência.`);
        if(next.fechamentos?.[transaction.date.slice(0,7)]?.status==='fechado')throw new Error(`Linha ${transaction.source.rowNumber}: mês fechado.`);
        const debit=transaction.amountCents<0,origin=debit?transaction.source.accountId:destination,target=debit?destination:transaction.source.accountId;
        const counterpart=decision.counterpartId?next.lancamentos.find(entry=>entry.id===decision.counterpartId):null;
        const oppositeCandidates=window.FinTrackImportAssistant.transferHints(next,transaction).counterparts.filter(item=>item.accountId===destination);
        if(oppositeCandidates.length&&!counterpart)throw new Error(`Linha ${transaction.source.rowNumber}: selecione o movimento oposto existente para evitar duplicação.`);
        if(decision.counterpartId){
          const original=state.lancamentos.find(entry=>entry.id===decision.counterpartId);
          if(!counterpart||!original||counterpart.tipoOperacao!==(debit?'receita':'despesa')||counterpart.contaId!==destination||window.FinTrackImportAssistant.dayDistance(counterpart.data,transaction.date)>1||counterpart.valor!==Math.abs(transaction.amountCents)||counterpart.status!=='Pago')throw new Error(`Linha ${transaction.source.rowNumber}: movimento oposto incompatível.`);
          if(next.fechamentos?.[counterpart.data.slice(0,7)]?.status==='fechado')throw new Error(`Linha ${transaction.source.rowNumber}: o movimento oposto pertence a um mês fechado.`);
        }
        const newId=idFactory('import-entry'),existingId=counterpart?.id;
        if(existingIds.has(newId))throw new Error('Identificador de lançamento repetido.');
        existingIds.add(newId);
        if(counterpart)next.lancamentos=next.lancamentos.filter(entry=>entry.id!==counterpart.id);
        const transfer=window.FinTrackServices.transfers.upsert(next,{data:transaction.date,saidaData:debit?transaction.date:counterpart?.data,entradaData:debit?counterpart?.data:transaction.date,descricao:transaction.description,contaId:origin,contaDestinoId:target,valor:Math.abs(transaction.amountCents),status:'Pago',saidaId:debit?newId:existingId,entradaId:debit?existingId:newId},idFactory);
        next=transfer.state;
        const imported=transfer.items.find(entry=>entry.id===newId);
        const stored=next.lancamentos.find(entry=>entry.id===newId);
        stored.importBatchId=batchId;
        stored.importSource={format:transaction.source.format,rowNumber:transaction.source.rowNumber,sourceId:transaction.sourceId,identityKey:transaction.source.identityKey||null,originalDescription:transaction.originalDescription,documentNumber:transaction.documentNumber};
        created.push({entryId:newId,rowNumber:transaction.source.rowNumber,signature:signature(stored)});
        if(counterpart){
          const opposite=next.lancamentos.find(entry=>entry.id===counterpart.id);
          opposite.descricao=counterpart.descricao;
          modified.push({entryId:counterpart.id,before:counterpart,signature:signature(opposite)});
        }else{
          const opposite=next.lancamentos.find(entry=>entry.id!==newId&&entry.operacaoId===imported.operacaoId);
          created.push({entryId:opposite.id,rowNumber:transaction.source.rowNumber,signature:signature(opposite)});
        }
        const operation=next.operacoes.find(item=>item.id===transfer.operationId);
        operations.push({operationId:operation.id,signature:operationSignature(operation)});
        matchIndex=candidateIndex(next);
        continue;
      }
      const category=categories.get(decision.categoryId),type=transaction.amountCents<0?'Despesa':'Receita';
      if(next.fechamentos?.[transaction.date.slice(0,7)]?.status==='fechado')throw new Error(`Linha ${transaction.source.rowNumber}: mês fechado.`);
      if(!category||category.tipo!==(type==='Despesa'?'Saída':'Entrada')||category.natureza==='movimentacao')throw new Error(`Linha ${transaction.source.rowNumber}: escolha uma categoria operacional válida.`);
      const identity=transaction.sourceId?`${transaction.source.accountId}|${transaction.source.identityKey||transaction.sourceId}`:null;
      if(identity&&reservedKeys.has(identity))throw new Error(`Linha ${transaction.source.rowNumber}: identificador repetido neste lote.`);
      if(identity)reservedKeys.add(identity);
      const id=idFactory('import-entry');
      if(existingIds.has(id))throw new Error('Identificador de lançamento repetido.');
      existingIds.add(id);
      const entry={id,data:transaction.date,descricao:transaction.description,tipo:type,contaId:transaction.source.accountId,categoriaId:category.id,valor:Math.abs(transaction.amountCents),status:'Pago',fixa:false,tipoOperacao:type==='Despesa'?'despesa':'receita',importBatchId:batchId,importSource:{format:transaction.source.format,rowNumber:transaction.source.rowNumber,sourceId:transaction.sourceId,identityKey:transaction.source.identityKey||null,originalDescription:transaction.originalDescription,documentNumber:transaction.documentNumber}};
      next.lancamentos.push(entry);
      addCandidate(matchIndex,entry);
      created.push({entryId:id,rowNumber:transaction.source.rowNumber,signature:signature(entry)});
      if(decision.rememberRule)next=window.FinTrackImportAssistant.addRule(next,{pattern:transaction.description,type,categoryId:category.id},idFactory);
    }
    if(!created.length&&!linked.length)throw new Error('Selecione ao menos uma linha para importar ou vincular.');
    const period=metadata.period&&window.FinTrackBankImport.statementPeriod(metadata.period.from,metadata.period.to,metadata.period.kind);
    const batch={id:batchId,format:metadata.format==='ofx'?'ofx':'csv',fileName:String(metadata.fileName||''),accountId:String(metadata.accountId||''),period,createdAt:new Date().toISOString(),status:'active',created,modified,operations,linked,ignored,totalRows:decisions.length};
    next.importBatches=[...(next.importBatches||[]),batch];
    return {state:next,batch};
  }

  function inspectUndo(state,batchId){
    const batch=(state.importBatches||[]).find(item=>item.id===batchId);
    if(!batch||batch.status!=='active')return {canUndo:false,conflicts:[{kind:'batch',message:'Lote não encontrado ou já desfeito.'}]};
    const entries=new Map((state.lancamentos||[]).map(item=>[item.id,item]));
    const operations=new Map((state.operacoes||[]).map(item=>[item.id,item]));
    const conflicts=[],createdIds=new Set(batch.created.map(item=>item.entryId));
    for(const record of batch.created){
      const entry=entries.get(record.entryId);
      if(!entry||signature(entry)!==record.signature)conflicts.push({kind:'created',entryId:record.entryId,rowNumber:record.rowNumber,message:`Linha ${record.rowNumber}: lançamentos alterados ou removidos. Revise este item antes de desfazer.`});
      else if(state.fechamentos?.[entry.data.slice(0,7)]?.status==='fechado')conflicts.push({kind:'closed',entryId:entry.id,rowNumber:record.rowNumber,message:`Linha ${record.rowNumber}: mês fechado. Reabra ${entry.data.slice(0,7)} antes de desfazer.`});
    }
    for(const record of batch.modified||[]){
      const entry=entries.get(record.entryId);
      if(!entry||signature(entry)!==record.signature)conflicts.push({kind:'modified',entryId:record.entryId,message:`Movimento oposto ${record.entryId} foi alterado ou removido. Revise-o antes de desfazer.`});
      else if(state.fechamentos?.[entry.data.slice(0,7)]?.status==='fechado')conflicts.push({kind:'closed',entryId:entry.id,message:`Movimento oposto ${entry.id} pertence a mês fechado. Reabra ${entry.data.slice(0,7)} antes de desfazer.`});
    }
    for(const record of batch.operations||[]){
      const operation=operations.get(record.operationId);
      if(!operation||operationSignature(operation)!==record.signature)conflicts.push({kind:'operation',operationId:record.operationId,message:`A operação de transferência ${record.operationId} foi alterada ou removida. Revise-a antes de desfazer.`});
    }
    for(const other of state.importBatches||[]){
      if(other.id===batchId||other.status!=='active')continue;
      for(const link of other.linked||[])if(createdIds.has(link.entryId))conflicts.push({kind:'linked',entryId:link.entryId,batchId:other.id,message:`Outro lote ativo (${other.fileName||other.id}) está vinculado ao lançamento ${link.entryId}. Desfaça primeiro o vínculo mais recente.`});
    }
    return {canUndo:conflicts.length===0,conflicts};
  }
  function undo(state,batchId){
    const inspection=inspectUndo(state,batchId);
    if(!inspection.canUndo)throw new Error(inspection.conflicts[0].message);
    const next=clone(state),batch=next.importBatches.find(item=>item.id===batchId);
    const ids=new Set(batch.created.map(item=>item.entryId));
    next.lancamentos=next.lancamentos.filter(item=>!ids.has(item.id));
    const restored=new Map((batch.modified||[]).map(record=>[record.entryId,record.before]));
    next.lancamentos=next.lancamentos.map(item=>restored.get(item.id)||item);
    const operationIds=new Set((batch.operations||[]).map(item=>item.operationId));
    next.operacoes=next.operacoes.filter(item=>!operationIds.has(item.id));
    batch.status='undone';batch.undoneAt=new Date().toISOString();
    return {state:next,batch};
  }
  window.FinTrackImportBatches={candidateIndex,candidates,commit,inspectUndo,undo};
})();
