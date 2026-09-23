(function(){
  'use strict';
  const clean=value=>String(value??'').trim();
  const decode=value=>clean(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>{
    const lower=entity.toLowerCase();
    if(lower[0]==='#'){const number=lower[1]==='x'?parseInt(lower.slice(2),16):parseInt(lower.slice(1),10);return number>0&&number<=0x10ffff?String.fromCodePoint(number):'';}
    return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[lower];
  });
  const field=(body,name)=>{const match=new RegExp(`<${name}\\s*>([^<\\r\\n]*)`,'i').exec(body);return match?decode(match[1]):'';};
  const blocks=(body,name)=>[...body.matchAll(new RegExp(`<${name}\\s*>([\\s\\S]*?)<\\/${name}\\s*>`,'gi'))].map(match=>match[1]);

  function parse(text){
    const source=String(text??'').replace(/^\uFEFF/,'');
    if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source))return {statements:[],errors:['Declarações externas não são aceitas em arquivos OFX.']};
    if(!/<OFX\b[^>]*>/i.test(source))return {statements:[],errors:['Arquivo OFX sem elemento principal OFX.']};
    const sections=blocks(source,'STMTRS');
    if(!sections.length)return {statements:[],errors:['Este OFX não contém extrato bancário STMTRS suportado.']};
    const statements=sections.map((body,index)=>{
      const bank=blocks(body,'BANKACCTFROM')[0]||'';
      const currency=field(body,'CURDEF').toUpperCase();
      const account=field(bank,'ACCTID'),bankId=field(bank,'BANKID');
      const list=blocks(body,'BANKTRANLIST')[0]||'';
      const transactionBlocks=blocks(list,'STMTTRN');
      const records=transactionBlocks.map((transaction,rowIndex)=>{
        const name=field(transaction,'NAME'),memo=field(transaction,'MEMO'),description=name||memo;
        const posted=field(transaction,'DTPOSTED');
        return {rowNumber:rowIndex+1,date:/^\d{8}/.test(posted)?`${posted.slice(0,4)}-${posted.slice(4,6)}-${posted.slice(6,8)}`:posted,description,originalDescription:[name,memo].filter(Boolean).join(' — ')||description,amount:field(transaction,'TRNAMT'),sourceId:field(transaction,'FITID'),documentNumber:field(transaction,'CHECKNUM')||field(transaction,'REFNUM'),currency};
      });
      return {index,currency,accountSuffix:account.slice(-4),bankId,records};
    });
    return {statements,errors:statements.some(statement=>statement.records.length)?[]:['Nenhuma transação bancária STMTTRN encontrada.']};
  }

  function preview(statement,accountId){
    if(!statement||!statement.records?.length)return {rows:[],items:[],errors:[{rowNumber:null,messages:['Extrato sem transações.']}],totalRows:0};
    if(!statement.currency)return {rows:[],items:[],errors:[{rowNumber:null,messages:['O OFX não informa a moeda (CURDEF).']}],totalRows:statement.records.length};
    return window.FinTrackBankImport.previewTransactions(statement.records,{format:'ofx',accountId,currency:statement.currency});
  }
  window.FinTrackBankOfx={parse,preview};
})();
