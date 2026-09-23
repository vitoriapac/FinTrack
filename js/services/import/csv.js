(function(){
  'use strict';
  const clean=value=>String(value??'').trim();
  const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');
  const aliases={date:['data','data transacao','data lancamento','date'],description:['descricao','historico','descricao transacao','memo','description'],amount:['valor','valor r','amount'],debit:['debito','saida','valor debito','debit'],credit:['credito','entrada','valor credito','credit'],sourceId:['id transacao','identificador','fitid','transaction id'],documentNumber:['documento','numero documento','numero','document']};

  function parse(text){
    const source=String(text??'').replace(/^\uFEFF/,'');
    const firstLine=source.split(/\r\n|\n|\r/,1)[0];
    const count=delimiter=>{let quoted=false,total=0;for(let i=0;i<firstLine.length;i++){if(firstLine[i]==='"'){if(quoted&&firstLine[i+1]==='"')i++;else quoted=!quoted;}else if(firstLine[i]===delimiter&&!quoted)total++;}return total;};
    const delimiter=[';',',','\t'].sort((a,b)=>count(b)-count(a))[0];
    if(!count(delimiter)) return {headers:[],rows:[],errors:['Não foi possível identificar o separador do CSV.']};
    const records=[];let cells=[],cell='',quoted=false,rowNumber=1,start=1;
    const finish=()=>{cells.push(cell);if(cells.some(value=>clean(value)))records.push({rowNumber:start,cells});cells=[];cell='';};
    for(let i=0;i<source.length;i++){
      const char=source[i];
      if(char==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(char===delimiter&&!quoted){cells.push(cell);cell='';}
      else if((char==='\n'||char==='\r')&&!quoted){finish();if(char==='\r'&&source[i+1]==='\n')i++;rowNumber++;start=rowNumber;}
      else{cell+=char;if(char==='\n'||char==='\r'){if(char==='\r'&&source[i+1]==='\n'){cell+='\n';i++;}rowNumber++;}}
    }
    if(quoted)return {headers:[],rows:[],errors:[`Linha ${start}: aspas não fechadas.`]};
    if(cell||cells.length)finish();
    if(records.length<2)return {headers:records[0]?.cells.map(clean)||[],rows:[],errors:['CSV vazio ou sem linhas de dados.']};
    const headers=records.shift().cells.map(clean);
    return {headers,rows:records,delimiter,errors:[]};
  }

  function suggestMapping(headers){
    const normalized=headers.map(fold),mapping={};
    Object.entries(aliases).forEach(([field,names])=>{const index=normalized.findIndex(header=>names.includes(header));if(index>=0)mapping[field]=index;});
    return mapping;
  }

  function preview(parsed,mapping,accountId){
    if(parsed.errors?.length)return {rows:[],items:[],errors:parsed.errors.map(message=>({rowNumber:null,messages:[message]})),totalRows:0};
    const index=key=>Number.isInteger(mapping[key])&&mapping[key]>=0&&mapping[key]<parsed.headers.length?mapping[key]:null;
    const required=['date','description'];
    const missing=required.filter(key=>index(key)===null);
    if(index('amount')===null&&(index('debit')===null||index('credit')===null))missing.push('amount ou debit/credit');
    if(missing.length)return {rows:[],items:[],errors:[{rowNumber:null,messages:[`Mapeie as colunas: ${missing.join(', ')}.`]}],totalRows:parsed.rows.length};
    const result=parsed.rows.map(row=>{
      const get=key=>index(key)===null?'':clean(row.cells[index(key)]);
      const errors=[];let amount;
      if(index('amount')!==null)amount=get('amount');
      else{
        const debit=get('debit'),credit=get('credit');
        const debitCents=debit?window.FinTrackBankImport.normalizeAmount({amount:debit}):null;
        const creditCents=credit?window.FinTrackBankImport.normalizeAmount({amount:credit}):null;
        if(debit&&credit)errors.push('Débito e crédito preenchidos na mesma linha.');
        else if(debit&&debitCents===null||credit&&creditCents===null)errors.push('Valor de débito ou crédito inválido.');
        else if(!debit&&!credit)errors.push('Débito e crédito vazios.');
        else amount=debit?-Math.abs(debitCents):Math.abs(creditCents);
      }
      const normalized=window.FinTrackBankImport.normalizeTransaction({rowNumber:row.rowNumber,date:get('date'),description:get('description'),originalDescription:get('description'),...(typeof amount==='number'?{amountCents:amount}:{amount}),sourceId:get('sourceId'),documentNumber:get('documentNumber')},{format:'csv',accountId,currency:'BRL'});
      return {rowNumber:row.rowNumber,transaction:errors.length?null:normalized.transaction,errors:[...errors,...normalized.errors]};
    });
    return {rows:result,items:result.filter(row=>row.transaction).map(row=>row.transaction),errors:result.filter(row=>row.errors.length).map(row=>({rowNumber:row.rowNumber,messages:row.errors})),totalRows:result.length};
  }
  window.FinTrackBankCsv={parse,suggestMapping,preview};
})();
