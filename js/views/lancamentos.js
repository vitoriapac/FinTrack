(function(){
  function actionButtons(l){
    return `<div class="row-actions"><button class="icon-btn" data-action="edit-lanc" data-id="${l.id}">Editar</button>${l.serieId?`<button class="icon-btn" data-action="toggle-serie" data-id="${l.serieId}">${serieEstaAtiva(l)?'Pausar série':'Retomar série'}</button>`:''}<button class="icon-btn" data-action="del-lanc" data-id="${l.id}">Excluir</button></div>`;
  }
  function renderMobileTransactions(items){
    return `<div class="transaction-mobile-list">${items.map(l=>`<article class="transaction-card"><div class="transaction-card-head"><div><span class="transaction-card-date">${formatDate(l.data)}</span><strong>${esc(l.descricao)}</strong></div><span class="${l.tipo==='Receita'?'money-in':'money-out'}">${l.tipo==='Receita'?'+':'-'} ${formatMoney(l.valor)}</span></div><div class="transaction-card-meta"><span>${esc(contaById(l.contaId)?.nome||'—')}</span><span>${esc(catById(l.categoriaId)?.nome||'—')}</span></div><div class="transaction-card-actions"><button class="badge ${l.status==='Pago'?'badge-paid':'badge-pending'}" data-action="toggle-status" data-id="${l.id}">${l.status}</button>${actionButtons(l)}</div></article>`).join('')}</div>`;
  }
  function renderTable(groups){
    return `<table class="transaction-table"><thead><tr><th>Data</th><th>Descrição</th><th>Conta</th><th>Categoria</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>${Object.entries(groups).map(([data,group])=>`<tr><td colspan="7" class="group-title">${formatDate(data)}</td></tr>${group.map(l=>`<tr><td>${l.tipo}</td><td>${esc(l.descricao)}${l.fixa?' <span style="color:var(--muted);font-size:12px;">(fixa)</span>':''} ${serieLabel(l)}</td><td>${esc(contaById(l.contaId)?.nome||'—')}</td><td>${esc(catById(l.categoriaId)?.nome||'—')}</td><td class="num ${l.tipo==='Receita'?'money-in':'money-out'}">${l.tipo==='Receita'?'+':'-'} ${formatMoney(l.valor)}</td><td><span class="badge ${l.status==='Pago'?'badge-paid':'badge-pending'}" style="cursor:pointer;" data-action="toggle-status" data-id="${l.id}">${l.status}</span></td><td>${actionButtons(l)}</td></tr>`).join('')}`).join('')}</tbody></table>`;
  }
  window.renderLancamentosView=function(){
    let items=lancamentosDoMes(lancFiltro.mes,lancFiltro.ano);
    if(lancFiltro.categoriaId&&lancFiltro.categoriaId!=='todas') items=items.filter(l=>l.categoriaId===lancFiltro.categoriaId);
    if(lancFiltro.busca&&lancFiltro.busca.trim()){
      const query=lancFiltro.busca.trim().toLowerCase();
      items=items.filter(l=>l.descricao.toLowerCase().includes(query));
    }
    items=items.sort((a,b)=>b.data.localeCompare(a.data));
    const total=items.reduce((sum,l)=>sum+(naturezaLancamento(l)==='receita'?Number(l.valor):naturezaLancamento(l)==='despesa'?-Number(l.valor):0),0);
    const displayed=lancMostrarTodos?items:items.slice(0,12),groups={};
    displayed.forEach(l=>(groups[l.data]||=[]).push(l));
    const content=items.length===0
      ? emptyState('Nada por aqui','Ajuste os filtros ou adicione um lançamento com o botão acima.')
      : `${renderMobileTransactions(displayed)}${renderTable(groups)}${items.length>12?`<div class="show-more"><button class="btn btn-ghost" id="btn-mostrar-lancamentos">${lancMostrarTodos?'Mostrar menos':`Mostrar todos (${items.length})`}</button></div>`:''}`;
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Lançamentos</h1><p class="page-sub">Suas receitas e despesas, mês a mês</p></div></div><div class="section"><div class="section-head"><h2>${MESES[lancFiltro.mes-1]} de ${lancFiltro.ano}</h2><div class="page-actions"><button class="btn btn-ghost" id="btn-nova-transferencia">Transferir entre contas</button><button class="btn btn-ghost" id="btn-novo-investimento">Novo investimento</button><button class="btn btn-primary" id="btn-novo-lancamento">Novo lançamento</button></div></div><div class="filters"><select id="filtro-mes" aria-label="Filtrar por mês">${MESES.map((m,i)=>`<option value="${i+1}" ${i+1===lancFiltro.mes?'selected':''}>${m}</option>`).join('')}</select><select id="filtro-ano" aria-label="Filtrar por ano">${anosDisponiveis().map(a=>`<option value="${a}" ${a===lancFiltro.ano?'selected':''}>${a}</option>`).join('')}</select><select id="filtro-categoria" aria-label="Filtrar por categoria"><option value="todas">Todas as categorias</option>${state.categorias.map(c=>`<option value="${c.id}" ${lancFiltro.categoriaId===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select><input type="text" id="filtro-busca" aria-label="Buscar por descrição" placeholder="Buscar por descrição..." value="${esc(lancFiltro.busca||'')}"></div><div class="summary-strip"><span>${items.length} lançamento(s)</span><span>Resultado filtrado: <strong>${formatMoney(total)}</strong></span></div>${content}</div>`;
  };
  window.FinTrackViews.register('lancamentos',()=>window.renderLancamentosView());
})();
