(function(){
  window.renderCadastroView=function(){
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Cadastro</h1><p class="page-sub">Categorias e contas usadas nos seus lançamentos</p></div></div><div class="tabs" role="tablist" aria-label="Áreas de cadastro"><button role="tab" aria-selected="${cadastroTab==='categorias'}" class="tab-btn ${cadastroTab==='categorias'?'active':''}" data-tab="categorias">Categorias</button><button role="tab" aria-selected="${cadastroTab==='contas'}" class="tab-btn ${cadastroTab==='contas'?'active':''}" data-tab="contas">Contas</button></div>${cadastroTab==='contas'?renderContasTab():renderCategoriasTab()}`;
  };
  window.FinTrackViews.register('cadastro',()=>window.renderCadastroView());
})();
