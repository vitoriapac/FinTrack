(function(){
  const escape=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const money=value=>(Number(value||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const date=value=>{const text=String(value||'').slice(0,10),parts=text.split('-');return parts.length===3?`${parts[2]}/${parts[1]}/${parts[0]}`:'—';};
  const rows=(items,renderer,columns,empty)=>items?.length?items.map(renderer).join(''):`<tr><td colspan="${columns}" class="empty">${empty}</td></tr>`;

  function buildHtml(key,closing){
    if(!closing?.snapshot) throw new Error('O relatório exige um snapshot mensal fechado.');
    const snapshot=closing.snapshot,planning=snapshot.planejamento||{},budgets=snapshot.orcamentoDetalhado||[];
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>FinTrack — ${escape(key)}</title><style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#1c2620;margin:0}h1,h2{color:#24402f}h1{font-size:24px;margin:0}h2{font-size:15px;margin:24px 0 8px}.muted{color:#766f5e}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}.card{border:1px solid #d9d2bf;padding:10px}.card span{display:block;color:#766f5e;font-size:10px}.card strong{display:block;margin-top:4px;font-size:16px}table{width:100%;border-collapse:collapse}th,td{padding:7px;border-bottom:1px solid #e5dfce;text-align:left}th{font-size:10px;text-transform:uppercase;color:#766f5e}.num{text-align:right}.empty{text-align:center;color:#766f5e}.note{padding:12px;background:#f0ece2;margin-top:18px}footer{margin-top:28px;color:#766f5e;font-size:10px}@media print{button{display:none}}
    </style></head><body><header><h1>Relatório mensal FinTrack</h1><p class="muted">Período ${escape(key)} · snapshot fechado em ${date(closing.fechadoEm)}</p></header>
    <section class="summary"><div class="card"><span>Receitas</span><strong>${money(snapshot.receitas)}</strong></div><div class="card"><span>Despesas</span><strong>${money(snapshot.despesas)}</strong></div><div class="card"><span>Investimentos</span><strong>${money(snapshot.investimentos)}</strong></div><div class="card"><span>Resultado</span><strong>${money(snapshot.resultado)}</strong></div></section>
    <h2>Planejado x realizado</h2><table><thead><tr><th>Indicador</th><th class="num">Planejado</th><th class="num">Realizado</th></tr></thead><tbody><tr><td>Receitas</td><td class="num">${money(planning.receita)}</td><td class="num">${money(snapshot.receitas)}</td></tr><tr><td>Investimentos</td><td class="num">${money(planning.investimento)}</td><td class="num">${money(snapshot.investimentos)}</td></tr></tbody></table>
    <h2>Orçamento por categoria</h2><table><thead><tr><th>Categoria</th><th class="num">Orçado</th><th class="num">Realizado</th><th class="num">Pendente</th><th class="num">Comprometido</th><th class="num">Disponível</th></tr></thead><tbody>${rows(budgets,item=>`<tr><td>${escape(item.categoriaNome)}</td><td class="num">${money(item.orcado)}</td><td class="num">${money(item.realizado)}</td><td class="num">${item.pendente==null?'—':money(item.pendente)}</td><td class="num">${item.comprometido==null?'—':money(item.comprometido)}</td><td class="num">${money(item.disponivel)}</td></tr>`,6,'Nenhum orçamento registrado no snapshot.')}</tbody></table>
    <h2>Saldos por conta</h2><table><thead><tr><th>Conta</th><th class="num">Saldo</th></tr></thead><tbody>${rows(snapshot.contas,item=>`<tr><td>${escape(item.nome)}</td><td class="num">${money(item.saldo)}</td></tr>`,2,'Nenhuma conta registrada no snapshot.')}</tbody></table>
    <h2>Lançamentos congelados</h2><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Status</th><th class="num">Valor</th></tr></thead><tbody>${rows(snapshot.lancamentosDetalhados,item=>`<tr><td>${date(item.data)}</td><td>${escape(item.descricao)}</td><td>${escape(item.categoriaNome||'—')}</td><td>${escape(item.contaNome||'—')}</td><td>${escape(item.status)}</td><td class="num">${money(item.valor)}</td></tr>`,6,'Snapshot legado sem lançamentos detalhados.')}</tbody></table>
    ${closing.observacao?`<div class="note"><strong>Observação</strong><p>${escape(closing.observacao)}</p></div>`:''}<footer>Gerado a partir do snapshot imutável do fechamento. Dados atuais não são recalculados.</footer></body></html>`;
  }
  function open(key,closing){
    const popup=window.open('','_blank');
    if(!popup){window.alert('Permita pop-ups para gerar o relatório em PDF.');return false;}
    popup.opener=null;popup.document.open();popup.document.write(buildHtml(key,closing));popup.document.close();
    popup.addEventListener('load',()=>{popup.focus();popup.print();},{once:true});
    return true;
  }
  window.FinTrackPdfReport={buildHtml,open};
})();
