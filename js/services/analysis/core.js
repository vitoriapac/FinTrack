(function(){
  'use strict';
  const num=value=>Number(value||0);
  const sum=(items,field)=>items.reduce((total,item)=>total+num(typeof field==='function'?field(item):item[field]),0);
  const monthShift=(key,offset)=>{const [year,month]=key.split('-').map(Number),date=new Date(year,month-1+offset,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;};
  const base=(type,period,values={})=>({type,period,status:'normal',score:null,confidence:null,summary:'',metrics:[],evidence:{},actions:[],...values});
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\d+/g,'#').replace(/[^a-z#]+/g,' ').trim().replace(/\s+/g,' ');
  const median=values=>{const list=[...values].sort((a,b)=>a-b),middle=Math.floor(list.length/2);return list.length%2?list[middle]:Math.round((list[middle-1]+list[middle])/2);};
  const validExpense=item=>item.tipo==='Despesa'&&item.status==='Pago'&&!item.extraordinario&&!['transferencia','investimento','pagamento_cartao','pagamento_divida'].includes(item.tipoOperacao);
  const closedSnapshots=data=>Object.entries(data.fechamentos||{}).filter(([,item])=>item.status==='fechado'&&item.snapshot).sort(([a],[b])=>a.localeCompare(b));
  window.FinTrackAnalysisInternals={num,sum,monthShift,base,normalize,median,validExpense,closedSnapshots};
})();
