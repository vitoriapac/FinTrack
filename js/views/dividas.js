(function(){
  window.renderDividasView=function(){
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Dívidas</h1><p class="page-sub">Saldos, amortizações e histórico de pagamentos</p></div></div>${renderDividasTab()}${renderDebtPaymentHistory()}`;
  };
  window.FinTrackViews.register('dividas',()=>window.renderDividasView());
})();
