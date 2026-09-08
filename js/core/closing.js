(function(){
  const clone=value=>JSON.parse(JSON.stringify(value));
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
    const categoryById=id=>(data.categorias||[]).find(item=>item.id===id),accountById=id=>(data.contas||[]).find(item=>item.id===id);
    const orcamentoDetalhado=Object.entries(budgets).map(([id,budget])=>{const category=categoryById(id),summary=core.budgetSummary(data,id,month,year,budget);return {categoriaId:id,categoriaNome:category?.nome||'Categoria removida',tipoGasto:category?.tipoGasto||'',orcado:summary.planejado,realizado:summary.realizado,pendente:summary.pendente,comprometido:summary.comprometido,disponivel:summary.disponivel,percentualRealizado:summary.percentualRealizado,percentualComprometido:summary.percentualComprometido,status:summary.status};});
    const categoriasEstouradas=orcamentoDetalhado.filter(item=>item.status==='ultrapassado');
    const lancamentosDetalhados=entries.map(item=>({...clone(item),categoriaNome:categoryById(item.categoriaId)?.nome||'',contaNome:accountById(item.contaId)?.nome||''}));
    const endDate=`${key}-${String(new Date(year,month,0).getDate()).padStart(2,'0')}`;
    const contas=(data.contas||[]).map(account=>({id:account.id,nome:account.nome,saldo:core.accountBalance(data,account,endDate)}));
    const cartoes=(data.cartoes||[]).map(card=>{const invoice=core.cardInvoice(data,card,new Date(`${endDate}T12:00:00`));return {id:card.id,nome:card.nome,limite:card.limite,fatura:{key:invoice.key,total:invoice.total,paid:invoice.paid,outstanding:invoice.outstanding,dueDate:invoice.dueDate}};});
    const dividas=(data.dividas||[]).map(debt=>({id:debt.id,credor:debt.credor,saldo:debt.saldo,juros:debt.juros,parcelasRestantes:debt.parcelasRestantes}));
    return {status:'fechado',mes:key,fechadoEm:options.fechadoEm||new Date().toISOString(),observacao:options.observacao||'',reaberturas:[],snapshot:{versao:2,receitas:totals.receitas,receitasPendentes:summary.receitasPendentes,despesas:totals.despesas,despesasPendentes:summary.despesasPendentes,investimentos:investments,investimentosPendentes:summary.investimentosPendentes,resultado:totals.saldo,saldoProjetado:summary.saldoProjetado,planejamento:clone(planning),orcamentos:budgets,orcamentoDetalhado,categoriasEstouradas,contas,cartoes,dividas,contasPendentes:entries.filter(item=>item.status==='Pendente').map(item=>item.id),lancamentos:entries.map(item=>item.id),lancamentosDetalhados}};
  }
  function reopen(snapshot,options={}){if(typeof options==='string')options={quando:options};const quando=options.quando||new Date().toISOString(),reason=String(options.motivo||'Sem motivo informado');return {...snapshot,status:'aberto',reabertoEm:quando,reaberturas:[...(snapshot.reaberturas||[]),{data:quando,motivo:reason,usuario:options.usuario||'local'}]};}
  window.FinTrackClosing={createSnapshot,reopen,isClosed:entry=>entry?.status==='fechado'};
})();
