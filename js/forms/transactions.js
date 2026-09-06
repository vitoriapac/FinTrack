(function(){
  'use strict';

  window.openTransferForm=function(transf=null){
    if(state.contas.length<2){infoModal('Cadastre duas contas','Uma transferência precisa de uma conta de origem e outra de destino.');return;}
    const options=state.contas.map((account,index)=>`<option value="${account.id}" ${transf?.contaId===account.id||(!transf&&index===0)?'selected':''}>${esc(account.nome)}</option>`).join('');
    const destinationOptions=state.contas.map((account,index)=>`<option value="${account.id}" ${transf?.contaDestinoId===account.id||(!transf&&index===1)?'selected':''}>${esc(account.nome)}</option>`).join('');
    openModal(transf?'Editar transferência':'Nova transferência',`<div class="form-row"><div class="field"><label for="tr-data">Data</label><input type="date" id="tr-data" value="${transf?.data||todayLocal()}"></div><div class="field"><label for="tr-status">Status</label><select id="tr-status"><option ${transf?.status==='Pago'?'selected':''}>Pago</option><option ${transf?.status==='Pendente'?'selected':''}>Pendente</option></select></div></div><div class="form-row"><div class="field"><label for="tr-origem">Conta de origem</label><select id="tr-origem">${options}</select></div><div class="field"><label for="tr-destino">Conta de destino</label><select id="tr-destino">${destinationOptions}</select></div></div><div class="field"><label for="tr-descricao">Descrição</label><input id="tr-descricao" value="${esc(transf?.descricao||'Transferência entre contas')}" maxlength="120"></div><div class="field"><label for="tr-valor">Valor</label><input type="number" id="tr-valor" min="0.01" step="0.01" value="${transf?fromCents(transf.valor):''}"></div><div class="form-error" id="tr-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="tr-cancel">Cancelar</button><button class="btn btn-primary" id="tr-save">${transf?'Salvar alterações':'Salvar transferência'}</button></div>`,()=>{
      document.getElementById('tr-cancel').onclick=closeModal;
      document.getElementById('tr-save').onclick=async()=>{
        const error=document.getElementById('tr-error'),data=document.getElementById('tr-data').value,source=document.getElementById('tr-origem').value,destination=document.getElementById('tr-destino').value,value=toCents(document.getElementById('tr-valor').value);
        if(impedirAlteracaoMes(data))return;
        const linked=transf?state.lancamentos.filter(item=>item.operacaoId===transf.operacaoId):[];
        try{
          const result=FinTrackServices.transfers.upsert(state,{operacaoId:transf?.operacaoId,saidaId:linked.find(item=>item.movimentoTransferencia==='saida')?.id||transf?.id,entradaId:linked.find(item=>item.movimentoTransferencia==='entrada')?.id,data,contaId:source,contaDestinoId:destination,descricao:document.getElementById('tr-descricao').value.trim(),valor:value,status:document.getElementById('tr-status').value},uid);
          FinTrackState.replaceState(result.state);
          registrarHistorico(transf?'edicao_transferencia':'criacao_transferencia',`${transf?'Transferência editada':'Transferência criada'}: ${result.items[0].descricao}`,{operacaoId:result.operationId,valor:value});
          await saveData();closeModal();render();
        }catch(operationError){error.textContent=operationError.message;}
      };
    });
  };

  window.openInvestmentForm=function(){
    if(state.contas.length===0){infoModal('Cadastre uma conta primeiro','Um investimento precisa sair ou retornar para uma conta cadastrada.');return;}
    openModal('Novo investimento',`<div class="form-row"><div class="field"><label for="inv-tipo">Movimento</label><select id="inv-tipo"><option value="aporte">Aporte</option><option value="resgate">Resgate</option></select></div><div class="field"><label for="inv-status">Status</label><select id="inv-status"><option>Pago</option><option>Pendente</option></select></div></div><div class="form-row"><div class="field"><label for="inv-data">Data</label><input type="date" id="inv-data" value="${todayLocal()}"></div><div class="field"><label for="inv-conta">Conta</label><select id="inv-conta">${state.contas.map(account=>`<option value="${account.id}">${esc(account.nome)}</option>`).join('')}</select></div></div><div class="form-row"><div class="field"><label for="inv-ativo">Tipo do ativo</label><input id="inv-ativo" placeholder="Ex: Tesouro, CDB, ETF" maxlength="60"></div><div class="field"><label for="inv-instituicao">Instituição</label><input id="inv-instituicao" placeholder="Ex: Banco ou corretora" maxlength="80"></div></div><div class="field"><label for="inv-descricao">Descrição</label><input id="inv-descricao" placeholder="Ex: Aporte mensal"></div><div class="field"><label for="inv-valor">Valor</label><input type="number" id="inv-valor" min="0.01" step="0.01"></div><div class="form-error" id="inv-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="inv-cancel">Cancelar</button><button class="btn btn-primary" id="inv-save">Salvar investimento</button></div>`,()=>{
      document.getElementById('inv-cancel').onclick=closeModal;
      document.getElementById('inv-save').onclick=async()=>{
        const error=document.getElementById('inv-error'),value=toCents(document.getElementById('inv-valor').value),asset=document.getElementById('inv-ativo').value.trim(),institution=document.getElementById('inv-instituicao').value.trim(),data=document.getElementById('inv-data').value;
        if(impedirAlteracaoMes(data))return;
        const fieldErrors={};if(value<=0)fieldErrors['inv-valor']='Informe um valor maior que zero.';if(!asset)fieldErrors['inv-ativo']='Informe o tipo do ativo.';if(!FinTrackFormValidation.show(fieldErrors,'inv-error'))return;
        const movement=document.getElementById('inv-tipo').value,category=state.categorias.find(item=>item.id==='cat-investimento')||state.categorias.find(item=>String(item.nome||'').toLowerCase().includes('investimento'));
        const result=FinTrackServices.investments.register(state,{movimentoInvestimento:movement,data,descricao:document.getElementById('inv-descricao').value.trim()||`${movement==='aporte'?'Aporte':'Resgate'} · ${asset}`,contaId:document.getElementById('inv-conta').value,categoriaId:category?.id,valor:value,status:document.getElementById('inv-status').value,ativo:asset,instituicao:institution},uid);
        FinTrackState.replaceState(result.state);registrarHistorico('criacao_investimento',`${movement==='aporte'?'Aporte':'Resgate'} registrado: ${asset}`,{operacaoId:result.operationId,valor:value,instituicao:institution});await saveData();closeModal();render();
      };
    });
  };

  window.openTransactionForm=(...args)=>openEntryForm(...args);
})();
