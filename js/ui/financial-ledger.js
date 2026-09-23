(function(){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  window.FinancialLedgerTable={renderMarkup(options={}){return `<div class="table-wrap financial-ledger-wrap"><table class="${escape(options.className||'financial-ledger')}" aria-label="${escape(options.label||'Movimentações financeiras')}"><thead>${options.head||''}</thead><tbody>${options.body||''}</tbody></table></div>`;},render(options={}){
    const columns=Array.isArray(options.columns)?options.columns:[],rows=Array.isArray(options.rows)?options.rows:[];
    if(!rows.length)return window.EmptyState.render({title:options.emptyTitle||'Nenhuma movimentação no período',description:options.emptyDescription||'Ajuste os filtros para consultar o extrato.'});
    const headings=columns.map(column=>`<th${column.numeric?' class="num"':''} scope="col">${escape(column.label)}</th>`).join('');
    return this.renderMarkup({label:options.label,head:`<tr>${headings}</tr>`,body:rows.map(row=>`<tr>${columns.map(column=>`<td${column.numeric?' class="num"':''}>${column.render(row)}</td>`).join('')}</tr>`).join('')});
  }};
})();
