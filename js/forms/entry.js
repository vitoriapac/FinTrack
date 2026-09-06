(function(){
  function categoryOptions(type,current){
    const tipo=type==='Receita'?'Entrada':'Saída';
    const cats=state.categorias.filter(c=>c.tipo===tipo);
    return cats.map(c=>`<option value="${c.id}" ${current===c.id?'selected':''}>${esc(c.nome)}</option>`).join('');
  }
  window.openEntryForm=function(lanc=null){
    if(state.contas.length===0){infoModal('Cadastre uma conta primeiro','Você precisa ter pelo menos uma conta cadastrada.');return;}
    const initial={...(lanc||{}),tipo:lanc?.tipo||'Despesa',data:lanc?.data||todayLocal(),status:lanc?.status||'Pendente'};
    const renderForm=()=>{
      const hasCats=state.categorias.some(c=>c.tipo===(initial.tipo==='Receita'?'Entrada':'Saída'));
      openModal(lanc?'Editar lançamento':'Novo lançamento',`<div class="form-row"><div class="field"><label>Tipo</label><select id="entry-tipo"><option value="Despesa" ${initial.tipo==='Despesa'?'selected':''}>Despesa</option><option value="Receita" ${initial.tipo==='Receita'?'selected':''}>Receita</option></select></div><div class="field"><label>Status</label><select id="entry-status"><option ${initial.status==='Pago'?'selected':''}>Pago</option><option ${initial.status==='Pendente'?'selected':''}>Pendente</option></select></div></div><div class="form-row"><div class="field"><label>Data</label><input type="date" id="entry-data" value="${initial.data}"></div><div class="field"><label>Vencimento</label><input type="date" id="entry-vencimento" value="${initial.dataVencimento||''}"></div></div><div class="field"><label>Descrição</label><input id="entry-descricao" value="${esc(initial.descricao||'')}" placeholder="Ex: Mercado do mês"></div><div class="form-row"><div class="field"><label>Conta</label><select id="entry-conta">${state.contas.map(c=>`<option value="${c.id}" ${initial.contaId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div><div class="field"><label>Categoria</label><select id="entry-categoria" ${hasCats?'':'disabled'}>${hasCats?categoryOptions(initial.tipo,initial.categoriaId):'<option>Nenhuma categoria disponível</option>'}</select></div></div>${initial.tipo==='Despesa'&&state.cartoes.length?`<div class="field"><label>Cartão (opcional)</label><select id="entry-cartao"><option value="">Não usar cartão</option>${state.cartoes.map(c=>`<option value="${c.id}" ${initial.cartaoId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div>`:''}<div class="field"><label>Valor</label><input type="number" id="entry-valor" min="0.01" step="0.01" value="${initial.valor?fromCents(initial.valor):''}"></div>${!lanc?`<div class="field checkbox-field"><input type="checkbox" id="entry-parcelado"><label for="entry-parcelado" style="margin:0;">Compra parcelada</label></div><div id="entry-parcelado-wrap" style="display:none;"><div class="form-row"><div class="field"><label>Valor total</label><input type="number" id="entry-total" step="0.01"></div><div class="field"><label>Quantidade</label><input type="number" id="entry-qtd" min="2" max="60" value="2"></div></div></div><div class="field checkbox-field"><input type="checkbox" id="entry-recorrente"><label for="entry-recorrente" style="margin:0;">Criar recorrência</label></div><div id="entry-recorrente-wrap" style="display:none;"><div class="form-row"><div class="field"><label>Frequência</label><select id="entry-frequencia"><option value="mensal">Mensal</option><option value="semanal">Semanal</option><option value="anual">Anual</option></select></div><div class="field"><label>Ocorrências</label><input type="number" id="entry-rec-qtd" min="1" max="60" value="12"></div></div></div>`:''}<div class="form-error" id="entry-error"></div><div class="modal-actions"><button class="btn btn-ghost" id="entry-cancel">Cancelar</button><button class="btn btn-primary" id="entry-save" ${hasCats?'':'disabled'}>Salvar</button></div>`,()=>{
        document.getElementById('entry-cancel').onclick=closeModal;
        document.getElementById('entry-tipo').onchange=e=>{initial.tipo=e.target.value;renderForm();};
        document.getElementById('entry-parcelado')?.addEventListener('change',e=>{document.getElementById('entry-parcelado-wrap').style.display=e.target.checked?'block':'none';});
        document.getElementById('entry-recorrente')?.addEventListener('change',e=>{document.getElementById('entry-recorrente-wrap').style.display=e.target.checked?'block':'none';});
        document.getElementById('entry-save').onclick=async()=>{
          const error=document.getElementById('entry-error'),valor=Number(document.getElementById('entry-valor').value),data=document.getElementById('entry-data').value,descricao=document.getElementById('entry-descricao').value.trim(),categoriaId=document.getElementById('entry-categoria').value;
          if(impedirAlteracaoMes(data))return;if(!descricao){error.textContent='Informe uma descrição.';return;}if(!Number.isFinite(valor)||valor<=0){error.textContent='Informe um valor maior que zero.';return;}if(!data||!categoriaId){error.textContent='Preencha data e categoria.';return;}
          const parcelado=document.getElementById('entry-parcelado')?.checked,recorrente=document.getElementById('entry-recorrente')?.checked;if(parcelado&&recorrente){error.textContent='Escolha parcelamento ou recorrência.';return;}
          const payload={id:lanc?.id||uid('lanc'),tipo:initial.tipo,data,dataVencimento:document.getElementById('entry-vencimento').value||undefined,descricao,contaId:document.getElementById('entry-conta').value,categoriaId,cartaoId:document.getElementById('entry-cartao')?.value||null,valor:toCents(valor),status:document.getElementById('entry-status').value,fixa:false,tipoOperacao:initial.tipo==='Receita'?'receita':'despesa',serieId:lanc?.serieId||((parcelado||recorrente)?uid(parcelado?'parcelamento':'recorrencia'):null),serieTipo:lanc?.serieTipo||(parcelado?'parcelamento':recorrente?'recorrencia':undefined),serieStatus:lanc?.serieStatus||((parcelado||recorrente)?'ativa':undefined),parcelaAtual:lanc?.parcelaAtual||(parcelado?1:undefined),totalParcelas:lanc?.totalParcelas||(parcelado?Math.max(2,Math.min(60,Number(document.getElementById('entry-qtd').value)||2)):undefined),frequencia:lanc?.frequencia||(recorrente?document.getElementById('entry-frequencia').value:undefined)};
          if(lanc){
            const idx=state.lancamentos.findIndex(x=>x.id===lanc.id);
            state.lancamentos[idx]=payload;
          }else{
            state.lancamentos.push(payload);
            if(parcelado||recorrente){
              const n=parcelado?payload.totalParcelas:Math.max(1,Math.min(60,Number(document.getElementById('entry-rec-qtd').value)||1));
              const total=parcelado?toCents(document.getElementById('entry-total').value):payload.valor;
              const base=parcelado?Math.floor(total/n):payload.valor;
              for(let k=1;k<n;k++){
                state.lancamentos.push({...payload,id:uid('lanc'),data:addInterval(payload.data,k,payload.frequencia||'mensal'),dataVencimento:payload.dataVencimento?addInterval(payload.dataVencimento,k,payload.frequencia||'mensal'):undefined,valor:parcelado?base+(k===n-1?total-base*n:0):payload.valor,status:'Pendente',parcelaAtual:parcelado?k+1:undefined,descricao:parcelado?`${descricao} (${k+1} de ${n})`:descricao});
              }
            }
          }
          registrarHistorico(lanc?'edicao_lancamento':'criacao_lancamento',`${lanc?'Lançamento editado':'Lançamento criado'}: ${descricao}`,{lancamentoId:payload.id,valor:payload.valor});await saveData();closeModal();render();
        };
      });
    };
    renderForm();
  };
})();
