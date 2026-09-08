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
  function projection(data,startMonth,months,scenario={}){
    const count=Math.max(1,Math.min(60,Number(months)||3)),start=`${startMonth}-01`,last=String(new Date(Number(startMonth.slice(0,4)),Number(startMonth.slice(5,7))-1+count,0).toISOString().slice(0,10)),agenda=projectAgenda(data,{start,end:last}),accounts=(data.contas||[]).reduce((sum,item)=>sum+window.FinTrackCore.accountBalance(data,item,new Date().toISOString().slice(0,10)),0);
    let balance=accounts+Number(scenario.saldoInicial||0);
    const result=[];
    for(let index=0;index<count;index++){
      const date=new Date(Number(startMonth.slice(0,4)),Number(startMonth.slice(5,7))-1+index,1),key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,planning=data.planejamentos?.[key]||{},events=agenda.filter(item=>item.vencimento.startsWith(key)),plannedIncome=Number(planning.receita||0),eventIncome=events.filter(item=>item.tipo==='receita').reduce((sum,item)=>sum+item.valor,0),expenses=events.filter(item=>item.tipo==='despesa'&&item.origem!=='lancamento'&&item.origem!=='recorrencia'&&item.origem!=='parcela').reduce((sum,item)=>sum+item.valor,0)+events.filter(item=>item.tipo==='despesa'&&['lancamento','recorrencia','parcela'].includes(item.origem)).reduce((sum,item)=>sum+item.valor,0),investment=Number(planning.investimento||0),adjustment=Number(scenario.ajustes?.[key]||0)+Number(scenario.gastoMensal||0)*-1-Number(scenario.investimentoMensal||0),income=plannedIncome||eventIncome,opening=balance;
      let minBalance=opening;
      const flows=[...events.map(item=>({date:item.vencimento,value:item.tipo==='receita'?item.valor:-item.valor})),...(income>eventIncome?[{date:`${key}-05`,value:income-eventIncome}]:[]),...(investment?[{date:`${key}-15`,value:-investment}]:[]),...(adjustment?[{date:`${key}-28`,value:adjustment}]:[])].sort((a,b)=>a.date.localeCompare(b.date));
      let running=opening;flows.forEach(flow=>{running+=flow.value;minBalance=Math.min(minBalance,running);});balance=opening+income-expenses-investment+adjustment;
      const impact=[{label:'despesas previstas',value:expenses},{label:'investimentos planejados',value:investment},{label:'ajuste de cenário',value:Math.max(0,-adjustment)}].sort((a,b)=>b.value-a.value)[0];
      result.push({mes:key,saldoInicial:opening,entradas:income,saidas:expenses,investimentos:investment,ajustes:adjustment,menorSaldo:minBalance,saldoFinal:balance,alerta:minBalance<0?'saldo_negativo':minBalance<Math.max(10000,income*.1)?'margem_reduzida':null,principalImpacto:impact.value?impact.label:null});
    }
    return {inicio:startMonth,meses:result,cenario:clone(scenario),referenciaDiaria:count?Math.max(0,Math.floor(result[0].saldoFinal/new Date(Number(startMonth.slice(0,4)),Number(startMonth.slice(5,7)),0).getDate())):0,aviso:'Estimativa baseada nos dados e planejamentos disponíveis; não é saldo garantido.'};
  }
  function debtSummary(data,debt){const payments=(data.pagamentosDividas||[]).filter(item=>item.dividaId===debt.id),sum=field=>payments.reduce((total,item)=>total+Number(item[field]||0),0),balance=Number(debt.saldo||0),rate=Math.max(0,Number(debt.juros||0))/100,remaining=Math.max(0,Number(debt.parcelasRestantes||0)),base=remaining?Math.ceil(balance/remaining):balance,installment=balance?Math.ceil(base+balance*rate):0;return {saldoInicial:Number(debt.saldoInicial??balance),saldoAtual:balance,amortizacao:sum('amortizacao'),jurosPagos:sum('juros'),parcelasPagas:payments.length,parcelasRestantes:remaining,parcelaEstimada:installment,totalPrevisto:remaining?installment*remaining:balance,quitacaoPrevista:remaining&&debt.proximoVencimento?new Date(Number(debt.proximoVencimento.slice(0,4)),Number(debt.proximoVencimento.slice(5,7))-1+remaining,1).toISOString().slice(0,7):null,aviso:'Estimativa simplificada; consulte o contrato e o credor para valores de quitação.'};}
  function payoff(data,debtId,extra=0){const debt=(data.dividas||[]).find(item=>item.id===debtId);if(!debt)throw new Error('Dívida não encontrada.');const base=debtSummary(data,debt),monthly=Math.max(1,base.parcelaEstimada+Number(extra||0)),months=Math.ceil(base.saldoAtual/monthly),interest=Math.round(base.saldoAtual*Math.max(0,Number(debt.juros||0))/100*months/2);return {dividaId:debtId,aporteExtra:Number(extra||0),mesesEstimados:months,totalEstimado:base.saldoAtual+interest,jurosEstimados:interest,aviso:base.aviso};}
  function affordability(data,amount,installments=1){const value=Math.max(0,Number(amount||0)),count=Math.max(1,Number(installments)||1),monthly=Math.ceil(value/count),projectionResult=projection(data,new Date().toISOString().slice(0,7),Math.max(3,count),{ajustes:Object.fromEntries(Array.from({length:count},(_,i)=>{const date=new Date();date.setMonth(date.getMonth()+i);return [`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,-monthly];}))}),risks=projectionResult.meses.filter(item=>item.alerta);return {valor:value,parcelas:count,parcela:monthly,saldoFinal:projectionResult.meses.at(-1).saldoFinal,menorSaldo:Math.min(...projectionResult.meses.map(item=>item.menorSaldo)),mesesEmRisco:risks.map(item=>item.mes),consequencia:risks.length?'A compra reduz a margem e produz meses em risco.':'A simulação não encontrou saldo negativo, mas reduz a reserva disponível.',aviso:'Simulação simplificada e temporária; não representa aprovação ou recomendação de compra.'};}
  window.AgendaService={project:projectAgenda};
  window.PatrimonyService={summary:patrimonySummary};
  window.PlanningService={copy:copyPlanning,annualReserve};
  window.GoalService={summary:goalSummary};
  window.ProjectionService={project:projection};
  window.DebtService={summary:debtSummary};
  window.SimulatorService={payoff,affordability};
})();
