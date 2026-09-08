(function(){
  'use strict';
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  const clone=value=>window.FinTrackNormalize.clone(value);

  function validateData(data){
    const errors=[],warnings=[];
    if(!data||typeof data!=='object') return {valid:false,errors:['Dados ausentes'],warnings};
    const schema=window.FinTrackSchema||{version:6,requiredCollections:[]};
    if(Number(data.schemaVersion)!==schema.version) errors.push('schemaVersion inválido');
    (schema.requiredCollections||[]).forEach(key=>{if(!Array.isArray(data[key])) errors.push(`${key} deve ser uma lista`);});
    for(const key of ['planejamentos','fechamentos']) if(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key])) errors.push(`${key} deve ser um objeto`);

    const allIds=new Map();
    for(const key of schema.requiredCollections||[]){
      for(const item of data[key]||[]){
        if(!item||typeof item!=='object'){errors.push(`${key} possui item inválido`);continue;}
        if(!item.id){errors.push(`${key} possui item sem id`);continue;}
        if(allIds.has(item.id)) errors.push(`id duplicado: ${item.id}`); else allIds.set(item.id,key);
      }
    }

    const accounts=new Set((data.contas||[]).map(item=>item.id)),categories=new Set((data.categorias||[]).map(item=>item.id)),cards=new Set((data.cartoes||[]).map(item=>item.id)),debts=new Set((data.dividas||[]).map(item=>item.id));
    const entries=new Map((data.lancamentos||[]).map(item=>[item.id,item]));
    for(const card of data.cartoes||[]){
      if(!Number.isInteger(card.limite)||card.limite<0) errors.push(`cartão ${card.id} com limite inválido`);
      if(!Number.isInteger(Number(card.fechamento))||Number(card.fechamento)<1||Number(card.fechamento)>31) errors.push(`cartão ${card.id} com fechamento inválido`);
      if(!Number.isInteger(Number(card.vencimento))||Number(card.vencimento)<1||Number(card.vencimento)>31) errors.push(`cartão ${card.id} com vencimento inválido`);
    }
    for(const debt of data.dividas||[]){
      if(!Number.isInteger(debt.saldo)||debt.saldo<0) errors.push(`dívida ${debt.id} com saldo inválido`);
      if(!Number.isFinite(Number(debt.juros))||Number(debt.juros)<0) errors.push(`dívida ${debt.id} com juros inválidos`);
      if(!Number.isInteger(Number(debt.parcelasRestantes))||Number(debt.parcelasRestantes)<0) errors.push(`dívida ${debt.id} com parcelas inválidas`);
    }
    for(const goal of data.metas||[]){
      if(!Number.isInteger(goal.alvo)||goal.alvo<=0) errors.push(`meta ${goal.id} com alvo inválido`);
      if(!Number.isInteger(goal.acumulado)||goal.acumulado<0) errors.push(`meta ${goal.id} com acumulado inválido`);
    }
    for(const item of data.lancamentos||[]){
      if(!datePattern.test(String(item.data||''))) errors.push(`lançamento ${item.id||'sem id'} com data inválida`);
      if(!Number.isInteger(item.valor)||item.valor<=0) errors.push(`lançamento ${item.id||'sem id'} com valor inválido em centavos`);
      if(item.contaId&&!accounts.has(item.contaId)) warnings.push(`conta ausente no lançamento ${item.id}`);
      if(item.categoriaId&&!categories.has(item.categoriaId)) warnings.push(`categoria ausente no lançamento ${item.id}`);
      if(item.cartaoId&&!cards.has(item.cartaoId)) warnings.push(`cartão ausente no lançamento ${item.id}`);
    }

    for(const payment of data.pagamentosCartao||[]){
      if(!cards.has(payment.cartaoId)) warnings.push(`cartão ausente no pagamento ${payment.id}`);
      if(!payment.invoiceKey||!/^\d{4}-\d{2}$/.test(payment.invoiceKey)) errors.push(`pagamento ${payment.id||'sem id'} com fatura inválida`);
      if(!Number.isInteger(payment.valor)||payment.valor<=0) errors.push(`pagamento ${payment.id||'sem id'} com valor inválido`);
      if(!payment.contaId) warnings.push(`pagamento legado sem conta: ${payment.id}`); else if(!accounts.has(payment.contaId)) errors.push(`conta ausente no pagamento ${payment.id}`);
    }
    for(const payment of data.pagamentosDividas||[]){
      if(!debts.has(payment.dividaId)) warnings.push(`dívida ausente no pagamento ${payment.id}`);
      if(!Number.isInteger(payment.valor)||payment.valor<=0) errors.push(`pagamento ${payment.id||'sem id'} com valor inválido`);
      if(!payment.contaId) warnings.push(`pagamento legado sem conta: ${payment.id}`); else if(!accounts.has(payment.contaId)) errors.push(`conta ausente no pagamento ${payment.id}`);
      if(payment.juros!==undefined&&(!Number.isInteger(payment.juros)||payment.juros<0)) errors.push(`pagamento ${payment.id} com juros inválidos`);
      if(payment.amortizacao!==undefined&&(!Number.isInteger(payment.amortizacao)||payment.amortizacao<0)) errors.push(`pagamento ${payment.id} com amortização inválida`);
    }

    const operations=new Map((data.operacoes||[]).map(item=>[item.id,item]));
    const cardPayments=new Map((data.pagamentosCartao||[]).map(item=>[item.id,item])),debtPayments=new Map((data.pagamentosDividas||[]).map(item=>[item.id,item]));
    for(const payment of [...(data.pagamentosCartao||[]),...(data.pagamentosDividas||[])]){
      if(payment.operacaoId&&!operations.has(payment.operacaoId)) errors.push(`operação ausente no pagamento ${payment.id}`);
      if(payment.lancamentoId&&!entries.has(payment.lancamentoId)) errors.push(`movimento ausente no pagamento ${payment.id}`);
      if(payment.operacaoId&&payment.lancamentoId){const movement=entries.get(payment.lancamentoId);if(movement&&movement.operacaoId!==payment.operacaoId) errors.push(`movimento divergente no pagamento ${payment.id}`);}
    }
    for(const operation of data.operacoes||[]){
      if(!operation.tipo) errors.push(`operação ${operation.id} sem tipo`);
      if(operation.valor!==undefined&&(!Number.isInteger(operation.valor)||operation.valor<=0)) errors.push(`operação ${operation.id} com valor inválido`);
      if(operation.contaId&&!accounts.has(operation.contaId)) errors.push(`operação ${operation.id} com conta ausente`);
      const ids=Array.isArray(operation.lancamentoIds)?operation.lancamentoIds:[];
      if(operation.status!=='estornada'&&!ids.length) errors.push(`operação ${operation.id} sem lançamentos`);
      ids.forEach(id=>{const entry=entries.get(id);if(!entry) errors.push(`lançamento ${id} ausente na operação ${operation.id}`);else if(entry.operacaoId!==operation.id) errors.push(`lançamento ${id} vinculado à operação divergente`);});
      const refs=operation.referencias||{};
      if(operation.tipo==='transferencia'){
        if(!accounts.has(refs.contaOrigemId)||!accounts.has(refs.contaDestinoId)||refs.contaOrigemId===refs.contaDestinoId) errors.push(`operação ${operation.id} com contas de transferência inválidas`);
        if(operation.status!=='estornada'&&ids.length!==2) errors.push(`operação ${operation.id} deve possuir dois lançamentos`);
      }else if(operation.tipo==='investimento'){
        if(!['aporte','resgate'].includes(refs.movimento)) errors.push(`operação ${operation.id} com movimento de investimento inválido`);
        if(operation.status!=='estornada'&&ids.length!==1) errors.push(`operação ${operation.id} deve possuir um lançamento`);
      }else if(operation.tipo==='pagamento_cartao'&&operation.status!=='estornada'){
        const payment=cardPayments.get(refs.pagamentoId);
        if(!payment||!cards.has(refs.cartaoId)||payment.cartaoId!==refs.cartaoId||payment.operacaoId!==operation.id||!ids.includes(payment.lancamentoId)) errors.push(`operação ${operation.id} com referências de cartão inválidas`);
      }else if(operation.tipo==='pagamento_divida'&&operation.status!=='estornada'){
        const payment=debtPayments.get(refs.pagamentoId);
        if(!payment||!debts.has(refs.dividaId)||payment.dividaId!==refs.dividaId||payment.operacaoId!==operation.id||!ids.includes(payment.lancamentoId)) errors.push(`operação ${operation.id} com referências de dívida inválidas`);
      }
    }

    const transfers=new Map();
    (data.lancamentos||[]).filter(item=>item.tipoOperacao==='transferencia'||item.natureza==='transferencia').forEach(item=>{if(!item.operacaoId) warnings.push(`transferência sem operação: ${item.id}`);else{const group=transfers.get(item.operacaoId)||[];group.push(item);transfers.set(item.operacaoId,group);}});
    transfers.forEach((items,operationId)=>{const outgoing=items.find(item=>item.movimentoTransferencia==='saida'),incoming=items.find(item=>item.movimentoTransferencia==='entrada');if(items.length!==2||!outgoing||!incoming) warnings.push(`transferência incompleta: ${operationId}`);else if(outgoing.valor!==incoming.valor||outgoing.status!==incoming.status||outgoing.contaId!==incoming.contaOrigemId||outgoing.contaDestinoId!==incoming.contaId) warnings.push(`transferência inconsistente: ${operationId}`);});

    const installments=new Map();
    (data.lancamentos||[]).filter(item=>item.serieTipo==='parcelamento'&&item.serieId).forEach(item=>{const group=installments.get(item.serieId)||[];group.push(item);installments.set(item.serieId,group);});
    installments.forEach((items,seriesId)=>{const expected=Math.max(...items.map(item=>Number(item.totalParcelas)||0));const numbers=new Set(items.map(item=>Number(item.parcelaAtual)));const origins=new Set(items.map(item=>item.lancamentoOrigemId).filter(Boolean));if(expected!==items.length||numbers.size!==items.length||[...numbers].some(number=>number<1||number>expected)) warnings.push(`parcelamento inconsistente: ${seriesId}`);if(origins.size!==1) warnings.push(`origem do parcelamento inconsistente: ${seriesId}`);});
    return {valid:errors.length===0,errors,warnings};
  }

  function repairTransfers(data){
    const next=clone(data),groups=new Map();
    next.lancamentos.filter(item=>item.tipoOperacao==='transferencia'||item.natureza==='transferencia').forEach(item=>{if(item.operacaoId){const group=groups.get(item.operacaoId)||[];group.push(item);groups.set(item.operacaoId,group);}});
    groups.forEach((items,operationId)=>{
      let outgoing=items.find(item=>item.movimentoTransferencia==='saida'),incoming=items.find(item=>item.movimentoTransferencia==='entrada');
      const extras=items.filter(item=>item!==outgoing&&item!==incoming);
      if(extras.length){const extraIds=new Set(extras.map(item=>item.id));next.lancamentos=next.lancamentos.filter(item=>!extraIds.has(item.id));next.quarentena.push(...extras.map(item=>({id:`quarentena-${item.id}`,tipo:'transferencia_duplicada',origemId:item.id,motivo:`Movimento excedente da operação ${operationId}`,dados:item})));}
      if(!outgoing&&incoming&&incoming.contaOrigemId){outgoing={...incoming,id:`reparo-${operationId}-saida`,tipo:'Despesa',movimentoTransferencia:'saida',contaId:incoming.contaOrigemId,contaDestinoId:incoming.contaId};next.lancamentos.push(outgoing);}
      if(!incoming&&outgoing&&outgoing.contaDestinoId){incoming={...outgoing,id:`reparo-${operationId}-entrada`,tipo:'Receita',movimentoTransferencia:'entrada',contaId:outgoing.contaDestinoId,contaOrigemId:outgoing.contaId};next.lancamentos.push(incoming);}
      if(outgoing&&incoming){Object.assign(incoming,{tipo:'Receita',tipoOperacao:'transferencia',natureza:'transferencia',movimentoTransferencia:'entrada',operacaoId:operationId,contaId:outgoing.contaDestinoId,contaOrigemId:outgoing.contaId,valor:outgoing.valor,status:outgoing.status,data:outgoing.data,descricao:outgoing.descricao});}
    });
    return next;
  }

  function repairData(data){
    const next=window.FinTrackNormalize.normalizeData(clone(data),data);
    const validIds=(items)=>new Set(items.map(item=>item.id));
    for(const key of window.FinTrackSchema.requiredCollections) next[key]=(next[key]||[]).filter(item=>item&&typeof item==='object'&&item.id);
    const accounts=validIds(next.contas),categories=validIds(next.categorias),cards=validIds(next.cartoes),debts=validIds(next.dividas);
    const rejected=next.lancamentos.filter(item=>!datePattern.test(String(item.data||''))||!Number.isInteger(item.valor)||item.valor<=0||(item.contaId&&!accounts.has(item.contaId))||(item.categoriaId&&!categories.has(item.categoriaId))||(item.cartaoId&&!cards.has(item.cartaoId)));
    if(rejected.length){const ids=new Set(rejected.map(item=>item.id));next.lancamentos=next.lancamentos.filter(item=>!ids.has(item.id));next.quarentena.push(...rejected.map(item=>({id:`quarentena-${item.id}`,tipo:'lancamento_invalido',origemId:item.id,motivo:'Referência, data ou valor inválido',dados:item})));}
    const quarantinePayments=(collection,type,isValid)=>{
      const invalid=next[collection].filter(item=>!isValid(item));
      if(!invalid.length)return;
      const operationIds=new Set(invalid.map(item=>item.operacaoId).filter(Boolean)),entryIds=new Set(invalid.map(item=>item.lancamentoId).filter(Boolean));
      next[collection]=next[collection].filter(item=>!invalid.includes(item));
      next.lancamentos=next.lancamentos.filter(item=>!entryIds.has(item.id)&&!operationIds.has(item.operacaoId));
      next.operacoes=next.operacoes.filter(item=>!operationIds.has(item.id));
      next.quarentena.push(...invalid.map(item=>({id:`quarentena-${type}-${item.id}`,tipo:type,origemId:item.id,motivo:'Pagamento com valor ou referências inválidas',dados:item})));
    };
    const operationIds=()=>new Set(next.operacoes.map(item=>item.id)),entryIds=()=>new Set(next.lancamentos.map(item=>item.id));
    quarantinePayments('pagamentosCartao','pagamento_cartao_invalido',item=>cards.has(item.cartaoId)&&accounts.has(item.contaId)&&/^\d{4}-\d{2}$/.test(String(item.invoiceKey||''))&&Number.isInteger(item.valor)&&item.valor>0&&operationIds().has(item.operacaoId)&&entryIds().has(item.lancamentoId));
    quarantinePayments('pagamentosDividas','pagamento_divida_invalido',item=>debts.has(item.dividaId)&&accounts.has(item.contaId)&&Number.isInteger(item.valor)&&item.valor>0&&operationIds().has(item.operacaoId)&&entryIds().has(item.lancamentoId));
    const repaired=repairTransfers(next);
    const groups=new Map();
    repaired.lancamentos.filter(item=>item.serieTipo==='parcelamento'&&item.serieId).forEach(item=>{const group=groups.get(item.serieId)||[];group.push(item);groups.set(item.serieId,group);});
    groups.forEach(items=>{items.sort((a,b)=>(Number(a.parcelaAtual)||0)-(Number(b.parcelaAtual)||0)||String(a.data).localeCompare(String(b.data)));const originId=items[0].lancamentoOrigemId||items[0].id;items.forEach((item,index)=>Object.assign(item,{parcelaAtual:index+1,totalParcelas:items.length,lancamentoOrigemId:originId}));});
    return window.FinTrackNormalize.normalizeData(repaired,repaired);
  }
  window.FinTrackValidation={validateData,repairData,repairTransfers};
})();
