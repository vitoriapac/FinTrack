(function(){
  'use strict';

  const clone=value=>JSON.parse(JSON.stringify(value));
  const cents=value=>Math.round(Number(value||0));
  const nextId=(prefix, factory)=>factory?factory(prefix):`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function transferPair(input,idFactory){
    const amount=cents(input.valor);
    if(!input.contaId||!input.contaDestinoId||input.contaId===input.contaDestinoId) throw new Error('Contas de origem e destino devem ser diferentes.');
    if(!Number.isInteger(amount)||amount<=0) throw new Error('O valor da transferência deve ser positivo.');
    const operationId=input.operacaoId||nextId('op-transferencia',idFactory);
    const base={operacaoId:operationId,tipoOperacao:'transferencia',natureza:'transferencia',data:input.data,descricao:input.descricao||'Transferência entre contas',valor:amount,status:input.status||'Pendente',fixa:false};
    return [
      {...base,id:input.saidaId||nextId('transf',idFactory),tipo:'Despesa',movimentoTransferencia:'saida',contaId:input.contaId,contaDestinoId:input.contaDestinoId},
      {...base,id:input.entradaId||nextId('transf',idFactory),tipo:'Receita',movimentoTransferencia:'entrada',contaId:input.contaDestinoId,contaOrigemId:input.contaId},
    ];
  }

  function upsertTransfer(data,input,idFactory){
    const next=clone(data),pair=transferPair(input,idFactory);
    next.lancamentos=(next.lancamentos||[]).filter(item=>item.operacaoId!==pair[0].operacaoId);
    next.lancamentos.push(...pair);
    next.operacoes=(next.operacoes||[]).filter(item=>item.id!==pair[0].operacaoId);
    next.operacoes.push({id:pair[0].operacaoId,tipo:'transferencia',status:pair[0].status==='Pago'?'concluida':'pendente',criadaEm:pair[0].data,valor:pair[0].valor,contaId:pair[0].contaId,referencias:{contaOrigemId:pair[0].contaId,contaDestinoId:pair[0].contaDestinoId},lancamentoIds:pair.map(item=>item.id)});
    return {state:next,operationId:pair[0].operacaoId,items:pair};
  }

  function registerInvestment(data,input,idFactory){
    const next=clone(data),amount=cents(input.valor);
    assertPaymentAccount(next,input.contaId);
    if(amount<=0) throw new Error('O valor do investimento deve ser positivo.');
    if(!['aporte','resgate'].includes(input.movimentoInvestimento)) throw new Error('Movimento de investimento inválido.');
    const operationId=input.operacaoId||nextId('op-investimento',idFactory),entryId=input.id||nextId('investimento',idFactory);
    const entry={...clone(input),id:entryId,operacaoId:operationId,tipoOperacao:'investimento',natureza:'investimento',tipo:'Despesa',valor:amount,fixa:false,metaId:input.metaId||null,aporteReservaEmergencia:Boolean(input.aporteReservaEmergencia)};
    next.lancamentos=next.lancamentos||[];next.lancamentos.push(entry);
    next.operacoes=next.operacoes||[];next.operacoes.push({id:operationId,tipo:'investimento',status:entry.status==='Pago'?'concluida':'pendente',criadaEm:entry.data,valor:amount,contaId:entry.contaId,referencias:{movimento:entry.movimentoInvestimento,metaId:entry.metaId,aporteReservaEmergencia:entry.aporteReservaEmergencia},lancamentoIds:[entryId]});
    return {state:next,operationId,entry};
  }

  function addEntry(data,entry){
    const next=clone(data);
    next.lancamentos=next.lancamentos||[];
    next.lancamentos.push(clone(entry));
    return next;
  }

  function addEntries(data,entries){
    const next=clone(data);
    next.lancamentos=next.lancamentos||[];
    next.lancamentos.push(...clone(entries));
    return next;
  }

  function replaceEntry(data,entry){
    const next=clone(data),index=(next.lancamentos||[]).findIndex(item=>item.id===entry.id);
    if(index<0) throw new Error('Lançamento não encontrado.');
    next.lancamentos[index]=clone(entry);
    return next;
  }

  function trashEntries(data,entryId,mode='item',deletedAt=new Date().toISOString()){
    const next=clone(data),entry=(next.lancamentos||[]).find(item=>item.id===entryId);
    if(!entry) throw new Error('Lançamento não encontrado.');
    let targets=[entry];
    if(entry.tipoOperacao==='transferencia'&&entry.operacaoId) targets=next.lancamentos.filter(item=>item.operacaoId===entry.operacaoId);
    else if(mode==='serie'&&entry.serieId) targets=next.lancamentos.filter(item=>item.serieId===entry.serieId);
    else if(mode==='futuro'&&entry.serieId) targets=next.lancamentos.filter(item=>item.serieId===entry.serieId&&item.data>=entry.data);
    const ids=new Set(targets.map(item=>item.id));
    next.lixeira=next.lixeira||[];
    next.lixeira.push(...targets.map(item=>({...item,excluidoEm:deletedAt})));
    next.lancamentos=next.lancamentos.filter(item=>!ids.has(item.id));
    return {state:next,items:targets};
  }

  function toggleEntryStatus(data,entryId){
    const next=clone(data),entry=next.lancamentos.find(item=>item.id===entryId);
    if(!entry) throw new Error('Lançamento não encontrado.');
    const status=entry.status==='Pago'?'Pendente':'Pago';
    const targets=entry.tipoOperacao==='transferencia'&&entry.operacaoId?next.lancamentos.filter(item=>item.operacaoId===entry.operacaoId):[entry];
    targets.forEach(item=>{item.status=status;});
    return {state:next,status,items:targets};
  }

  function restoreLastTrashed(data){
    const next=clone(data),item=(next.lixeira||[]).pop();
    if(!item) return {state:next,item:null};
    delete item.excluidoEm;
    next.lancamentos=next.lancamentos||[];
    next.lancamentos.push(item);
    return {state:next,item};
  }

  function upsertEntity(data,collection,payload){
    const next=clone(data),items=next[collection];
    if(!Array.isArray(items)) throw new Error(`Coleção inválida: ${collection}`);
    const index=items.findIndex(item=>item.id===payload.id);
    if(index>=0) items[index]=clone(payload); else items.push(clone(payload));
    return next;
  }

  function removeEntity(data,collection,id){
    const next=clone(data),items=next[collection];
    if(!Array.isArray(items)) throw new Error(`Coleção inválida: ${collection}`);
    next[collection]=items.filter(item=>item.id!==id);
    return next;
  }

  function expandInstallments(payload,options={}){
    const total=options.totalCents==null?cents(payload.valor):cents(options.totalCents);
    const count=Math.max(2,Math.min(60,Number(options.count)||2));
    const frequency=options.frequency||'mensal';
    const seriesId=payload.serieId||nextId('parcelamento',options.idFactory);
    const base=Math.floor(total/count),remainder=total-base*count;
    const addInterval=options.addInterval;
    if(typeof addInterval!=='function') throw new Error('Função de intervalo não configurada.');
    return Array.from({length:count},(_,index)=>({...payload,id:index===0?payload.id:nextId('lanc',options.idFactory),serieId:seriesId,serieTipo:'parcelamento',serieStatus:'ativa',parcelaAtual:index+1,totalParcelas:count,frequencia:frequency,data:index===0?payload.data:addInterval(payload.data,index,frequency),dataVencimento:payload.dataVencimento&& (index===0?payload.dataVencimento:addInterval(payload.dataVencimento,index,frequency)),valor:base+(index===count-1?remainder:0),status:index===0?payload.status:'Pendente',descricao:index===0?payload.descricao:`${payload.descricao} (${index+1} de ${count})`}));
  }

  function paymentOperation(next,input,type,reference){
    const operationId=input.operacaoId||nextId(`op-${type}`,input.idFactory);
    const entryId=input.lancamentoId||nextId(`mov-${type}`,input.idFactory);
    const operation={id:operationId,tipo:type,status:'concluida',criadaEm:input.data,valor:cents(input.valor),contaId:input.contaId,referencias:{...reference},lancamentoIds:[entryId]};
    const entry={id:entryId,operacaoId:operationId,tipoOperacao:type,natureza:type,tipo:'Despesa',data:input.data,descricao:input.descricao,contaId:input.contaId,valor:cents(input.valor),status:'Pago',fixa:false};
    next.operacoes=next.operacoes||[];
    next.lancamentos=next.lancamentos||[];
    next.operacoes.push(operation);
    next.lancamentos.push(entry);
    return {operation,entry};
  }

  function assertPaymentAccount(next,accountId){
    if(!accountId||(next.contas||[]).every(item=>item.id!==accountId)) throw new Error('Selecione uma conta pagadora válida.');
  }

  function registerCardPayment(data,input){
    const next=clone(data),amount=cents(input.valor),outstanding=cents(input.outstanding);
    assertPaymentAccount(next,input.contaId);
    if((next.cartoes||[]).every(item=>item.id!==input.cartaoId)) throw new Error('Cartão não encontrado.');
    if(amount<=0||amount>outstanding) throw new Error('Pagamento de cartão inválido.');
    const paymentId=input.id||nextId('pagamento-cartao',input.idFactory);
    const movement=paymentOperation(next,{...input,valor:amount,descricao:input.descricao||`Pagamento de fatura ${input.invoiceKey}`},'pagamento_cartao',{pagamentoId:paymentId,cartaoId:input.cartaoId,invoiceKey:input.invoiceKey});
    next.pagamentosCartao=next.pagamentosCartao||[];
    next.pagamentosCartao.push({id:paymentId,cartaoId:input.cartaoId,invoiceKey:input.invoiceKey,contaId:input.contaId,valor:amount,data:input.data,operacaoId:movement.operation.id,lancamentoId:movement.entry.id});
    return next;
  }

  function registerDebtPayment(data,input){
    const next=clone(data),debt=next.dividas.find(item=>item.id===input.dividaId),amount=cents(input.valor);
    assertPaymentAccount(next,input.contaId);
    if(!debt||amount<=0) throw new Error('Pagamento de dívida inválido.');
    const previousBalance=cents(debt.saldo),interest=Math.round(previousBalance*Math.max(0,Number(debt.juros||0))/100);
    if(amount>previousBalance+interest) throw new Error('O pagamento excede o saldo acrescido dos juros do período.');
    const interestPaid=Math.min(amount,interest),amortization=Math.min(previousBalance,Math.max(0,amount-interestPaid));
    const paymentId=input.id||nextId('pagamento-divida',input.idFactory);
    const movement=paymentOperation(next,{...input,valor:amount,descricao:input.descricao||`Pagamento de dívida`},'pagamento_divida',{pagamentoId:paymentId,dividaId:debt.id});
    debt.saldo=Math.max(0,previousBalance-amortization);
    if(amortization>0) debt.parcelasRestantes=Math.max(0,(Number(debt.parcelasRestantes)||0)-1);
    next.pagamentosDividas=next.pagamentosDividas||[];
    next.pagamentosDividas.push({id:paymentId,dividaId:debt.id,contaId:input.contaId,valor:amount,juros:interestPaid,amortizacao:amortization,data:input.data,saldoAnterior:previousBalance,saldoPosterior:debt.saldo,parcelasRestantesAntes:Number(data.dividas.find(item=>item.id===input.dividaId).parcelasRestantes)||0,operacaoId:movement.operation.id,lancamentoId:movement.entry.id});
    return next;
  }

  function reverseOperation(next,payment){
    if(payment.lancamentoId) next.lancamentos=(next.lancamentos||[]).filter(item=>item.id!==payment.lancamentoId);
    if(payment.operacaoId) next.operacoes=(next.operacoes||[]).map(item=>item.id===payment.operacaoId?{...item,status:'estornada',estornadaEm:new Date().toISOString(),lancamentoIds:[]}:item);
  }

  function reverseCardPayment(data,paymentId){
    const next=clone(data),payment=(next.pagamentosCartao||[]).find(item=>item.id===paymentId);
    if(!payment) throw new Error('Pagamento de cartão não encontrado.');
    next.pagamentosCartao=next.pagamentosCartao.filter(item=>item.id!==paymentId);
    reverseOperation(next,payment);
    return {state:next,payment};
  }

  function reverseDebtPayment(data,paymentId){
    const next=clone(data),payment=(next.pagamentosDividas||[]).find(item=>item.id===paymentId);
    if(!payment) throw new Error('Pagamento de dívida não encontrado.');
    const debt=next.dividas.find(item=>item.id===payment.dividaId);
    if(!debt) throw new Error('Dívida vinculada não encontrada.');
    const amortization=payment.amortizacao==null?cents(payment.valor):cents(payment.amortizacao);
    debt.saldo=cents(debt.saldo)+amortization;
    if(amortization>0) debt.parcelasRestantes=(Number(debt.parcelasRestantes)||0)+1;
    next.pagamentosDividas=next.pagamentosDividas.filter(item=>item.id!==paymentId);
    reverseOperation(next,payment);
    return {state:next,payment,debt};
  }

  window.FinTrackServices={
    transfers:{pair:transferPair,upsert:upsertTransfer},
    investments:{register:registerInvestment},
    entries:{add:addEntry,addMany:addEntries,replace:replaceEntry,trash:trashEntries,toggleStatus:toggleEntryStatus,restoreLast:restoreLastTrashed},
    entities:{upsert:upsertEntity,remove:removeEntity},
    installments:{expand:expandInstallments},
    payments:{card:registerCardPayment,debt:registerDebtPayment,reverseCard:reverseCardPayment,reverseDebt:reverseDebtPayment},
  };
})();
