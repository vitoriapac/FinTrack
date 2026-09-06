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
    return {state:next,operationId:pair[0].operacaoId,items:pair};
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

  function registerCardPayment(data,input){
    const next=clone(data),amount=cents(input.valor),outstanding=cents(input.outstanding);
    if(amount<=0||amount>outstanding) throw new Error('Pagamento de cartão inválido.');
    next.pagamentosCartao=next.pagamentosCartao||[];
    next.pagamentosCartao.push({id:input.id||nextId('pagamento-cartao',input.idFactory),cartaoId:input.cartaoId,invoiceKey:input.invoiceKey,valor:amount,data:input.data});
    return next;
  }

  function registerDebtPayment(data,input){
    const next=clone(data),debt=next.dividas.find(item=>item.id===input.dividaId),amount=cents(input.valor);
    if(!debt||amount<=0||amount>cents(debt.saldo)) throw new Error('Pagamento de dívida inválido.');
    debt.saldo=Math.max(0,cents(debt.saldo)-amount);
    debt.parcelasRestantes=Math.max(0,(Number(debt.parcelasRestantes)||0)-1);
    next.pagamentosDividas=next.pagamentosDividas||[];
    next.pagamentosDividas.push({id:input.id||nextId('pagamento-divida',input.idFactory),dividaId:debt.id,valor:amount,data:input.data,saldoAnterior:cents(data.dividas.find(item=>item.id===input.dividaId).saldo),parcelasRestantesAntes:Number(data.dividas.find(item=>item.id===input.dividaId).parcelasRestantes)||0});
    return next;
  }

  function reverseCardPayment(data,paymentId){
    const next=clone(data),payment=(next.pagamentosCartao||[]).find(item=>item.id===paymentId);
    if(!payment) throw new Error('Pagamento de cartão não encontrado.');
    next.pagamentosCartao=next.pagamentosCartao.filter(item=>item.id!==paymentId);
    return {state:next,payment};
  }

  function reverseDebtPayment(data,paymentId){
    const next=clone(data),payment=(next.pagamentosDividas||[]).find(item=>item.id===paymentId);
    if(!payment) throw new Error('Pagamento de dívida não encontrado.');
    const debt=next.dividas.find(item=>item.id===payment.dividaId);
    if(!debt) throw new Error('Dívida vinculada não encontrada.');
    debt.saldo=payment.saldoAnterior==null?cents(debt.saldo)+cents(payment.valor):cents(payment.saldoAnterior);
    debt.parcelasRestantes=payment.parcelasRestantesAntes==null?(Number(debt.parcelasRestantes)||0)+1:Number(payment.parcelasRestantesAntes);
    next.pagamentosDividas=next.pagamentosDividas.filter(item=>item.id!==paymentId);
    return {state:next,payment,debt};
  }

  window.FinTrackServices={
    transfers:{pair:transferPair,upsert:upsertTransfer},
    entries:{add:addEntry,addMany:addEntries,replace:replaceEntry,trash:trashEntries,toggleStatus:toggleEntryStatus,restoreLast:restoreLastTrashed},
    entities:{upsert:upsertEntity,remove:removeEntity},
    installments:{expand:expandInstallments},
    payments:{card:registerCardPayment,debt:registerDebtPayment,reverseCard:reverseCardPayment,reverseDebt:reverseDebtPayment},
  };
})();
