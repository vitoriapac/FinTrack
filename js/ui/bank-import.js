(function(){
  'use strict';
  let session=null;
  const fields=[['date','Data'],['description','Descrição'],['amount','Valor com sinal'],['debit','Débito'],['credit','Crédito'],['sourceId','Identificador (opcional)'],['documentNumber','Documento (opcional)']];
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>(Math.abs(value)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const message=(id,value)=>{const target=document.getElementById(id);if(target)target.textContent=value;};
  const accountOptions=(selected,exclude)=>state.contas.filter(account=>account.id!==exclude).map(account=>`<option value="${escape(account.id)}" ${account.id===selected?'selected':''}>${escape(account.nome)}</option>`).join('');
  const categoryOptions=(type,selected='')=>`<option value="">Escolha a categoria</option>${state.categorias.filter(category=>category.tipo===(type==='debit'?'Saída':'Entrada')&&category.natureza!=='movimentacao').map(category=>`<option value="${escape(category.id)}" ${category.id===selected?'selected':''}>${escape(category.nome)}</option>`).join('')}`;
  const identity=transaction=>transaction.sourceId?`${transaction.source.accountId}|${transaction.source.identityKey||transaction.sourceId}`:[transaction.source.accountId,transaction.date,transaction.amountCents,transaction.description.toLowerCase()].join('|');
  function showStep(title,body,onMount,step){session.screen={title,body,onMount,step};render();}
  function leave(){session=null;setView('lancamentos');}
  function start(){session={screen:null};setView('importar-extrato');}
  FinTrackViews.register('importar-extrato',()=>{
    const screen=session?.screen;
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Importar extrato</h1><p class="page-sub">CSV e OFX · dados processados localmente</p></div><button class="btn btn-ghost" id="bank-leave">Voltar a Lançamentos</button></div><section class="section bank-import-screen"><nav class="bank-steps" aria-label="Etapas da importação">${['Arquivo','Conta','Configuração','Análise'].map((label,index)=>`<span class="${index===(screen?.step||0)?'is-current':''}" ${index===(screen?.step||0)?'aria-current="step"':''}>${index+1}. ${label}</span>`).join('')}</nav><h2>${escape(screen?.title||'Escolha um extrato')}</h2>${screen?.body||'<p>Escolha um arquivo CSV ou OFX de até 10 MB. Nenhuma transação será salva antes da sua revisão.</p><div class="bank-file-choices"><label class="btn btn-primary" for="bank-csv-file">Escolher CSV</label><input id="bank-csv-file" type="file" accept=".csv,text/csv" hidden><label class="btn btn-ghost" for="bank-ofx-file">Escolher OFX</label><input id="bank-ofx-file" type="file" accept=".ofx,.qfx,application/x-ofx" hidden></div><p id="bank-file-error" class="form-error" role="alert"></p>'}</section>`;
  });
  function rawField(index,key){
    if(session.format==='ofx')return String(session.records[index]?.[key]??'').trim();
    const column=session.mapping[key];return Number.isInteger(column)?String(session.parsed.rows[index].cells[column]??'').trim():'';
  }
  const editFields=(index,transaction)=>`<details class="bank-edit"><summary>Ajustar linha</summary><div class="bank-edit-grid"><label>Data<input data-bank-edit-date value="${escape(transaction?.date||rawField(index,'date'))}"></label><label>Descrição<input data-bank-edit-description value="${escape(transaction?.description||rawField(index,'description'))}"></label><label>Valor com sinal<input data-bank-edit-amount value="${escape(transaction?String(transaction.amountCents/100):rawField(index,'amount'))}" placeholder="Ex.: -12,84"></label></div><button class="btn btn-ghost" data-bank-apply-edit="${index}">Aplicar ajuste</button></details>`;

  async function chooseCsv(file){
    if(!file)return;
    if(file.size>10*1024*1024){message('bank-file-error','O limite atual é de 10 MB por extrato.');return;}
    const parsed=FinTrackBankCsv.parse(await file.text());
    if(parsed.errors.length){message('bank-file-error',parsed.errors[0]);return;}
    session={format:'csv',fileName:file.name,parsed,mapping:FinTrackBankCsv.suggestMapping(parsed.headers),accountId:'',page:0,decisions:[]};
    showAccount();
  }
  async function chooseOfx(file){
    if(!file)return;
    if(file.size>10*1024*1024){message('bank-file-error','O limite atual é de 10 MB por extrato.');return;}
    const bytes=await file.arrayBuffer(),header=new TextDecoder('windows-1252').decode(bytes.slice(0,1024));
    const latin=/CHARSET\s*:\s*(?:1252|ISO-8859-1)|encoding\s*=\s*["'](?:windows-1252|ISO-8859-1)["']/i.test(header);
    const parsed=FinTrackBankOfx.parse(new TextDecoder(latin?'windows-1252':'utf-8',{fatal:true}).decode(bytes));
    if(parsed.errors.length){message('bank-file-error',parsed.errors[0]);return;}
    session={format:'ofx',fileName:file.name,parsed,statementIndex:0,accountId:'',page:0,decisions:[]};
    showAccount();
  }

  function startPreview(preview,errorId){
    if(!preview.rows.length){message(errorId,preview.errors[0]?.messages[0]||'Sem linhas para revisar.');return;}
    session.preview=preview;
    const seen=new Set(),index=FinTrackImportBatches.candidateIndex(state);
    session.decisions=preview.rows.map(row=>{
      if(!row.transaction)return {rowNumber:row.rowNumber,transaction:null,action:'invalid'};
      const transaction=row.transaction,candidates=FinTrackImportBatches.candidates(state,transaction,index),repeated=seen.has(identity(transaction));
      seen.add(identity(transaction));
      const suggestion=FinTrackImportAssistant.suggestCategory(state,transaction),transferHint=FinTrackImportAssistant.transferHints(state,transaction);
      const destinations=[...new Set(transferHint.counterparts.map(item=>item.accountId))];
      const ambiguousOrigin=transaction.source.format==='ofx'&&Boolean(transaction.sourceId)&&!transaction.source.identityKey;
      return {rowNumber:row.rowNumber,transaction,candidates,repeated,suggestion,transferHint,ambiguousOrigin,action:candidates.length||repeated||transferHint.reason||ambiguousOrigin?'review':'import',categoryId:suggestion?.categoryId||'',matchId:'',destinationAccountId:destinations.length===1?destinations[0]:'',counterpartId:'',rememberRule:false};
    });
    session.page=0;showReview();
  }
  function showMapping(){
    const options=key=>`<option value="">Não usada</option>${session.parsed.headers.map((header,index)=>`<option value="${index}" ${session.mapping[key]===index?'selected':''}>${escape(header||`Coluna ${index+1}`)}</option>`).join('')}`;
    const examples=session.parsed.rows.slice(0,3).map(row=>`<li>Linha ${row.rowNumber}: ${escape(row.cells.slice(0,5).join(' · '))}</li>`).join('');
    const body=`<p>Arquivo <strong>${escape(session.fileName)}</strong> · conta <strong>${escape(state.contas.find(account=>account.id===session.accountId)?.nome||'')}</strong>. Associe as colunas; use valor com sinal ou débito e crédito.</p><div class="bank-map-grid">${fields.map(([key,label])=>`<label>${label}<select data-bank-map="${key}">${options(key)}</select></label>`).join('')}</div><details><summary>Exemplos do arquivo</summary><ul>${examples}</ul></details><fieldset class="bank-period"><legend>Período coberto (opcional)</legend><p>Informe apenas se o arquivo for um extrato completo para este período. Dias sem movimentação não são lacunas.</p><label>De <input id="bank-period-from" type="date" value="${escape(session.period?.from||'')}"></label><label>Até <input id="bank-period-to" type="date" value="${escape(session.period?.to||'')}"></label></fieldset><p id="bank-map-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-back">Voltar</button><button class="btn btn-primary" id="bank-preview">Analisar linhas</button></div>`;
    showStep('Configurar CSV',body,()=>{
      document.getElementById('bank-back').onclick=showAccount;
      document.getElementById('bank-preview').onclick=()=>{
        document.querySelectorAll('[data-bank-map]').forEach(select=>{if(select.value==='')delete session.mapping[select.dataset.bankMap];else session.mapping[select.dataset.bankMap]=Number(select.value);});
        const indexes=['date','description',session.mapping.amount!==undefined?'amount':'debit','credit'].filter(key=>session.mapping[key]!==undefined).map(key=>session.mapping[key]);
        if(new Set(indexes).size!==indexes.length){message('bank-map-error','Cada campo obrigatório deve usar uma coluna diferente.');return;}
        const from=document.getElementById('bank-period-from').value,to=document.getElementById('bank-period-to').value;
        if(Boolean(from)!==Boolean(to)){message('bank-map-error','Informe as duas datas do período ou deixe ambas vazias.');return;}
        session.period=from?FinTrackBankImport.statementPeriod(from,to,'confirmed'):null;
        if(from&&!session.period){message('bank-map-error','O período informado é inválido.');return;}
        startPreview(FinTrackBankCsv.preview(session.parsed,session.mapping,session.accountId),'bank-map-error');
      };
    },2);
  }
  function showAccount(){
    const statementSelect=session.format==='ofx'?`<label>Extrato no arquivo<select id="bank-ofx-statement">${session.parsed.statements.map(statement=>`<option value="${statement.index}" ${statement.index===session.statementIndex?'selected':''}>${escape(statement.bankId||'Banco')} · conta final ${escape(statement.accountSuffix||'não informado')} · ${statement.records.length} movimento(s) · ${escape(statement.currency||'moeda ausente')}</option>`).join('')}</select></label>`:'';
    const body=`<p>Confira a conta antes de continuar. O nome do banco e os últimos dígitos são pistas, não uma seleção automática.</p><div class="bank-map-grid">${statementSelect}<label>Conta no FinTrack<select id="bank-account"><option value="">Selecione a conta</option>${accountOptions(session.accountId)}</select></label></div><p id="bank-account-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-back">Voltar</button><button class="btn btn-primary" id="bank-next">Confirmar conta</button></div>`;
    showStep('Confirmar conta',body,()=>{
      document.getElementById('bank-back').onclick=start;
      document.getElementById('bank-next').onclick=()=>{
        session.accountId=document.getElementById('bank-account').value;
        if(!state.contas.some(account=>account.id===session.accountId)){message('bank-account-error','Selecione uma conta válida.');return;}
        if(session.format==='ofx')session.statementIndex=Number(document.getElementById('bank-ofx-statement').value);
        session.format==='csv'?showMapping():showOfxConfiguration();
      };
    },1);
  }
  function showOfxConfiguration(){
    const statement=session.parsed.statements[session.statementIndex];
    const examples=statement.records.slice(0,3).map(record=>`<li>${escape(record.date)} · ${escape(record.description)} · ${escape(record.amount)}</li>`).join('');
    const body=`<p>Arquivo <strong>${escape(session.fileName)}</strong> · conta <strong>${escape(state.contas.find(account=>account.id===session.accountId)?.nome||'')}</strong>.</p><p>Banco ${escape(statement.bankId||'não informado')} · conta final ${escape(statement.accountSuffix||'não informado')} · ${statement.records.length} movimento(s) · moeda ${escape(statement.currency||'não informada')}.</p><p>${statement.period?`Período informado no OFX: ${escape(statement.period.from)} a ${escape(statement.period.to)}.`:'O OFX não informa um período confiável; a cobertura ficará desconhecida.'}</p><h3>Exemplos do arquivo</h3><ul>${examples}</ul><p id="bank-ofx-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-back">Voltar</button><button class="btn btn-primary" id="bank-preview">Analisar linhas</button></div>`;
    showStep('Conferir OFX',body,()=>{
      document.getElementById('bank-back').onclick=showAccount;
      document.getElementById('bank-preview').onclick=()=>{session.records=statement.records;session.period=statement.period;startPreview(FinTrackBankOfx.preview(statement,session.accountId),'bank-ofx-error');};
    },2);
  }

  function rowMarkup(row,index){
    const decision=session.decisions[index];
    if(!decision.transaction)return `<article class="bank-row bank-row-error" data-bank-row="${index}"><div><strong>Linha ${row.rowNumber} · Inválida</strong><p>${escape(row.errors.join(' '))}</p>${editFields(index,null)}</div></article>`;
    const transaction=decision.transaction,compatible=decision.candidates.filter(candidate=>candidate.compatible);
    const closed=state.fechamentos?.[transaction.date.slice(0,7)]?.status==='fechado';
    const matches=compatible.map(candidate=>`<option value="${escape(candidate.id)}" ${decision.matchId===candidate.id?'selected':''}>${escape(candidate.description)}${candidate.exactSource?' · mesmo ID de origem':''}${candidate.exactDescription?' · mesma descrição':''}</option>`).join('');
    const counterparts=decision.transferHint.counterparts.filter(candidate=>candidate.accountId===decision.destinationAccountId);
    const transferFields=`<div class="bank-transfer-fields" data-bank-transfer-fields ${decision.action==='transfer'?'':'hidden'}><label>Outra conta sua<select data-bank-destination><option value="">Escolha a conta</option>${accountOptions(decision.destinationAccountId,transaction.source.accountId)}</select></label><label>Movimento oposto existente<select data-bank-counterpart><option value="">Nenhum · criar as duas pontas</option>${counterparts.map(candidate=>`<option value="${escape(candidate.entryId)}" ${decision.counterpartId===candidate.entryId?'selected':''}>${escape(candidate.description)}</option>`).join('')}</select></label></div>`;
    return `<article class="bank-row" data-bank-row="${index}"><div><strong>Linha ${row.rowNumber} · ${escape(transaction.date)} · ${transaction.type==='debit'?'-':'+'}${money(transaction.amountCents)}</strong><p>${escape(transaction.description)}</p>${compatible.length?`<small>Possível correspondência: ${compatible.length} lançamento(s) da mesma conta, data e valor.</small>`:''}${decision.candidates.some(candidate=>!candidate.compatible)?'<small>Mesmo ID de origem com data ou valor diferente. Revise antes de importar.</small>':''}${decision.ambiguousOrigin?'<small>O OFX não informa banco e conta suficientes para uma identidade de origem segura. Confirme esta linha.</small>':''}${decision.repeated?'<small>Possível repetição no arquivo.</small>':''}${decision.suggestion?`<small>Categoria sugerida: ${escape(decision.suggestion.reason)}</small>`:''}${decision.transferHint.reason?`<small>Possível transferência: ${escape(decision.transferHint.reason)}</small>`:''}${closed?'<small>Mês fechado: reabra antes de importar.</small>':''}${editFields(index,transaction)}</div><div class="bank-row-controls"><label>Decisão<select data-bank-action><option value="review" ${decision.action==='review'?'selected':''}>Revisar</option><option value="import" ${decision.action==='import'?'selected':''}>Importar como novo</option>${compatible.length?`<option value="link" ${decision.action==='link'?'selected':''}>Vincular ao existente</option>`:''}${state.contas.length>1?`<option value="transfer" ${decision.action==='transfer'?'selected':''}>Transferência entre contas</option>`:''}<option value="ignore" ${decision.action==='ignore'?'selected':''}>Ignorar</option></select></label><label>Categoria<select data-bank-category ${decision.action==='import'?'':'disabled'}>${categoryOptions(transaction.type,decision.categoryId)}</select></label>${compatible.length?`<label>Correspondência<select data-bank-match><option value="">Escolha o lançamento</option>${matches}</select></label>`:''}${transferFields}<label class="bank-remember"><input type="checkbox" data-bank-remember ${decision.rememberRule?'checked':''} ${decision.action==='import'?'':'disabled'}> Lembrar esta descrição e categoria para próximos extratos</label></div></article>`;
  }
  function showReview(){
    const valid=session.decisions.filter(decision=>decision.transaction),suspect=valid.filter(decision=>decision.candidates.length||decision.repeated||decision.transferHint.reason||decision.ambiguousOrigin).length;
    const start=session.page*40,visible=session.preview.rows.slice(start,start+40);
    const body=`<p>${session.preview.totalRows} linha(s): ${valid.length} válida(s), ${session.preview.rows.length-valid.length} com erro, ${suspect} para verificar. Sugestões nunca são salvas sem sua decisão.</p><div class="bank-bulk"><label>Categoria para todas as despesas<select id="bank-bulk-debit">${categoryOptions('debit')}</select></label><label>Categoria para todas as receitas<select id="bank-bulk-credit">${categoryOptions('credit')}</select></label><button class="btn btn-ghost" id="bank-apply-categories">Aplicar categorias</button></div><div class="bank-review-list">${visible.map((row,offset)=>rowMarkup(row,start+offset)).join('')}</div><div class="bank-pages"><button class="btn btn-ghost" id="bank-prev" ${session.page===0?'disabled':''}>Anterior</button><span>Página ${session.page+1} de ${Math.ceil(session.preview.rows.length/40)}</span><button class="btn btn-ghost" id="bank-next" ${start+40>=session.preview.rows.length?'disabled':''}>Próxima</button></div><p id="bank-review-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-back">Voltar</button><button class="btn btn-primary" id="bank-commit">Salvar decisões</button></div>`;
    showStep(`Revisar extrato ${session.format.toUpperCase()}`,body,()=>{
      document.querySelectorAll('[data-bank-row]').forEach(element=>{
        const decision=session.decisions[Number(element.dataset.bankRow)];
        const action=element.querySelector('[data-bank-action]');if(action)action.onchange=event=>{decision.action=event.target.value;element.querySelector('[data-bank-transfer-fields]').hidden=decision.action!=='transfer';element.querySelector('[data-bank-category]').disabled=decision.action!=='import';const remember=element.querySelector('[data-bank-remember]');remember.disabled=decision.action!=='import';if(remember.disabled){remember.checked=false;decision.rememberRule=false;}};
        const category=element.querySelector('[data-bank-category]');if(category)category.onchange=event=>{decision.categoryId=event.target.value;};
        const match=element.querySelector('[data-bank-match]');if(match)match.onchange=event=>{decision.matchId=event.target.value;};
        const destination=element.querySelector('[data-bank-destination]');if(destination)destination.onchange=event=>{decision.destinationAccountId=event.target.value;decision.counterpartId='';showReview();};
        const counterpart=element.querySelector('[data-bank-counterpart]');if(counterpart)counterpart.onchange=event=>{decision.counterpartId=event.target.value;};
        const remember=element.querySelector('[data-bank-remember]');if(remember)remember.onchange=event=>{decision.rememberRule=event.target.checked;};
      });
      document.querySelectorAll('[data-bank-apply-edit]').forEach(button=>button.onclick=()=>applyEdit(Number(button.dataset.bankApplyEdit),button.closest('[data-bank-row]')));
      document.getElementById('bank-apply-categories').onclick=()=>{const debit=document.getElementById('bank-bulk-debit').value,credit=document.getElementById('bank-bulk-credit').value;session.decisions.forEach(decision=>{if(decision.transaction&&decision.action==='import'){const category=decision.transaction.type==='debit'?debit:credit;if(category)decision.categoryId=category;}});showReview();};
      document.getElementById('bank-prev').onclick=()=>{session.page--;showReview();};document.getElementById('bank-next').onclick=()=>{session.page++;showReview();};
      document.getElementById('bank-back').onclick=session.format==='csv'?showMapping:showOfxConfiguration;
      document.getElementById('bank-commit').onclick=commit;
    },3);
  }
  function applyEdit(index,element){
    const previous=session.decisions[index].transaction;
    const statement=session.format==='ofx'?session.parsed.statements[session.statementIndex]:null;
    const result=FinTrackBankImport.normalizeTransaction({rowNumber:session.preview.rows[index].rowNumber,date:element.querySelector('[data-bank-edit-date]').value,description:element.querySelector('[data-bank-edit-description]').value,originalDescription:previous?.originalDescription||rawField(index,'description'),amount:element.querySelector('[data-bank-edit-amount]').value,sourceId:previous?.sourceId||rawField(index,'sourceId'),documentNumber:previous?.documentNumber||rawField(index,'documentNumber'),currency:session.format==='ofx'?session.records[index].currency:'BRL'},{format:session.format,accountId:session.accountId,currency:'BRL',bankId:statement?.bankId,externalAccountId:statement?.externalAccountId});
    session.preview.rows[index].transaction=result.transaction;session.preview.rows[index].errors=result.errors;
    const candidateIndex=FinTrackImportBatches.candidateIndex(state),seen=new Set();
    session.decisions.forEach((decision,rowIndex)=>{
      const transaction=session.preview.rows[rowIndex].transaction;
      if(!transaction){session.decisions[rowIndex]={...decision,transaction:null,action:'invalid'};return;}
      const repeated=seen.has(identity(transaction));seen.add(identity(transaction));
      const suggestion=FinTrackImportAssistant.suggestCategory(state,transaction),transferHint=FinTrackImportAssistant.transferHints(state,transaction);
      session.decisions[rowIndex]={...decision,transaction,candidates:FinTrackImportBatches.candidates(state,transaction,candidateIndex),repeated,suggestion,transferHint,ambiguousOrigin:transaction.source.format==='ofx'&&Boolean(transaction.sourceId)&&!transaction.source.identityKey,action:rowIndex===index||repeated&&!decision.repeated?'review':decision.action,categoryId:rowIndex===index&&previous?.type!==transaction.type?suggestion?.categoryId||'':decision.categoryId||suggestion?.categoryId||'',matchId:rowIndex===index?'':decision.matchId,counterpartId:rowIndex===index?'':decision.counterpartId};
    });
    showReview();
  }

  async function commit(){
    const decisions=session.decisions.filter(decision=>decision.transaction);
    if(decisions.some(decision=>decision.action==='review')){message('bank-review-error','Resolva todas as linhas marcadas para revisão.');return;}
    if(decisions.some(decision=>decision.action==='import'&&!decision.categoryId)){message('bank-review-error','Escolha a categoria de cada linha que será importada.');return;}
    if(decisions.some(decision=>decision.action==='link'&&!decision.matchId)){message('bank-review-error','Escolha a correspondência de cada linha vinculada.');return;}
    if(decisions.some(decision=>decision.action==='transfer'&&!decision.destinationAccountId)){message('bank-review-error','Escolha a outra conta de cada transferência.');return;}
    if(decisions.some(decision=>['import','transfer'].includes(decision.action)&&state.fechamentos?.[decision.transaction.date.slice(0,7)]?.status==='fechado')){message('bank-review-error','Há lançamentos em mês fechado. Reabra o mês ou ignore essas linhas.');return;}
    try{
      const result=FinTrackImportBatches.commit(state,decisions,{format:session.format,fileName:session.fileName,accountId:session.accountId,period:session.period},uid);
      const report=FinTrackValidation.validateData(result.state);if(!report.valid)throw new Error(report.errors[0]);
      await registrarBackup('Antes da importação bancária');const previous=state;
      FinTrackState.replaceState({...result.state,_backups:previous._backups});
      registrarHistorico('importacao_bancaria',`Extrato importado: ${session.fileName}`,{batchId:result.batch.id,criados:result.batch.created.length,vinculados:result.batch.linked.length,ignorados:result.batch.ignored.length});
      if(!await saveData()){FinTrackState.replaceState(previous);throw new Error('Falha ao salvar. Nenhuma linha foi importada.');}
      leave();
    }catch(error){message('bank-review-error',error.message);}
  }

  function showRules(){
    const rules=(state.importRules||[]).map(rule=>`<div class="bank-batch"><span>${escape(rule.pattern)} → ${escape(state.categorias.find(category=>category.id===rule.categoryId)?.nome||'Categoria removida')} (${escape(rule.type)})</span><button class="btn btn-ghost" data-bank-remove-rule="${escape(rule.id)}">Remover</button></div>`).join('');
    const body=`<p>Regras locais sugerem uma categoria quando a descrição contém o texto informado. Você confirma a categoria na revisão.</p><div class="bank-map-grid"><label>Texto na descrição<input id="bank-rule-pattern" maxlength="80" placeholder="Ex.: supermercado"></label><label>Tipo<select id="bank-rule-type"><option>Despesa</option><option>Receita</option></select></label><label>Categoria<select id="bank-rule-category">${categoryOptions('debit')}</select></label></div><p id="bank-rule-error" class="form-error" role="alert"></p><div class="modal-actions"><button class="btn btn-ghost" id="bank-rule-close">Fechar</button><button class="btn btn-primary" id="bank-rule-add">Adicionar regra</button></div><div class="bank-rule-list">${rules||'<p>Nenhuma regra cadastrada.</p>'}</div>`;
    FinTrackModal.open('Regras de categoria',body,()=>{
      document.getElementById('bank-rule-close').onclick=FinTrackModal.close;
      document.getElementById('bank-rule-type').onchange=event=>{document.getElementById('bank-rule-category').innerHTML=categoryOptions(event.target.value==='Despesa'?'debit':'credit');};
      document.getElementById('bank-rule-add').onclick=async()=>{try{const previous=state,next=FinTrackImportAssistant.addRule(state,{pattern:document.getElementById('bank-rule-pattern').value,type:document.getElementById('bank-rule-type').value,categoryId:document.getElementById('bank-rule-category').value},uid);FinTrackState.replaceState(next);if(!await saveData()){FinTrackState.replaceState(previous);throw new Error('Falha ao salvar a regra.');}render();showRules();}catch(error){message('bank-rule-error',error.message);}};
      document.querySelectorAll('[data-bank-remove-rule]').forEach(button=>button.onclick=async()=>{const previous=state;FinTrackState.replaceState(FinTrackImportAssistant.removeRule(state,button.dataset.bankRemoveRule));if(!await saveData()){FinTrackState.replaceState(previous);message('bank-rule-error','Falha ao remover a regra.');return;}render();showRules();});
    });
  }

  FinTrackScreenEvents.register(main=>{
    const open=main.querySelector('#btn-importar-extrato');if(open)open.onclick=start;
    const back=main.querySelector('#bank-leave');if(back)back.onclick=leave;
    const csvInput=main.querySelector('#bank-csv-file');if(csvInput)csvInput.onchange=async()=>{try{await chooseCsv(csvInput.files[0]);}catch(error){message('bank-file-error',error.message);}csvInput.value='';};
    const ofxInput=main.querySelector('#bank-ofx-file');if(ofxInput)ofxInput.onchange=async()=>{try{await chooseOfx(ofxInput.files[0]);}catch(error){message('bank-file-error',error.message);}ofxInput.value='';};
    if(main.querySelector('.bank-import-screen'))session?.screen?.onMount?.();
    const ruleButton=main.querySelector('#btn-bank-rules');if(ruleButton)ruleButton.onclick=showRules;
    main.querySelectorAll('[data-undo-bank-batch]').forEach(button=>button.onclick=()=>FinTrackModal.confirmAction('Desfazer os lançamentos criados por este lote? Transferências incorporadas serão restauradas. Regras de categoria criadas por você permanecem disponíveis.',async()=>{
      try{const result=FinTrackImportBatches.undo(state,button.dataset.undoBankBatch),report=FinTrackValidation.validateData(result.state);if(!report.valid)throw new Error(report.errors[0]);const previous=state;FinTrackState.replaceState(result.state);registrarHistorico('desfazer_importacao_bancaria',`Lote desfeito: ${result.batch.fileName}`,{batchId:result.batch.id,removidos:result.batch.created.length});if(!await saveData()){FinTrackState.replaceState(previous);throw new Error('Falha ao salvar. O lote foi preservado.');}render();}catch(error){FinTrackModal.info('Não foi possível desfazer',error.message);}
    },'Desfazer lote'));
  });
})();
