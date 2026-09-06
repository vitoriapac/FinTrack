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
    next.pagamentosDividas.push({id:input.id||nextId('pagamento-divida',input.idFactory),dividaId:debt.id,valor:amount,data:input.data});
    return next;
  }

  window.FinTrackServices={
    transfers:{pair:transferPair,upsert:upsertTransfer},
    installments:{expand:expandInstallments},
    payments:{card:registerCardPayment,debt:registerDebtPayment},
  };
})();
