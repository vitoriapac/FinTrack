(function(){
  window.openCardForm=function(card=null){
    const value=id=>card?.[id]??'';
    openModal(card?'Editar cartão':'Novo cartão',`<div class="field"><label>Nome</label><input id="cc-nome" value="${esc(value('nome'))}" placeholder="Ex: Nubank Platinum"></div><div class="form-row"><div class="field"><label>Bandeira</label><input id="cc-bandeira" value="${esc(value('bandeira'))}" placeholder="Ex: Visa"></div><div class="field"><label>Limite</label><input id="cc-limite" type="number" min="0" step="0.01" value="${card?fromCents(card.limite):''}"></div></div><div class="form-row"><div class="field"><label>Dia de fechamento</label><input id="cc-fechamento" type="number" min="1" max="31" value="${value('fechamento')}"></div><div class="field"><label>Dia de vencimento</label><input id="cc-vencimento" type="number" min="1" max="31" value="${value('vencimento')}"></div></div><div class="form-error" id="cc-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="cc-cancel">Cancelar</button><button class="btn btn-primary" id="cc-save">${card?'Salvar alterações':'Salvar'}</button></div>`,()=>{
      document.getElementById('cc-cancel').onclick=closeModal;
      document.getElementById('cc-save').onclick=async()=>{
        const nome=document.getElementById('cc-nome').value.trim(),limite=toCents(document.getElementById('cc-limite').value),error=document.getElementById('cc-error');
        if(!nome||limite<0){error.textContent='Informe nome e limite válidos.';return;}
        const payload={id:card?.id||uid('cartao'),nome,bandeira:document.getElementById('cc-bandeira').value.trim(),limite,fechamento:Number(document.getElementById('cc-fechamento').value)||null,vencimento:Number(document.getElementById('cc-vencimento').value)||null,ativo:card?.ativo!==false};
        if(card){const index=state.cartoes.findIndex(item=>item.id===card.id);state.cartoes[index]=payload;}else state.cartoes.push(payload);
        registrarHistorico(card?'edicao_cartao':'criacao_cartao',`${card?'Cartão editado':'Cartão criado'}: ${nome}`);await saveData();closeModal();render();
      };
    });
  };
})();
