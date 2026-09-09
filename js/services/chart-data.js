(function(){
  'use strict';
  const sum=(items,key)=>items.reduce((total,item)=>total+Number(item[key]||0),0);
  const monthKeys=(end,count)=>{const [year,month]=end.split('-').map(Number);return Array.from({length:count},(_,i)=>{const date=new Date(year,month-count+i,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;});};
  function cashflow(data,endMonth,count=6){return monthKeys(endMonth,count).map(key=>{const [year,month]=key.split('-').map(Number),totals=window.FinTrackCore.totals(data,month,year,`${key}-31`);return {label:key,receitas:totals.receitas,despesas:totals.despesas};});}
  function budgets(data,month){const [year,index]=month.split('-').map(Number),planning=data.planejamentos?.[month]?.orcamentos||{};return (data.categorias||[]).filter(item=>item.tipo==='Saída'&&item.natureza!=='movimentacao').map(item=>{const planned=Number(planning[item.id]??item.orcado??0),summary=window.FinTrackCore.budgetSummary(data,item.id,index,year,planned,`${month}-31`);return {label:item.nome,planejado:planned,comprometido:summary.comprometido,percentual:summary.percentualComprometido,excesso:Math.max(0,summary.comprometido-planned)};}).filter(item=>item.planejado||item.comprometido).sort((a,b)=>b.percentual-a.percentual);}
  function categories(data,month,limit=5){const [year,index]=month.split('-').map(Number),rows=(data.categorias||[]).map(item=>({label:item.nome,value:window.FinTrackCore.categorySpend(data,item.id,index,year,'Pago')})).filter(item=>item.value>0).sort((a,b)=>b.value-a.value),head=rows.slice(0,limit),rest=sum(rows.slice(limit),'value');return rest?[...head,{label:'Outros',value:rest}]:head;}
  function patrimony(data){return Object.entries(data.fechamentos||{}).filter(([,item])=>Number(item.snapshot?.versao)===4).sort(([a],[b])=>a.localeCompare(b)).map(([label,item])=>({label,value:Number(item.snapshot.patrimonioLiquido||0)}));}
  function projection(data,startMonth){return window.ProjectionService.project(data,startMonth,3).meses.map(item=>({label:item.mes,value:item.saldoFinal,menorSaldo:item.menorSaldo}));}
  window.ChartDataService={cashflow,budgets,categories,patrimony,projection};
})();
