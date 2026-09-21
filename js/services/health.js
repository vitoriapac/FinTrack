(function(){
  'use strict';
  const activeSeries=(data,entry)=>{if(!entry?.serieId)return true;const series=(data.series||[]).find(item=>item.id===entry.serieId);return (series?.status||entry.serieStatus||'ativa')==='ativa';};
  function evaluate(data,options={}){
    const today=options.today||new Date().toISOString().slice(0,10),date=new Date(`${today}T12:00:00`),month=Number(options.month||date.getMonth()+1),year=Number(options.year||date.getFullYear()),totals=window.FinTrackCore.totals(data,month,year,today),pending=(data.lancamentos||[]).filter(item=>item.status==='Pendente'&&activeSeries(data,item)&&window.FinTrackCore.nature(data,item)==='despesa'),overdue=pending.filter(item=>(item.dataVencimento||item.data)<today).length,overBudget=(data.categorias||[]).filter(category=>category.tipo==='Saída'&&Number(category.orcado||0)>0&&window.FinTrackCore.budgetSummary(data,category.id,month,year,category.orcado,today).comprometido>Number(category.orcado||0)).length,investments=window.FinTrackCore.totalByNature(data,month,year,'investimento',today,{status:'Pago'});
    const components=[
      {name:'Resultado',max:25,points:totals.saldo>=0?25:0,detail:totals.saldo>=0?'O mês terminou positivo.':'O resultado mensal está negativo.'},
      {name:'Pendências',max:20,points:Math.max(0,20-Math.min(20,overdue*6)),detail:overdue?`${overdue} vencimento(s) atrasado(s).`:'Nenhum vencimento atrasado.'},
      {name:'Orçamento',max:20,points:Math.max(0,20-Math.min(20,overBudget*7)),detail:overBudget?`${overBudget} categoria(s) acima do orçamento.`:'Categorias dentro do orçamento.'},
      {name:'Comprometimento',max:20,points:totals.receitas>0&&totals.despesas/totals.receitas>.7?5:20,detail:totals.receitas>0&&totals.despesas/totals.receitas>.7?'Despesas acima de 70% das receitas.':'Comprometimento sob controle.'},
      {name:'Investimentos',max:15,points:investments>0?15:8,detail:investments>0?'Houve investimento no período.':'Nenhum investimento registrado no período.'},
    ];
    const score=components.reduce((sum,item)=>sum+item.points,0),losses=components.map(item=>({...item,loss:item.max-item.points})).filter(item=>item.loss>0).sort((a,b)=>b.loss-a.loss),classification=score>=80?'Normal':score>=55?'Atenção':'Crítico';
    return {period:`${year}-${String(month).padStart(2,'0')}`,score,classification,status:classification==='Crítico'?'critico':classification==='Atenção'?'atencao':'normal',mainAttention:losses[0]?.detail||'Nenhum fator crítico identificado.',potential:Math.min(100,score+losses.reduce((sum,item)=>sum+item.loss,0)),components,losses,evidence:{overdue,overBudget,investments,totals}};
  }
  window.HealthService={evaluate};
})();
