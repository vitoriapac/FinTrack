(function(){
  window.renderAuditoriaView=function(){
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Auditoria</h1><p class="page-sub">Histórico de alterações e integridade dos dados</p></div></div>${renderAuditoriaTab()}${renderQuarantine()}`;
  };
  window.FinTrackViews.register('auditoria',()=>window.renderAuditoriaView());
})();
