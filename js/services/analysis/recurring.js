(function(){
  'use strict';
  const analysis=window.FinTrackAnalysisInternals,{num,sum,base,normalize,median,validExpense}=analysis;
  analysis.recurringExpenses=function(data,options={}){
    const end=options.today||new Date().toISOString().slice(0,10),start=new Date(`${end}T12:00:00`);start.setMonth(start.getMonth()-12);
    const decisions=new Map((data.recurrenceDecisions||[]).map(item=>[item.fingerprint,item])),groups=new Map();
    (data.lancamentos||[]).filter(validExpense).filter(item=>item.data>=start.toISOString().slice(0,10)&&item.data<=end).forEach(item=>{const key=`${normalize(item.descricao)}|${item.categoriaId||''}|${item.contaId||''}`,list=groups.get(key)||[];list.push(item);groups.set(key,list);});
    const detected=[];
    groups.forEach((items,fingerprint)=>{items.sort((a,b)=>a.data.localeCompare(b.data));if(items.length<3||decisions.get(fingerprint)?.status==='ignorada')return;const gaps=items.slice(1).map((item,index)=>(new Date(item.data)-new Date(items[index].data))/86400000),values=items.map(item=>num(item.valor)),mid=median(values);if(gaps.every(gap=>gap>=25&&gap<=35)&&values.every(value=>Math.abs(value-mid)<=mid*.1))detected.push({fingerprint,descricao:items.at(-1).descricao,categoriaId:items[0].categoriaId,contaId:items[0].contaId,mensal:mid,anual:mid*12,sourceIds:items.map(item=>item.id),ocorrencias:items.length,status:decisions.get(fingerprint)?.status||'detectada'});});
    const registered=[...new Map((data.lancamentos||[]).filter(item=>item.serieId&&item.serieTipo==='recorrencia').map(item=>[item.serieId,item])).values()].map(item=>({serieId:item.serieId,descricao:item.descricao,mensal:num(item.valor),anual:num(item.valor)*12,status:item.serieStatus==='ativa'?'confirmada':'encerrada'}));
    const monthly=sum(registered.filter(item=>item.status==='confirmada'),'mensal');
    return base('recorrencias',end.slice(0,7),{status:detected.length?'atencao':'normal',summary:`${registered.length} recorrência(s) cadastrada(s) e ${detected.length} possível(is).`,metrics:[{key:'mensal',value:monthly},{key:'anual',value:monthly*12}],evidence:{registered,detected,heuristic:'3 ocorrências, intervalo de 25–35 dias e variação máxima de 10%'},actions:detected.length?[{id:'review-recurring',label:'Revisar recorrentes',target:'planejamento'}]:[]});
  };
})();
