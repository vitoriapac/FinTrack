(function(){
  const handlers=[];
  window.FinTrackScreenEvents={register(handler){handlers.push(handler);},attach(main){handlers.forEach(handler=>handler(main));}};
  FinTrackScreenEvents.register(main=>{
    main.querySelectorAll('.tab-btn').forEach(button=>button.onclick=()=>{cadastroTab=button.dataset.tab;render();});
  });
  FinTrackScreenEvents.register(main=>{
    const novoCartao=document.getElementById('btn-novo-cartao');
    if(novoCartao) novoCartao.onclick=()=>FinTrackFormLayer.open('cartao');
    const novaDivida=document.getElementById('btn-nova-divida');
    if(novaDivida) novaDivida.onclick=()=>FinTrackFormLayer.open('divida');
    main.querySelectorAll('[data-action="del-cartao"]').forEach(button=>button.onclick=()=>confirmAction('Excluir este cartão?',async()=>{
      const card=state.cartoes.find(item=>item.id===button.dataset.id);
      state.cartoes=state.cartoes.filter(item=>item.id!==button.dataset.id);
      registrarHistorico('exclusao_cartao',`Cartão excluído: ${card?.nome||button.dataset.id}`); await saveData(); render();
    }));
    main.querySelectorAll('[data-action="del-divida"]').forEach(button=>button.onclick=()=>confirmAction('Excluir esta dívida?',async()=>{
      const debt=state.dividas.find(item=>item.id===button.dataset.id);
      state.dividas=state.dividas.filter(item=>item.id!==button.dataset.id);
      registrarHistorico('exclusao_divida',`Dívida excluída: ${debt?.credor||button.dataset.id}`); await saveData(); render();
    }));
  });
})();
