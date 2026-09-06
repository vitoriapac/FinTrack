(function(){
  window.renderCartoesView=function(){
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Cartões</h1><p class="page-sub">Faturas, limites e pagamentos dos seus cartões</p></div></div>${renderCartoesTab()}${renderCardPaymentHistory()}`;
  };
  window.FinTrackViews.register('cartoes',()=>window.renderCartoesView());
})();
