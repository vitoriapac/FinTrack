(function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value||null));
  const iso=value=>String(value||'').slice(0,10);
  const inRange=(date,range)=>date&&(!range?.start||date>=range.start)&&(!range?.end||date<=range.end);
  const allowed=(item,filters)=>{
    if(!filters)return true;
    if(filters.tipo&&filters.tipo!=='todos'&&item.tipo!==filters.tipo)return false;
    for(const key of ['contaId','cartaoId','dividaId'])if(filters[key]&&item[key]!==filters[key])return false;
    if(filters.parcela===true&&!item.parcela)return false;
    return true;
  };
  function projectAgenda(data,range={},filters={}){
    const items=[],seen=new Set(),push=item=>{const key=`${item.origem}:${item.entidadeId}:${item.vencimento}`;if(!seen.has(key)&&inRange(item.vencimento,range)&&allowed(item,filters)){seen.add(key);items.push(item);}};
    (data.lancamentos||[]).filter(item=>item.status==='Pendente').forEach(item=>push({id:`lancamento:${item.id}`,origem:item.serieTipo==='parcelamento'?'parcela':item.serieId?'recorrencia':'lancamento',entidadeId:item.id,tipo:item.tipo==='Receita'?'receita':'despesa',titulo:item.descricao||'Lançamento',vencimento:iso(item.dataVencimento||item.data),valor:Number(item.valor||0),status:'pendente',contaId:item.contaId||null,cartaoId:item.cartaoId||null,parcela:item.serieTipo==='parcelamento',href:`lancamentos:${item.id}`}));
    (data.dividas||[]).filter(item=>item.proximoVencimento&&Number(item.saldo||0)>0).forEach(item=>push({id:`divida:${item.id}`,origem:'divida',entidadeId:item.id,tipo:'despesa',titulo:item.credor||'Dívida',vencimento:iso(item.proximoVencimento),valor:Number(item.valorParcela||0),status:'previsto',dividaId:item.id,contaId:item.contaId||null,parcela:true,href:`dividas:${item.id}`}));
    (data.despesasAnuais||[]).forEach(item=>{const first=Number((range.start||new Date().toISOString()).slice(0,4)),last=Number((range.end||range.start||new Date().toISOString()).slice(0,4)),month=String(item.mes).padStart(2,'0');for(let year=first;year<=last;year++)push({id:`anual:${item.id}:${year}`,origem:'despesa_anual',entidadeId:item.id,tipo:'despesa',titulo:item.nome||'Despesa anual',vencimento:`${year}-${month}-01`,valor:Number(item.valorEstimado||0),status:'previsto',contaId:item.contaId||null,parcela:false,href:`planejamento:${item.id}`});});
    return items.sort((a,b)=>a.vencimento.localeCompare(b.vencimento)||a.id.localeCompare(b.id));
  }
  function patrimonySummary(data,atDate){
    const date=iso(atDate||new Date().toISOString()),accounts=(data.contas||[]).map(item=>({id:item.id,nome:item.nome,valor:window.FinTrackCore.accountBalance(data,item,date)})),assets=(data.ativosInvestimento||[]).map(item=>({id:item.id,nome:item.nome,instituicao:item.instituicao||'',valor:Number(item.valorAtual||0),atualizadoEm:item.atualizadoEm||null})),debts=(data.dividas||[]).map(item=>({id:item.id,nome:item.credor||item.nome||'Dívida',valor:Number(item.saldo||0)}));
    const sum=items=>items.reduce((total,item)=>total+item.valor,0),updated=assets.map(item=>item.atualizadoEm).filter(Boolean).sort().pop()||date;
    return {contas:sum(accounts),investimentos:sum(assets),dividas:sum(debts),liquido:sum(accounts)+sum(assets)-sum(debts),atualizadoEm:updated,detalhes:{contas:accounts,investimentos:assets,dividas:debts}};
  }
  function copyPlanning(data,fromMonth,toMonth){const next=clone(data),source=next.planejamentos?.[fromMonth]||{};next.planejamentos={...(next.planejamentos||{}),[toMonth]:{receita:Number(source.receita||0),investimento:Number(source.investimento||0),orcamentos:{...(source.orcamentos||{})}}};return next;}
  function annualReserve(expense,atMonth){const month=Math.max(1,Math.min(12,Number(expense.mes)||1)),current=Math.max(1,Math.min(12,Number(String(atMonth).slice(5,7))||1)),remaining=month>=current?month-current+1:month+12-current+1;return {mesesRestantes:remaining,reservaMensalSugerida:Math.ceil(Number(expense.valorEstimado||0)/remaining)};}
  function goalSummary(data,goal,atDate=new Date().toISOString().slice(0,10)){
    const operations=new Map((data.operacoes||[]).map(item=>[item.id,item])),contributions=(data.lancamentos||[]).filter(item=>item.metaId===goal.id&&item.tipoOperacao==='investimento'&&item.status==='Pago'&&operations.get(item.operacaoId)?.status!=='estornada').map(item=>({operacaoId:item.operacaoId,lancamentoId:item.id,data:item.data,valor:item.movimentoInvestimento==='resgate'?-Number(item.valor||0):Number(item.valor||0)}));
    const initial=Number(goal.saldoInicial??goal.acumulado??0),accumulated=initial+contributions.reduce((sum,item)=>sum+item.valor,0),positive=contributions.filter(item=>item.valor>0),months=new Set(positive.map(item=>item.data.slice(0,7))).size,average=months?Math.round(positive.reduce((sum,item)=>sum+item.valor,0)/months):0,remaining=Math.max(0,Number(goal.alvo||0)-accumulated),finishMonths=average?Math.ceil(remaining/average):null;
    const deadline=goal.prazo?new Date(`${goal.prazo}T12:00:00`):null,now=new Date(`${atDate}T12:00:00`),monthsLeft=deadline?Math.max(0,(deadline.getFullYear()-now.getFullYear())*12+deadline.getMonth()-now.getMonth()+1):null,required=monthsLeft?Math.ceil(remaining/monthsLeft):remaining;
    let status=accumulated>=Number(goal.alvo||0)?'concluida':average===0||monthsLeft===0?'atrasada':average>=required*1.2?'adiantada':average>=required?'no_ritmo':'atrasada';
    return {metaId:goal.id,saldoInicial:initial,contribuicoes:contributions,acumulado:accumulated,aporteMedio:average,mesesParaConclusao:finishMonths,previsaoConclusao:finishMonths?new Date(now.getFullYear(),now.getMonth()+finishMonths,1).toISOString().slice(0,7):null,status};
  }
  window.AgendaService={project:projectAgenda};
  window.PatrimonyService={summary:patrimonySummary};
  window.PlanningService={copy:copyPlanning,annualReserve};
  window.GoalService={summary:goalSummary};
})();
