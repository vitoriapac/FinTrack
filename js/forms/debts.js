(function(){
  window.openDebtForm=function(debt=null){
    const value=id=>debt?.[id]??'';
    openModal(debt?'Editar dívida':'Nova dívida',`<div class="field"><label>Credor</label><input id="dv-credor" value="${esc(value('credor'))}" placeholder="Ex: Banco ou pessoa"></div><div class="form-row"><div class="field"><label>Saldo devedor</label><input id="dv-saldo" type="number" min="0" step="0.01" value="${debt?fromCents(debt.saldo):''}"></div><div class="field"><label>Juros (% ao mês)</label><input id="dv-juros" type="number" min="0" step="0.01" value="${value('juros')}"></div></div><div class="form-row"><div class="field"><label>Parcelas restantes</label><input id="dv-parcelas" type="number" min="0" value="${value('parcelasRestantes')}"></div><div class="field"><label>Próximo vencimento</label><input id="dv-vencimento" type="date" value="${value('proximoVencimento')}"></div></div><div class="field"><label>Prioridade</label><select id="dv-prioridade"><option ${value('prioridade')==='Alta'?'selected':''}>Alta</option><option ${!value('prioridade')||value('prioridade')==='Média'?'selected':''}>Média</option><option ${value('prioridade')==='Baixa'?'selected':''}>Baixa</option></select></div><div class="form-error" id="dv-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="dv-cancel">Cancelar</button><button class="btn btn-primary" id="dv-save">${debt?'Salvar alterações':'Salvar'}</button></div>`,()=>{
      document.getElementById('dv-cancel').onclick=closeModal;
      document.getElementById('dv-save').onclick=async()=>{
        const credor=document.getElementById('dv-credor').value.trim(),saldo=toCents(document.getElementById('dv-saldo').value),proximo=document.getElementById('dv-vencimento').value,error=document.getElementById('dv-error');
        const fieldErrors={};if(!credor)fieldErrors['dv-credor']='Informe o credor.';if(saldo<=0)fieldErrors['dv-saldo']='Informe um saldo maior que zero.';if(!proximo)fieldErrors['dv-vencimento']='Informe o próximo vencimento.';if(!FinTrackFormValidation.show(fieldErrors,'dv-error'))return;
        const payload={id:debt?.id||uid('divida'),credor,saldo,juros:Number(document.getElementById('dv-juros').value)||0,parcelasRestantes:Number(document.getElementById('dv-parcelas').value)||0,proximoVencimento:proximo,prioridade:document.getElementById('dv-prioridade').value};
        FinTrackState.replaceState(FinTrackServices.entities.upsert(state,'dividas',payload));
        registrarHistorico(debt?'edicao_divida':'criacao_divida',`${debt?'Dívida editada':'Dívida criada'}: ${credor}`);await saveData();closeModal();render();
      };
    });
  };
})();
