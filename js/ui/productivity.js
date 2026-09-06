(function(){
  'use strict';
  const views={Digit1:'home',Digit2:'lancamentos',Digit3:'vencimentos',Digit4:'balanco',Digit5:'historico',Digit6:'planejamento',Digit7:'metas',Digit8:'cartoes',Digit9:'dividas',Digit0:'auditoria'};
  const editing=target=>target?.matches?.('input,textarea,select,[contenteditable="true"]');
  function searchable(){
    return [
      ...(state.lancamentos||[]).map(item=>({label:item.descricao,detail:formatDate(item.data),view:'lancamentos'})),
      ...(state.categorias||[]).map(item=>({label:item.nome,detail:'Categoria',view:'cadastro'})),
      ...(state.contas||[]).map(item=>({label:item.nome,detail:'Conta',view:'cadastro'})),
      ...(state.cartoes||[]).map(item=>({label:item.nome,detail:'Cartão',view:'cartoes'})),
      ...(state.dividas||[]).map(item=>({label:item.credor,detail:'Dívida',view:'dividas'})),
      ...(state.metas||[]).map(item=>({label:item.nome,detail:'Meta',view:'metas'})),
    ];
  }
  function openSearch(){
    openModal('Busca global',`<div class="field"><label for="global-search">Pesquisar</label><input id="global-search" type="search" autocomplete="off" placeholder="Lançamentos, contas, categorias, cartões, dívidas ou metas"></div><div id="global-search-results" class="search-results" aria-live="polite"></div><div class="modal-actions"><button class="btn btn-ghost" id="global-search-close">Fechar</button></div>`,()=>{
      const input=document.getElementById('global-search'),results=document.getElementById('global-search-results');
      const update=()=>{const query=input.value.trim().toLowerCase(),matches=query?searchable().filter(item=>String(item.label||'').toLowerCase().includes(query)).slice(0,12):[];results.innerHTML=matches.length?matches.map(item=>`<button class="search-result" data-view="${item.view}"><strong>${esc(item.label)}</strong><span>${esc(item.detail)}</span></button>`).join(''):query?'<p>Nenhum resultado encontrado.</p>':'<p>Digite para pesquisar em todo o FinTrack.</p>';results.querySelectorAll('.search-result').forEach(button=>button.onclick=()=>{closeModal();setView(button.dataset.view);});};
      input.addEventListener('input',update);document.getElementById('global-search-close').onclick=closeModal;update();
    });
  }
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();return;}
    if(event.altKey&&!editing(event.target)&&views[event.code]){event.preventDefault();setView(views[event.code]);}
  });
  window.FinTrackProductivity={openSearch};
})();
