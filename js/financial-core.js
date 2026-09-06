(function(){
  'use strict';

  const CORE_VERSION = '1.0.0';
  const clone = value => JSON.parse(JSON.stringify(value));
  const toCents = value => Math.round(Number(value || 0) * 100);

  function normalizeData(data, fallback){
    if(window.FinTrackNormalize) return window.FinTrackNormalize.normalizeData(data,fallback);
    data = data || clone(fallback || {});
    if(!data.__centsVersion){
      data.contas=(data.contas||[]).map(c=>({...c,saldoInicial:toCents(c.saldoInicial)}));
      data.categorias=(data.categorias||[]).map(c=>({...c,orcado:toCents(c.orcado)}));
      data.lancamentos=(data.lancamentos||[]).map(l=>({...l,valor:toCents(l.valor)}));
      data.__centsVersion=1;
    }
    data.categorias=(data.categorias||[]).map(c=>{
      const nome=String(c.nome||'').toLowerCase();
      return (c.id==='cat-investimento'||c.id==='cat-transferencia'||nome.includes('investimento')||nome.includes('transferência')) ? {...c,natureza:'movimentacao'} : c;
    });
    data.lixeira=data.lixeira||[];
    data.quarentena=data.quarentena||[];
    data.historico=data.historico||[];
    data._backups=data._backups||[];
    data.planejamentos=data.planejamentos||{};
    data.fechamentos=data.fechamentos||{};
    data.metas=data.metas||[];
    data.operacoes=data.operacoes||[];
    data.series=data.series||[];
    data.cartoes=data.cartoes||[];
    data.dividas=data.dividas||[];
    data.pagamentosCartao=data.pagamentosCartao||[];
    data.pagamentosDividas=data.pagamentosDividas||[];
    data.lancamentos=(data.lancamentos||[]).map(l=>({
      ...l,
      tipoOperacao:l.tipoOperacao || (l.natureza==='transferencia' ? 'transferencia' : l.natureza==='investimento' ? 'investimento' : l.tipo==='Receita' ? 'receita' : 'despesa'),
      operacaoId:l.operacaoId || null,
      serieStatus:l.serieId ? (l.serieStatus || 'ativa') : undefined,
    }));
    const seriesConhecidas=new Set(data.series.map(s=>s.id));
    data.lancamentos.filter(l=>l.serieId && !seriesConhecidas.has(l.serieId)).forEach(l=>{
      data.series.push({id:l.serieId,tipo:l.serieTipo||'serie',status:l.serieStatus||'ativa',criadaEm:l.data});
      seriesConhecidas.add(l.serieId);
    });
    return data;
  }

  function category(data,id){ return (data.categorias||[]).find(c=>c.id===id); }
  function account(data,id){ return (data.contas||[]).find(c=>c.id===id); }
  function nature(data,l){
    if(l.natureza==='transferencia'||l.tipoOperacao==='transferencia') return 'transferencia';
    const c=category(data,l.categoriaId);
    if(l.tipoOperacao==='investimento'||c?.id==='cat-investimento'||String(c?.nome||'').toLowerCase().includes('investimento')) return 'investimento';
    if(c?.natureza==='movimentacao') return 'transferencia';
    return l.tipo==='Receita' ? 'receita' : 'despesa';
  }
  function seriesActive(data,l,today){
    if(!l?.serieId) return true;
    const serie=(data.series||[]).find(s=>s.id===l.serieId);
    if((serie?.status||l.serieStatus||'ativa')==='ativa') return true;
    return !(today && l.data>=today);
  }
  function monthEntries(data,mes,ano,today){
    return (data.lancamentos||[]).filter(l=>{
      if(!seriesActive(data,l,today)) return false;
      const d=new Date(l.data+'T00:00:00');
      return d.getMonth()+1===mes && d.getFullYear()===ano;
    });
  }
  function totals(data,mes,ano,today){
    const items=monthEntries(data,mes,ano,today);
    const receitas=items.filter(l=>nature(data,l)==='receita').reduce((s,l)=>s+Number(l.valor),0);
    const despesas=items.filter(l=>nature(data,l)==='despesa').reduce((s,l)=>s+Number(l.valor),0);
    return {receitas,despesas,saldo:receitas-despesas};
  }
  function totalByNature(data,mes,ano,target,today){
    return monthEntries(data,mes,ano,today).filter(l=>nature(data,l)===target && !(target==='transferencia'&&l.movimentoTransferencia==='entrada')).reduce((s,l)=>s+(target==='investimento'&&l.movimentoInvestimento==='resgate'?-Number(l.valor):Number(l.valor)),0);
  }
  function categorySpend(data,id,mes,ano,today){
    return monthEntries(data,mes,ano,today).filter(l=>l.categoriaId===id&&nature(data,l)==='despesa').reduce((s,l)=>s+Number(l.valor),0);
  }
  function accountBalance(data,conta,today){
    const movimentos=(data.lancamentos||[]).filter(l=>l.contaId===conta.id&&l.status==='Pago'&&l.data>=conta.dataSaldoInicial&&seriesActive(data,l,today));
    const delta=movimentos.reduce((s,l)=>{
      if(nature(data,l)==='transferencia'){
        if(l.movimentoTransferencia==='entrada') return s+Number(l.valor);
        if(l.movimentoTransferencia==='saida') return s-Number(l.valor);
        return s+(l.contaId===conta.id?-Number(l.valor):0)+(l.contaDestinoId===conta.id?Number(l.valor):0);
      }
      if(nature(data,l)==='investimento'&&l.movimentoInvestimento==='resgate') return s+Number(l.valor);
      return s+(l.tipo==='Receita'?Number(l.valor):-Number(l.valor));
    },0);
    return Number(conta.saldoInicial)+delta;
  }

  function cardInvoice(data,card,referenceDate){
    const ref=referenceDate instanceof Date?referenceDate:new Date(referenceDate||Date.now());
    const closing=Math.max(1,Math.min(31,Number(card?.fechamento)||31));
    const dueDay=Math.max(1,Math.min(31,Number(card?.vencimento)||closing));
    const refYear=ref.getFullYear(),refMonth=ref.getMonth()+1;
    const afterClosing=ref.getDate()>closing;
    const keyMonth=afterClosing?(refMonth===12?1:refMonth+1):refMonth;
    const keyYear=afterClosing&&refMonth===12?refYear+1:refYear;
    const items=(data.lancamentos||[]).filter(l=>l.cartaoId===card?.id&&nature(data,l)==='despesa').filter(l=>{
      const d=new Date(String(l.data||'')+'T00:00:00');
      if(Number.isNaN(d.getTime())) return false;
      const month=d.getMonth()+1,year=d.getFullYear(),after=d.getDate()>closing;
      const invoiceMonth=after?(month===12?1:month+1):month;
      const invoiceYear=after&&month===12?year+1:year;
      return invoiceMonth===keyMonth&&invoiceYear===keyYear;
    });
    const total=items.reduce((sum,l)=>sum+Number(l.valor||0),0);
    const paid=(data.pagamentosCartao||[]).filter(payment=>payment.cartaoId===card?.id&&payment.invoiceKey===`${keyYear}-${String(keyMonth).padStart(2,'0')}`).reduce((sum,payment)=>sum+Number(payment.valor||0),0);
    const outstanding=Math.max(0,total-paid);
    const dueDate=new Date(keyYear,keyMonth-1,Math.min(dueDay,new Date(keyYear,keyMonth,0).getDate()));
    return {key:`${keyYear}-${String(keyMonth).padStart(2,'0')}`,year:keyYear,month:keyMonth,total,paid,outstanding,limit:Number(card?.limite||0),available:Number(card?.limite||0)-outstanding,dueDate:dueDate.toISOString().slice(0,10),items};
  }

  function debtProjection(debt){
    const principal=Math.max(0,Number(debt?.saldo||0));
    const periods=Math.max(0,Math.floor(Number(debt?.parcelasRestantes)||0));
    const monthlyRate=Math.max(0,Number(debt?.juros||0))/100;
    if(!principal||!periods) return {installment:0,totalPaid:0,totalInterest:0,periods,monthlyRate};
    const installment=monthlyRate===0?principal/periods:principal*monthlyRate/(1-Math.pow(1+monthlyRate,-periods));
    const totalPaid=installment*periods;
    return {installment,totalPaid,totalInterest:Math.max(0,totalPaid-principal),periods,monthlyRate};
  }

  window.FinTrackCore={version:CORE_VERSION,normalizeData,nature,monthEntries,totals,totalByNature,categorySpend,accountBalance,cardInvoice,debtProjection,category,account,seriesActive,toCents};
})();
