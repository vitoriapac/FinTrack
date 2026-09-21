(function(){
  'use strict';
  const analysis=window.FinTrackAnalysisInternals,{sum,base}=analysis;
  analysis.expenseConcentration=function(data,options={}){
    const period=options.month||new Date().toISOString().slice(0,7),[year,month]=period.split('-').map(Number),rows=(data.categorias||[]).filter(item=>item.tipo==='Saída'&&item.natureza!=='movimentacao').map(item=>({id:item.id,label:item.nome,value:window.FinTrackCore.categorySpend(data,item.id,month,year,'Pago')})).filter(item=>item.value>0).sort((a,b)=>b.value-a.value),total=sum(rows,'value');
    if(!total)return base('concentracao',period,{status:'indisponivel',summary:'Não há despesas realizadas no período.'});
    const top3=sum(rows.slice(0,3),'value')/total*100,top5=sum(rows.slice(0,5),'value')/total*100,status=top3>70?'critico':top3>=50?'atencao':'normal',level=status==='critico'?'alta':status==='atencao'?'moderada':'baixa';
    return base('concentracao',period,{status,summary:`Concentração ${level}: as três maiores categorias representam ${Math.round(top3)}% das despesas.`,metrics:[{key:'top3',value:Math.round(top3*10)/10},{key:'top5',value:Math.round(top5*10)/10},{key:'total',value:total}],evidence:{categories:rows.slice(0,5),other:sum(rows.slice(5),'value'),level,heuristic:'Top 3: baixa <50%, moderada 50–70%, alta >70%'}});
  };
})();
