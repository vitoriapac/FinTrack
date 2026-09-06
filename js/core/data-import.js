(function(){
  'use strict';
  const normalizeText=value=>String(value||'').trim().toLocaleLowerCase('pt-BR');
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  const parseLine=line=>{const cells=[];let cell='',quoted=false;for(let index=0;index<line.length;index++){const char=line[index];if(char==='"'&&line[index+1]==='"'){cell+='"';index++;continue;}if(char==='"'){quoted=!quoted;continue;}if(char===';'&&!quoted){cells.push(cell);cell='';}else cell+=char;}cells.push(cell);return cells;};
  const parseMoney=value=>{const raw=String(value||'').trim().replace(/\s/g,'');const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;const amount=Number(normalized);return Number.isFinite(amount)?Math.round(amount*100):0;};
  const fingerprint=item=>[item.data,item.dataVencimento||'',normalizeText(item.descricao),item.tipo,item.contaId,item.categoriaId,item.valor].join('|');

  function previewCsv(text,data,idFactory){
    const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
    if(lines.length<2) return {items:[],errors:['CSV vazio ou sem linhas de dados.'],duplicates:[],totalRows:0};
    const rows=lines.slice(1).map(parseLine),errors=[],duplicates=[],items=[],seen=new Set((data.lancamentos||[]).map(fingerprint));
    const findByName=(collection,name)=>collection.find(item=>normalizeText(item.nome)===normalizeText(name));
    rows.forEach((row,index)=>{
      const number=index+2;
      if(row.length<7){errors.push(`Linha ${number}: quantidade de colunas inválida.`);return;}
      const [date,dueDate,description,typeName,accountName,categoryName,value,status='Pendente',fixed='Não']=row;
      const type=normalizeText(typeName)==='receita'?'Receita':normalizeText(typeName)==='despesa'?'Despesa':null;
      const account=findByName(data.contas||[],accountName),category=findByName(data.categorias||[],categoryName),amount=parseMoney(value);
      const rowErrors=[];
      if(!datePattern.test(date)) rowErrors.push('data inválida');
      if(dueDate&&!datePattern.test(dueDate)) rowErrors.push('vencimento inválido');
      if(!String(description||'').trim()) rowErrors.push('descrição ausente');
      if(!type) rowErrors.push('tipo inválido');
      if(!account) rowErrors.push(`conta não encontrada: ${accountName}`);
      if(!category) rowErrors.push(`categoria não encontrada: ${categoryName}`);
      if(amount<=0) rowErrors.push('valor inválido');
      if(rowErrors.length){errors.push(`Linha ${number}: ${rowErrors.join(', ')}.`);return;}
      const item={id:idFactory('csv'),data,dateVencimento:dueDate||undefined,descricao:String(description).trim(),tipo:type,contaId:account.id,categoriaId:category.id,valor:amount,status:normalizeText(status)==='pago'?'Pago':'Pendente',fixa:normalizeText(fixed)==='sim',tipoOperacao:type==='Receita'?'receita':'despesa'};
      const key=fingerprint(item);
      if(seen.has(key)){duplicates.push(`Linha ${number}: ${item.descricao}.`);return;}
      seen.add(key);items.push(item);
    });
    return {items,errors,duplicates,totalRows:rows.length};
  }

  function validateBackup(raw,normalize,validate){
    const errors=[],warnings=[];
    if(!raw||typeof raw!=='object'||Array.isArray(raw)) return {valid:false,errors:['Arquivo não contém um objeto válido.'],warnings,normalized:null};
    for(const key of ['categorias','contas','lancamentos']) if(!Array.isArray(raw[key])) errors.push(`Campo obrigatório ausente: ${key}.`);
    if(errors.length) return {valid:false,errors,warnings,normalized:null};
    if(Number(raw.schemaVersion||0)<Number(window.FinTrackSchema?.version||5)) warnings.push(`Backup será migrado do schema ${raw.schemaVersion||1} para ${window.FinTrackSchema?.version||5}.`);
    let normalized;
    try{normalized=normalize(raw);}catch(error){return {valid:false,errors:[`Falha ao normalizar backup: ${error.message}`],warnings,normalized:null};}
    const report=validate(normalized);
    errors.push(...report.errors);warnings.push(...report.warnings);
    return {valid:errors.length===0,errors,warnings,normalized};
  }

  window.FinTrackImport={parseLine,parseMoney,fingerprint,previewCsv,validateBackup};
})();
