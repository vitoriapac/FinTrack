(function(){
  function keyParts(key){const [year,month]=String(key).split('-').map(Number);return {year,month};}
  function createSnapshot(data,key,options={}){
    const {year,month}=keyParts(key),planning=data.planejamentos?.[key]||{receita:0,investimento:0,orcamentos:{}};
    const core=window.FinTrackCore;
    const summary=core.financialSummary(data,month,year);
    const totals={receitas:summary.receitasRealizadas,despesas:summary.despesasRealizadas,saldo:summary.resultadoRealizado};
    const investments=summary.investimentosRealizados;
    const entries=core.monthEntries(data,month,year);
    const budgets={...planning.orcamentos};
    (data.categorias||[]).filter(category=>category.tipo==='Saída'&&category.natureza!=='movimentacao').forEach(category=>{if(budgets[category.id]===undefined) budgets[category.id]=category.orcado||0;});
    const categoriasEstouradas=Object.entries(budgets).filter(([id,budget])=>Number(budget)>0&&core.categorySpend(data,id,month,year)>Number(budget)).map(([id,budget])=>({categoriaId:id,orcado:Number(budget),realizado:core.categorySpend(data,id,month,year)}));
    return {status:'fechado',mes:key,fechadoEm:options.fechadoEm||new Date().toISOString(),observacao:options.observacao||'',snapshot:{receitas:totals.receitas,receitasPendentes:summary.receitasPendentes,despesas:totals.despesas,despesasPendentes:summary.despesasPendentes,investimentos:investments,investimentosPendentes:summary.investimentosPendentes,resultado:totals.saldo,saldoProjetado:summary.saldoProjetado,orcamentos:budgets,categoriasEstouradas,contasPendentes:entries.filter(item=>item.status==='Pendente').map(item=>item.id),lancamentos:entries.map(item=>item.id)}};
  }
  function reopen(snapshot,when){return {...snapshot,status:'aberto',reabertoEm:when||new Date().toISOString()};}
  window.FinTrackClosing={createSnapshot,reopen,isClosed:entry=>entry?.status==='fechado'};
})();
