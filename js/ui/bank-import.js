(function(){
  'use strict';
  let session=null;
  const fields=[['date','Data'],['description','Descrição'],['amount','Valor com sinal'],['debit','Débito'],['credit','Crédito'],['sourceId','Identificador (opcional)'],['documentNumber','Documento (opcional)']];
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>(Math.abs(value)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const categoryOptions=type=>`<option value="">Escolha a categoria</option>${state.categorias.filter(category=>category.tipo===(type==='debit'?'Saída':'Entrada')&&category.natureza!=='movimentacao').map(category=>`<option value="${escape(category.id)}">${escape(category.nome)}</option>`).join('')}`;
  const message=(id,text)=>{const target=document.getElementById(id);if(target)target.textContent=text;};
  const rawField=(index,key)=>{const row=session.parsed.rows[index],column=session.mapping[key];return Number.isInteger(column)?String(row.cells[column]??'').trim():'';};
  const editFields=(index,transaction)=>`<details class="bank-edit"><summary>Ajustar linha</summary><div class="bank-edit-grid"><label>Data<input data-bank-edit-date value="${escape(transaction?.date||rawField(index,'date'))}"></label><label>Descrição<input data-bank-edit-description value="${escape(transaction?.description||rawField(index,'description'))}"></label><label>Valor com sinal<input data-bank-edit-amount value="${escape(transaction?String(transaction.amountCents/100):rawField(index,'amount'))}" placeholder="Ex.: -12,84"></label></div><button class="btn btn-ghost" data-bank-apply-edit="${index}">Aplicar ajuste</button></details>`;

  async function chooseFile(file){
    if(!file)return;
    if(file.size>10*1024*1024){FinTrackModal.info('Arquivo muito grande','O limite atual é de 10 MB por extrato.');return;}
    const parsed=FinTrackBankCsv.parse(await file.text());
    if(parsed.errors.length){FinTrackModal.info('CSV inválido',parsed.errors[0]);return;}
    session={fileName:file.name,parsed,mapping:FinTrackBankCsv.suggestMapping(parsed.headers),accountId:state.contas[0]?.id||'',page:0,decisions:[]};
    showMapping();
  }

  function showMapping(){
    const options=key=>`<option value="">Não usada</option>${session.parsed.headers.map((header,index)=>`<option value="${index}" ${session.mapping[key]===index?'selected':''}>${escape(header||`Coluna ${index+1}`)}</option>`).join('')}`;
    const body=`<p>Associe as colunas de <strong>${escape(session.fileName)}</strong>. Use valor com sinal ou as duas colunas débito e crédito.</p><div class="bank-map-grid"><label>Conta<select id="bank-account">${state.contas.map(account=>`<option value="${escape(account.id)}" ${account.id===session.accountId?'selected':''}>${escape(account.nome)}</option>`).join('')}</select></label>${fields.map(([key,label])=>`<label>${label}<select data-bank-map="${key}">${options(key)}</select></label>`).join('')}</div><p id="bank-map-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-cancel">Cancelar</button><button class="btn btn-primary" id="bank-preview">Ver prévia</button></div>`;
    FinTrackModal.open('Mapear extrato CSV',body,()=>{
      document.getElementById('bank-cancel').onclick=FinTrackModal.close;
      document.getElementById('bank-preview').onclick=()=>{
        session.accountId=document.getElementById('bank-account').value;
        document.querySelectorAll('[data-bank-map]').forEach(select=>{if(select.value==='')delete session.mapping[select.dataset.bankMap];else session.mapping[select.dataset.bankMap]=Number(select.value);});
        const indexes=['date','description',session.mapping.amount!==undefined?'amount':'debit','credit'].filter(key=>session.mapping[key]!==undefined).map(key=>session.mapping[key]);
        if(new Set(indexes).size!==indexes.length){message('bank-map-error','Cada campo obrigatório deve usar uma coluna diferente.');return;}
        const preview=FinTrackBankCsv.preview(session.parsed,session.mapping,session.accountId);
        if(!preview.rows.length){message('bank-map-error',preview.errors[0]?.messages[0]||'Sem linhas para revisar.');return;}
        session.preview=preview;
        const seen=new Set(),candidateIndex=FinTrackImportBatches.candidateIndex(state);
        session.decisions=preview.rows.map(row=>{
          if(!row.transaction)return {rowNumber:row.rowNumber,transaction:null,action:'invalid'};
          const transaction=row.transaction,candidates=FinTrackImportBatches.candidates(state,transaction,candidateIndex);
          const identity=transaction.sourceId?`${transaction.source.accountId}|${transaction.sourceId}`:[transaction.source.accountId,transaction.date,transaction.amountCents,transaction.description.toLowerCase()].join('|');
          const repeated=seen.has(identity);seen.add(identity);
          return {rowNumber:row.rowNumber,transaction,candidates,repeated,action:candidates.length||repeated?'review':'import',categoryId:'',matchId:''};
        });
        session.page=0;showReview();
      };
    });
  }

  function showReview(){
    const valid=session.decisions.filter(decision=>decision.transaction),suspect=valid.filter(decision=>decision.candidates.length||decision.repeated).length;
    const start=session.page*40,visible=session.preview.rows.slice(start,start+40);
    const rows=visible.map((row,offset)=>{
      const decision=session.decisions[start+offset];
      if(!decision.transaction)return `<article class="bank-row bank-row-error" data-bank-row="${start+offset}"><div><strong>Linha ${row.rowNumber} · Inválida</strong><p>${escape(row.errors.join(' '))}</p>${editFields(start+offset,null)}</div></article>`;
      const transaction=decision.transaction,closed=Boolean(state.fechamentos?.[transaction.date.slice(0,7)]?.status==='fechado');
      const compatible=decision.candidates.filter(candidate=>candidate.compatible);
      const matchOptions=compatible.map(candidate=>`<option value="${escape(candidate.id)}" ${decision.matchId===candidate.id?'selected':''}>${escape(candidate.description)}${candidate.exactSource?' · mesmo ID de origem':''}${candidate.exactDescription?' · mesma descrição':''}</option>`).join('');
      return `<article class="bank-row" data-bank-row="${start+offset}"><div><strong>Linha ${row.rowNumber} · ${escape(transaction.date)} · ${transaction.type==='debit'?'-':'+'}${money(transaction.amountCents)}</strong><p>${escape(transaction.description)}</p>${compatible.length?`<small>Possível correspondência: ${compatible.length} lançamento(s) da mesma conta, data e valor.</small>`:''}${decision.candidates.some(candidate=>!candidate.compatible)?'<small>Mesmo ID de origem encontrado com data ou valor diferente. Revise antes de importar.</small>':''}${decision.repeated?'<small> Possível repetição no arquivo.</small>':''}${closed?'<small> Mês fechado: reabra antes de importar.</small>':''}${editFields(start+offset,transaction)}</div><div class="bank-row-controls"><label>Decisão<select data-bank-action><option value="review" ${decision.action==='review'?'selected':''}>Revisar</option><option value="import" ${decision.action==='import'?'selected':''}>Importar como novo</option>${compatible.length?`<option value="link" ${decision.action==='link'?'selected':''}>Vincular ao existente</option>`:''}<option value="ignore" ${decision.action==='ignore'?'selected':''}>Ignorar</option></select></label><label>Categoria<select data-bank-category><option value="">Escolha a categoria</option>${state.categorias.filter(category=>category.tipo===(transaction.type==='debit'?'Saída':'Entrada')&&category.natureza!=='movimentacao').map(category=>`<option value="${escape(category.id)}" ${decision.categoryId===category.id?'selected':''}>${escape(category.nome)}</option>`).join('')}</select></label>${compatible.length?`<label>Correspondência<select data-bank-match><option value="">Escolha o lançamento</option>${matchOptions}</select></label>`:''}</div></article>`;
    }).join('');
    const body=`<p>${session.preview.totalRows} linha(s): ${valid.length} válida(s), ${session.preview.rows.length-valid.length} com erro, ${suspect} para verificar. Corrija as linhas com erro ou prossiga sem elas.</p><div class="bank-bulk"><label>Categoria para todas as despesas<select id="bank-bulk-debit">${categoryOptions('debit')}</select></label><label>Categoria para todas as receitas<select id="bank-bulk-credit">${categoryOptions('credit')}</select></label><button class="btn btn-ghost" id="bank-apply-categories">Aplicar categorias</button></div><div class="bank-review-list">${rows}</div><div class="bank-pages"><button class="btn btn-ghost" id="bank-prev" ${session.page===0?'disabled':''}>Anterior</button><span>Página ${session.page+1} de ${Math.ceil(session.preview.rows.length/40)}</span><button class="btn btn-ghost" id="bank-next" ${start+40>=session.preview.rows.length?'disabled':''}>Próxima</button></div><p id="bank-review-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-back">Voltar ao mapeamento</button><button class="btn btn-primary" id="bank-commit">Salvar decisões</button></div>`;
    FinTrackModal.open('Revisar extrato CSV',body,()=>{
      document.querySelectorAll('[data-bank-row]').forEach(element=>{
        const decision=session.decisions[Number(element.dataset.bankRow)];
        const action=element.querySelector('[data-bank-action]');if(action)action.onchange=event=>{decision.action=event.target.value;};
        const category=element.querySelector('[data-bank-category]');if(category)category.onchange=event=>{decision.categoryId=event.target.value;};
        const match=element.querySelector('[data-bank-match]');if(match)match.onchange=event=>{decision.matchId=event.target.value;};
      });
      document.querySelectorAll('[data-bank-apply-edit]').forEach(button=>button.onclick=()=>{
        const index=Number(button.dataset.bankApplyEdit),element=button.closest('[data-bank-row]'),previous=session.decisions[index].transaction;
        const result=FinTrackBankImport.normalizeTransaction({rowNumber:session.preview.rows[index].rowNumber,date:element.querySelector('[data-bank-edit-date]').value,description:element.querySelector('[data-bank-edit-description]').value,originalDescription:previous?.originalDescription||rawField(index,'description'),amount:element.querySelector('[data-bank-edit-amount]').value,sourceId:previous?.sourceId||rawField(index,'sourceId'),documentNumber:previous?.documentNumber||rawField(index,'documentNumber')},{format:'csv',accountId:session.accountId,currency:'BRL'});
        session.preview.rows[index].transaction=result.transaction;session.preview.rows[index].errors=result.errors;
        const candidateIndex=FinTrackImportBatches.candidateIndex(state),seen=new Set();
        session.decisions.forEach((decision,rowIndex)=>{
          const transaction=session.preview.rows[rowIndex].transaction;
          if(!transaction){session.decisions[rowIndex]={...decision,transaction:null,action:'invalid'};return;}
          const identity=transaction.sourceId?`${transaction.source.accountId}|${transaction.sourceId}`:[transaction.source.accountId,transaction.date,transaction.amountCents,transaction.description.toLowerCase()].join('|');
          const repeated=seen.has(identity);seen.add(identity);
          session.decisions[rowIndex]={...decision,transaction,candidates:FinTrackImportBatches.candidates(state,transaction,candidateIndex),repeated,action:rowIndex===index||repeated&&!decision.repeated?'review':decision.action,categoryId:rowIndex===index&&previous?.type!==transaction.type?'':decision.categoryId,matchId:rowIndex===index?'':decision.matchId};
        });
        showReview();
      });
      document.getElementById('bank-apply-categories').onclick=()=>{const debit=document.getElementById('bank-bulk-debit').value,credit=document.getElementById('bank-bulk-credit').value;session.decisions.forEach(decision=>{if(decision.transaction&&decision.action==='import'){const category=decision.transaction.type==='debit'?debit:credit;if(category)decision.categoryId=category;}});showReview();};
      document.getElementById('bank-prev').onclick=()=>{session.page--;showReview();};
      document.getElementById('bank-next').onclick=()=>{session.page++;showReview();};
      document.getElementById('bank-back').onclick=showMapping;
      document.getElementById('bank-commit').onclick=commit;
    });
  }

  async function commit(){
    const decisions=session.decisions.filter(decision=>decision.transaction);
    if(decisions.some(decision=>decision.action==='review')){message('bank-review-error','Resolva todas as linhas marcadas para revisão.');return;}
    if(decisions.some(decision=>decision.action==='import'&&!decision.categoryId)){message('bank-review-error','Escolha a categoria de cada linha que será importada.');return;}
    if(decisions.some(decision=>decision.action==='link'&&!decision.matchId)){message('bank-review-error','Escolha a correspondência de cada linha vinculada.');return;}
    if(decisions.some(decision=>decision.action==='import'&&state.fechamentos?.[decision.transaction.date.slice(0,7)]?.status==='fechado')){message('bank-review-error','Há lançamentos em mês fechado. Reabra o mês ou ignore essas linhas.');return;}
    try{
      const result=FinTrackImportBatches.commit(state,decisions,{fileName:session.fileName,accountId:session.accountId},uid);
      const report=FinTrackValidation.validateData(result.state);
      if(!report.valid)throw new Error(report.errors[0]);
      await registrarBackup('Antes da importação bancária');
      const previous=state;
      FinTrackState.replaceState({...result.state,_backups:previous._backups});
      registrarHistorico('importacao_bancaria',`Extrato importado: ${session.fileName}`,{batchId:result.batch.id,criados:result.batch.created.length,vinculados:result.batch.linked.length,ignorados:result.batch.ignored.length});
      if(!await saveData()){FinTrackState.replaceState(previous);throw new Error('Falha ao salvar. Nenhuma linha foi importada.');}
      session=null;FinTrackModal.close();render();
    }catch(error){message('bank-review-error',error.message);}
  }

  FinTrackScreenEvents.register(main=>{
    const button=main.querySelector('#btn-importar-extrato'),input=main.querySelector('#bank-csv-file');
    if(button&&input){button.onclick=()=>input.click();input.onchange=async()=>{try{await chooseFile(input.files[0]);}catch(error){FinTrackModal.info('Falha na leitura',error.message);}input.value='';};}
    main.querySelectorAll('[data-undo-bank-batch]').forEach(button=>button.onclick=()=>FinTrackModal.confirmAction('Desfazer os lançamentos criados por este lote? Vínculos com lançamentos anteriores serão apenas removidos do histórico do lote.',async()=>{
      try{
        const result=FinTrackImportBatches.undo(state,button.dataset.undoBankBatch),report=FinTrackValidation.validateData(result.state);
        if(!report.valid)throw new Error(report.errors[0]);
        const previous=state;FinTrackState.replaceState(result.state);
        registrarHistorico('desfazer_importacao_bancaria',`Lote desfeito: ${result.batch.fileName}`,{batchId:result.batch.id,removidos:result.batch.created.length});
        if(!await saveData()){FinTrackState.replaceState(previous);throw new Error('Falha ao salvar. O lote foi preservado.');}
        render();
      }catch(error){FinTrackModal.info('Não foi possível desfazer',error.message);}
    },'Desfazer lote'));
  });
})();
