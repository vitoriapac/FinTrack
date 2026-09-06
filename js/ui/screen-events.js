(function(){
  const handlers=[];
  window.FinTrackScreenEvents={register(handler){handlers.push(handler);},attach(main){handlers.forEach(handler=>handler(main));}};
  FinTrackScreenEvents.register(main=>{
    main.querySelectorAll('.tab-btn').forEach(button=>button.onclick=()=>{cadastroTab=button.dataset.tab;render();});
  });
  FinTrackScreenEvents.register(main=>{
    const novoCartao=document.getElementById('btn-novo-cartao');
    if(novoCartao) novoCartao.onclick=()=>FinTrackForms.open('cartao');
    const novaDivida=document.getElementById('btn-nova-divida');
    if(novaDivida) novaDivida.onclick=()=>FinTrackForms.open('divida');
    main.querySelectorAll('[data-action="edit-cartao"]').forEach(button=>button.onclick=()=>FinTrackForms.open('cartao',state.cartoes.find(item=>item.id===button.dataset.id)));
    main.querySelectorAll('[data-action="edit-divida"]').forEach(button=>button.onclick=()=>FinTrackForms.open('divida',state.dividas.find(item=>item.id===button.dataset.id)));
    main.querySelectorAll('[data-action="pay-card"]').forEach(button=>button.onclick=()=>{const card=state.cartoes.find(item=>item.id===button.dataset.id);if(card) openCardPaymentForm(card,FinTrackCore.cardInvoice(state,card,new Date()));});
    main.querySelectorAll('[data-action="pay-divida"]').forEach(button=>button.onclick=()=>{const debt=state.dividas.find(item=>item.id===button.dataset.id);if(debt) openDebtPaymentForm(debt);});
    main.querySelectorAll('[data-action="reverse-card-payment"]').forEach(button=>button.onclick=()=>confirmAction('Estornar este pagamento de fatura?',async()=>{
      const result=FinTrackServices.payments.reverseCard(state,button.dataset.id);
      FinTrackState.replaceState(result.state);
      registrarHistorico('estorno_fatura','Pagamento de fatura estornado',{pagamentoId:result.payment.id,valor:result.payment.valor,invoiceKey:result.payment.invoiceKey});await saveData();render();
    },'Estornar'));
    main.querySelectorAll('[data-action="reverse-debt-payment"]').forEach(button=>button.onclick=()=>confirmAction('Estornar este pagamento de dívida?',async()=>{
      const result=FinTrackServices.payments.reverseDebt(state,button.dataset.id);
      FinTrackState.replaceState(result.state);
      registrarHistorico('estorno_divida',`Pagamento estornado: ${result.debt.credor}`,{pagamentoId:result.payment.id,valor:result.payment.valor,dividaId:result.debt.id});await saveData();render();
    },'Estornar'));
    main.querySelectorAll('[data-action="del-cartao"]').forEach(button=>button.onclick=()=>confirmAction('Excluir este cartão?',async()=>{
      const card=state.cartoes.find(item=>item.id===button.dataset.id);
      if(state.lancamentos.some(item=>item.cartaoId===button.dataset.id)||state.pagamentosCartao.some(item=>item.cartaoId===button.dataset.id)){infoModal('Cartão em uso','Remova ou ajuste as compras e pagamentos relacionados antes de excluir este cartão.');return;}
      FinTrackState.replaceState(FinTrackServices.entities.remove(state,'cartoes',button.dataset.id));
      registrarHistorico('exclusao_cartao',`Cartão excluído: ${card?.nome||button.dataset.id}`); await saveData(); render();
    }));
    main.querySelectorAll('[data-action="del-divida"]').forEach(button=>button.onclick=()=>confirmAction('Excluir esta dívida?',async()=>{
      const debt=state.dividas.find(item=>item.id===button.dataset.id);
      if(state.pagamentosDividas.some(item=>item.dividaId===button.dataset.id)){infoModal('Dívida em uso','Estorne os pagamentos relacionados antes de excluir esta dívida.');return;}
      FinTrackState.replaceState(FinTrackServices.entities.remove(state,'dividas',button.dataset.id));
      registrarHistorico('exclusao_divida',`Dívida excluída: ${debt?.credor||button.dataset.id}`); await saveData(); render();
    }));
  });
})();
