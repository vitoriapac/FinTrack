(function(){
  'use strict';
  const views={orcamento:'planejamento',atrasos:'agenda',projecao:'projecao',comprometimento:'planejamento',qualidade:'auditoria',reserva:'patrimonio',anomalia:'analises',concentracao:'analises',dividas:'dividas',metas:'metas',investimentos:'lancamentos',tendencia:'balanco'};
  const month=value=>/^\d{4}-\d{2}$/.test(value||'')?value:null;
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:null;
  function forInsight(item,data){
    const evidence=item?.evidencia||{},type=item?.tipo,firstOverdue=type==='atrasos'?(data?.lancamentos||[]).filter(entry=>evidence.lancamentoIds?.includes(entry.id)).sort((a,b)=>String(a.dataVencimento||a.data).localeCompare(String(b.dataVencimento||b.data)))[0]:null,activeDebts=(data?.dividas||[]).filter(entry=>Number(entry.saldo||0)>0),topCategory=type==='concentracao'?evidence.categorias?.[0]?.id:null;
    return {view:topCategory?'planejamento':views[type]||'analises',month:month(evidence.periodo||item?.periodo),date:date(firstOverdue?.dataVencimento||firstOverdue?.data),categoryId:evidence.categoriaId||topCategory||null,entityId:type==='metas'?evidence.metaId||null:type==='dividas'&&activeDebts.length===1?activeDebts[0].id:null};
  }
  function forAction(action){return {view:views[action?.sourceType]||action?.target||'analises',month:month(action?.month),date:date(action?.date),categoryId:action?.categoryId||null,entityId:action?.entityId||null};}
  function forEvent(href){const [view,entityId]=String(href||'').split(':');return {view:['lancamentos','dividas','cartoes','planejamento'].includes(view)?view:'agenda',entityId:['lancamentos','dividas','cartoes'].includes(view)?entityId||null:null};}
  window.FinTrackInsightRoutes={forInsight,forAction,forEvent};
})();
