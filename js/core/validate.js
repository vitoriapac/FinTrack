(function(){
  function validateData(data){
    const errors=[],warnings=[];
    if(!data||typeof data!=='object') return {valid:false,errors:['Dados ausentes'],warnings};
    if(Number(data.schemaVersion)!==4) errors.push('schemaVersion inválido');
    ['contas','categorias','lancamentos','metas','cartoes','dividas'].forEach(key=>{if(!Array.isArray(data[key])) errors.push(`${key} deve ser uma lista`);});
    const ids=new Set();
    ['contas','categorias','metas','cartoes','dividas'].forEach(key=>(data[key]||[]).forEach(item=>{if(!item.id) errors.push(`${key} possui item sem id`);else if(ids.has(item.id)) errors.push(`id duplicado: ${item.id}`);else ids.add(item.id);}));
    (data.lancamentos||[]).forEach(item=>{if(!item.id) errors.push('lançamento sem id');if(!item.data) errors.push(`lançamento ${item.id||'sem id'} sem data`);if(!Number.isInteger(item.valor)) errors.push(`lançamento ${item.id||'sem id'} com valor não inteiro em centavos`);});
    (data.lancamentos||[]).filter(item=>item.contaId&&!((data.contas||[]).some(account=>account.id===item.contaId))).forEach(item=>warnings.push(`conta ausente no lançamento ${item.id}`));
    (data.lancamentos||[]).filter(item=>item.categoriaId&&!((data.categorias||[]).some(category=>category.id===item.categoriaId))).forEach(item=>warnings.push(`categoria ausente no lançamento ${item.id}`));
    const transfers=new Map();
    (data.lancamentos||[]).filter(item=>item.tipoOperacao==='transferencia'||item.natureza==='transferencia').forEach(item=>{if(!item.operacaoId) warnings.push(`transferência sem operação: ${item.id}`);else{const group=transfers.get(item.operacaoId)||[];group.push(item);transfers.set(item.operacaoId,group);}});
    transfers.forEach((items,operationId)=>{const outgoing=items.find(item=>item.movimentoTransferencia==='saida'),incoming=items.find(item=>item.movimentoTransferencia==='entrada');if(items.length!==2||!outgoing||!incoming) warnings.push(`transferência incompleta: ${operationId}`);else if(outgoing.valor!==incoming.valor||outgoing.status!==incoming.status) warnings.push(`transferência inconsistente: ${operationId}`);});
    return {valid:errors.length===0,errors,warnings};
  }
  function repairData(data){
    const next=window.FinTrackNormalize.clone(data);
    ['contas','categorias','lancamentos','metas','cartoes','dividas','pagamentosCartao','pagamentosDividas'].forEach(key=>{next[key]=(next[key]||[]).filter(item=>item&&typeof item==='object'&&item.id);});
    return window.FinTrackNormalize.normalizeData(next,next);
  }
  window.FinTrackValidation={validateData,repairData};
})();
