(function(){
  window.openCardPaymentForm=function(card,invoice){
    const accountOptions=state.contas.map(account=>`<option value="${account.id}">${esc(account.nome)}</option>`).join('');
    openModal('Registrar pagamento da fatura',`<div class="field"><label>Cartão</label><input value="${esc(card.nome)}" disabled></div><div class="field"><label>Fatura</label><input value="${invoice.key} · vencimento ${formatDate(invoice.dueDate)}" disabled></div><div class="field"><label>Conta pagadora</label><select id="pay-card-account"><option value="">Selecione</option>${accountOptions}</select></div><div class="field"><label>Valor pago</label><input id="pay-card-value" type="number" min="0.01" step="0.01" value="${fromCents(invoice.outstanding)}"></div><div class="field"><label>Data do pagamento</label><input id="pay-card-date" type="date" value="${todayLocal()}"></div><div class="form-error" id="pay-card-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="pay-card-cancel">Cancelar</button><button class="btn btn-primary" id="pay-card-save" ${state.contas.length?'':'disabled'}>Registrar pagamento</button></div>`,()=>{
      document.getElementById('pay-card-cancel').onclick=closeModal;
      document.getElementById('pay-card-save').onclick=async()=>{
        const value=toCents(document.getElementById('pay-card-value').value),accountId=document.getElementById('pay-card-account').value,error=document.getElementById('pay-card-error');
        const fieldErrors={};if(!accountId)fieldErrors['pay-card-account']='Selecione a conta usada no pagamento.';if(value<=0||value>invoice.outstanding)fieldErrors['pay-card-value']='Informe um valor maior que zero e até o saldo da fatura.';if(!FinTrackFormValidation.show(fieldErrors,'pay-card-error'))return;
        try{FinTrackState.replaceState(FinTrackServices.payments.card(state,{id:uid('pagamento-cartao'),cartaoId:card.id,invoiceKey:invoice.key,contaId:accountId,valor:value,outstanding:invoice.outstanding,data:document.getElementById('pay-card-date').value,idFactory:uid}));}catch(paymentError){error.textContent=paymentError.message;return;}
        registrarHistorico('pagamento_fatura',`Pagamento de fatura: ${card.nome}`,{valor:value,invoiceKey:invoice.key});await saveData();closeModal();render();
      };
    });
  };
  window.openDebtPaymentForm=function(debt){
    const projection=FinTrackCore.debtProjection(debt);
    const accountOptions=state.contas.map(account=>`<option value="${account.id}">${esc(account.nome)}</option>`).join('');
    openModal('Registrar pagamento da dívida',`<div class="field"><label>Credor</label><input value="${esc(debt.credor)}" disabled></div><div class="field"><label>Saldo atual</label><input value="${formatMoney(debt.saldo)}" disabled></div><div class="field"><label>Conta pagadora</label><select id="pay-debt-account"><option value="">Selecione</option>${accountOptions}</select></div><div class="field"><label>Valor pago</label><input id="pay-debt-value" type="number" min="0.01" step="0.01" value="${projection.installment?fromCents(projection.installment):''}"></div><div class="field"><label>Data do pagamento</label><input id="pay-debt-date" type="date" value="${todayLocal()}"></div><div class="form-error" id="pay-debt-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="pay-debt-cancel">Cancelar</button><button class="btn btn-primary" id="pay-debt-save" ${state.contas.length?'':'disabled'}>Registrar pagamento</button></div>`,()=>{
      document.getElementById('pay-debt-cancel').onclick=closeModal;
      document.getElementById('pay-debt-save').onclick=async()=>{
        const value=toCents(document.getElementById('pay-debt-value').value),accountId=document.getElementById('pay-debt-account').value,error=document.getElementById('pay-debt-error');
        const fieldErrors={};if(!accountId)fieldErrors['pay-debt-account']='Selecione a conta usada no pagamento.';if(value<=0)fieldErrors['pay-debt-value']='Informe um valor maior que zero.';if(!FinTrackFormValidation.show(fieldErrors,'pay-debt-error'))return;
        try{FinTrackState.replaceState(FinTrackServices.payments.debt(state,{id:uid('pagamento-divida'),dividaId:debt.id,contaId:accountId,valor:value,data:document.getElementById('pay-debt-date').value,idFactory:uid}));}catch(paymentError){error.textContent=paymentError.message;return;}
        registrarHistorico('pagamento_divida',`Pagamento registrado: ${debt.credor}`,{valor:value,dividaId:debt.id});await saveData();closeModal();render();
      };
    });
  };
})();
