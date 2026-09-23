(function(){
  'use strict';
  const kindLabels={receita:'Receita',despesa:'Despesa',investimento:'Investimento',transferencia:'Transferência',pagamento_cartao:'Pagamento de fatura',pagamento_divida:'Pagamento de dívida'};
  const text=value=>String(value??'').trim().toLocaleLowerCase('pt-BR');
  const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const date=new Date(`${value}T00:00:00.000Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;};
  function classify(data,entry){
    const kind=window.FinTrackCore.nature(data,entry),value=Math.round(Number(entry.valor)||0);
    let signed=value,label=kindLabels[kind]||'Movimentação';
    if(kind==='despesa'||kind==='pagamento_cartao'||kind==='pagamento_divida')signed=-value;
    if(kind==='investimento'){const withdrawal=entry.movimentoInvestimento==='resgate';signed=withdrawal?value:-value;label=withdrawal?'Resgate de investimento':'Aporte em investimento';}
    if(kind==='transferencia'){const inbound=entry.movimentoTransferencia==='entrada';signed=inbound?value:-value;label=inbound?'Transferência recebida':'Transferência enviada';}
    return {kind,label,signed};
  }
  function query(data,filters={}){
    const from=String(filters.from||''),to=String(filters.to||'');
    if(from&&!validDate(from))throw new Error('Data inicial inválida.');
    if(to&&!validDate(to))throw new Error('Data final inválida.');
    if(from&&to&&from>to)throw new Error('A data inicial deve ser anterior ou igual à final.');
    const queryText=text(filters.search),today=filters.today||new Date().toISOString().slice(0,10),rows=(data.lancamentos||[]).filter(entry=>{
      if(!validDate(entry.data))return false;
      if(from&&entry.data<from||to&&entry.data>to)return false;
      if(filters.accountId&&entry.contaId!==filters.accountId)return false;
      if(filters.categoryId&&filters.categoryId!=='todas'&&entry.categoriaId!==filters.categoryId)return false;
      if(filters.status&&filters.status!=='todos'&&entry.status!==filters.status)return false;
      if(queryText&&!text(entry.descricao).includes(queryText))return false;
      if(filters.kind&&filters.kind!=='todos'&&classify(data,entry).kind!==filters.kind)return false;
      if(entry.serieId&&window.FinTrackCore.seriesActive&&!window.FinTrackCore.seriesActive(data,entry,today))return false;
      return true;
    }).map(entry=>({...classify(data,entry),entry})).sort((a,b)=>b.entry.data.localeCompare(a.entry.data)||String(a.entry.id).localeCompare(String(b.entry.id)));
    const sum=predicate=>rows.filter(predicate).reduce((total,row)=>total+Math.abs(row.signed),0),inflows=sum(row=>row.signed>0),outflows=sum(row=>row.signed<0),inflowsPaid=sum(row=>row.signed>0&&row.entry.status==='Pago'),outflowsPaid=sum(row=>row.signed<0&&row.entry.status==='Pago'),inflowsPending=sum(row=>row.signed>0&&row.entry.status!=='Pago'),outflowsPending=sum(row=>row.signed<0&&row.entry.status!=='Pago'),income=sum(row=>row.kind==='receita'&&row.entry.status==='Pago'),expenses=sum(row=>row.kind==='despesa'&&row.entry.status==='Pago'),incomePending=sum(row=>row.kind==='receita'&&row.entry.status!=='Pago'),expensesPending=sum(row=>row.kind==='despesa'&&row.entry.status!=='Pago'),investments=sum(row=>row.kind==='investimento'),cardPayments=sum(row=>row.kind==='pagamento_cartao'),debtPayments=sum(row=>row.kind==='pagamento_divida'),transfersIn=sum(row=>row.kind==='transferencia'&&row.signed>0),transfersOut=sum(row=>row.kind==='transferencia'&&row.signed<0),netMovement=inflowsPaid-outflowsPaid;
    return {rows,totals:{count:rows.length,inflows,outflows,inflowsPaid,outflowsPaid,inflowsPending,outflowsPending,netMovement,projectedMovement:netMovement+inflowsPending-outflowsPending,income,expenses,incomePending,expensesPending,operatingResult:income-expenses,projectedOperatingResult:income+incomePending-expenses-expensesPending,investments,cardPayments,debtPayments,transfersIn,transfersOut}};
  }
  function csv(data,filters={}){
    const result=query(data,filters),escapeCell=(value,formulaSafe=true)=>{let cell=String(value??'');if(formulaSafe&&/^[=+\-@]/.test(cell))cell="'"+cell;return `"${cell.replace(/"/g,'""')}"`;},amount=value=>(value/100).toFixed(2).replace('.',','),header=['Data','Descrição','Tipo','Conta','Categoria','Status','Valor (R$)'];
    const records=result.rows.map(row=>{const entry=row.entry,account=window.FinTrackCore.account(data,entry.contaId),category=window.FinTrackCore.category(data,entry.categoriaId);return [entry.data,entry.descricao,row.label,account?.nome||'',category?.nome||'',entry.status||'Pendente',amount(row.signed)];});
    return [header,...records].map((record,index)=>record.map((cell,column)=>escapeCell(cell,index===0||column!==6)).join(';')).join('\r\n');
  }
  window.FinancialStatementService={query,csv,classify};
})();
