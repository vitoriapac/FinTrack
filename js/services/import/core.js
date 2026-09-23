(function(){
  'use strict';

  const formats=new Set(['csv','ofx','qif']);
  const clean=value=>String(value??'').trim();

  function normalizeDate(value){
    const raw=clean(value);
    const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    const brazilian=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    const parts=iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:brazilian?[Number(brazilian[3]),Number(brazilian[2]),Number(brazilian[1])]:null;
    if(!parts) return null;
    const [year,month,day]=parts;
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day) return null;
    return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function normalizeAmount(raw){
    if(Number.isSafeInteger(raw?.amountCents)) return raw.amountCents||null;
    if(raw?.amountCents!==undefined&&raw?.amountCents!==null) return null;
    const text=clean(raw?.amount).replace(/\s/g,'').replace(/^R\$/i,'');
    const negative=/^\(.*\)$/.test(text);
    const value=negative?text.slice(1,-1):text;
    let normalized;
    if(/^[+-]?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(value)||/^[+-]?\d+,\d{2}$/.test(value)) normalized=value.replace(/\./g,'').replace(',','.');
    else if(/^[+-]?\d{1,3}(?:,\d{3})*\.\d{2}$/.test(value)||/^[+-]?\d+\.\d{2}$/.test(value)) normalized=value.replace(/,/g,'');
    else if(/^[+-]?\d+$/.test(value)) normalized=value;
    else return null;
    const amount=Number(normalized);
    const cents=Math.round(amount*100)*(negative?-1:1);
    return Number.isSafeInteger(cents)&&cents!==0?cents:null;
  }

  function normalizeTransaction(raw,options={}){
    const errors=[];
    if(!raw||typeof raw!=='object'||Array.isArray(raw)) return {transaction:null,errors:['Linha inválida.']};
    const format=clean(options.format).toLowerCase();
    const accountId=clean(options.accountId);
    const currency=clean(raw.currency||options.currency||'BRL').toUpperCase();
    const date=normalizeDate(raw.date);
    const description=clean(raw.description);
    const originalDescription=clean(raw.originalDescription)||description;
    const amountCents=normalizeAmount(raw);
    if(!formats.has(format)) errors.push('Formato de origem inválido.');
    if(!accountId) errors.push('Selecione a conta de destino.');
    if(currency!=='BRL') errors.push('Somente valores em BRL são aceitos.');
    if(!date) errors.push('Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA.');
    if(!description) errors.push('Descrição ausente.');
    if(amountCents===null) errors.push('Valor inválido ou zero.');
    if(errors.length) return {transaction:null,errors};
    const rowNumber=Number.isSafeInteger(raw.rowNumber)&&raw.rowNumber>0?raw.rowNumber:null;
    return {transaction:{
      sourceId:clean(raw.sourceId)||null,
      date,description,originalDescription,amountCents,
      type:amountCents<0?'debit':'credit',
      documentNumber:clean(raw.documentNumber)||null,
      suggestedNature:amountCents<0?'despesa':'receita',
      suggestedCategoryId:null,
      confidence:null,
      duplicateStatus:'unknown',
      reconciliationStatus:'pending',
      source:{format,accountId,currency,rowNumber}
    },errors};
  }

  function previewTransactions(records,options={}){
    if(!Array.isArray(records)) return {rows:[],items:[],errors:[{rowNumber:null,messages:['Arquivo sem linhas válidas para leitura.']}],totalRows:0};
    const rows=records.map((raw,index)=>{
      const rowNumber=Number.isSafeInteger(raw?.rowNumber)&&raw.rowNumber>0?raw.rowNumber:index+1;
      const result=normalizeTransaction(raw,{...options});
      if(result.transaction) result.transaction.source.rowNumber=rowNumber;
      return {rowNumber,transaction:result.transaction,errors:result.errors};
    });
    return {rows,items:rows.filter(row=>row.transaction).map(row=>row.transaction),errors:rows.filter(row=>row.errors.length).map(row=>({rowNumber:row.rowNumber,messages:row.errors})),totalRows:rows.length};
  }

  window.FinTrackBankImport={normalizeDate,normalizeAmount,normalizeTransaction,previewTransactions};
})();
