(function(){
  'use strict';
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const typeOf=transaction=>transaction.amountCents<0?'Despesa':'Receita';
  const generic=new Set(['pix','compra','pagamento','transferencia','ted','doc','debito','credito','cartao','boleto','saque','deposito']);
  const isGeneric=pattern=>{const tokens=normalize(pattern).match(/[a-z0-9]+/g)||[];return Boolean(tokens.length)&&tokens.every(token=>generic.has(token)||/^(?:\d+|no|na|do|da|de|em|para|pgto|pag|transf)$/.test(token));};
  const dayDistance=(first,second)=>Math.abs(Date.parse(`${first}T12:00:00Z`)-Date.parse(`${second}T12:00:00Z`))/86400000;
  const dayOffset=(date,offset)=>{const value=new Date(`${date}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);};
  function prepare(state){
    const byTransfer=new Map(),byHistory=new Map();
    (state.lancamentos||[]).forEach(entry=>{
      const signed=entry.tipo==='Despesa'?-entry.valor:entry.valor;
      const transferKey=`${entry.data}|${signed}`;
      if(!byTransfer.has(transferKey))byTransfer.set(transferKey,[]);byTransfer.get(transferKey).push(entry);
      const historyKey=`${entry.contaId}|${entry.tipo}|${normalize(entry.descricao)}`;
      if(!byHistory.has(historyKey))byHistory.set(historyKey,[]);byHistory.get(historyKey).push(entry);
    });
    return {byTransfer,byHistory};
  }
  function suggestCategory(state,transaction,index){
    const description=normalize(transaction.description),type=typeOf(transaction);
    const validCategory=id=>state.categorias?.some(category=>category.id===id&&category.tipo===(type==='Despesa'?'Saída':'Entrada')&&category.natureza!=='movimentacao');
    const eligible=(state.importRules||[]).filter(rule=>rule.type===type&&!isGeneric(rule.pattern)&&description.includes(normalize(rule.pattern))&&normalize(rule.pattern).length>=3&&validCategory(rule.categoryId));
    eligible.sort((a,b)=>normalize(b.pattern).length-normalize(a.pattern).length||String(a.id).localeCompare(String(b.id)));
    const rule=eligible[0];
    if(rule)return {categoryId:rule.categoryId,reason:`Regra local explícita: descrição contém “${rule.pattern}”.`,ruleId:rule.id,source:'rule'};
    const historyPool=index?index.byHistory.get(`${transaction.source.accountId}|${type}|${description}`)||[]:state.lancamentos||[];
    const history=historyPool.filter(entry=>entry.contaId===transaction.source.accountId&&entry.tipo===type&&entry.tipoOperacao!=='transferencia'&&entry.status==='Pago'&&entry.data<transaction.date&&normalize(entry.descricao)===description&&validCategory(entry.categoriaId));
    const counts=new Map();history.forEach(entry=>{const item=counts.get(entry.categoriaId)||{count:0,dates:new Set()};item.count++;item.dates.add(entry.data);counts.set(entry.categoriaId,item);});
    if(counts.size===1){const [categoryId,evidence]=[...counts.entries()][0];if(evidence.count>=3&&evidence.dates.size>=2)return {categoryId,reason:`Histórico recorrente: ${evidence.count} lançamentos anteriores desta conta com a mesma descrição e categoria.`,source:'history',evidenceCount:evidence.count};}
    return null;
  }
  function addRule(state,input,idFactory){
    const pattern=String(input.pattern??'').trim(),type=input.type,category=state.categorias?.find(item=>item.id===input.categoryId);
    if(normalize(pattern).length<3||pattern.length>80)throw new Error('Use um texto de 3 a 80 caracteres para a regra.');
    if(isGeneric(pattern))throw new Error('Texto genérico demais para uma regra. Use uma descrição mais específica.');
    if(!['Despesa','Receita'].includes(type)||!category||category.tipo!==(type==='Despesa'?'Saída':'Entrada')||category.natureza==='movimentacao')throw new Error('Categoria incompatível com o tipo da regra.');
    const existing=(state.importRules||[]).find(rule=>rule.type===type&&normalize(rule.pattern)===normalize(pattern));
    if(existing&&existing.categoryId!==category.id)throw new Error('Já existe uma regra para esse texto com outra categoria.');
    if(existing)return state;
    return {...state,importRules:[...(state.importRules||[]),{id:idFactory('import-rule'),pattern,type,categoryId:category.id,createdAt:new Date().toISOString()}]};
  }
  function removeRule(state,id){return {...state,importRules:(state.importRules||[]).filter(rule=>rule.id!==id)};}
  function transferHints(state,transaction,index){
    const opposite=-transaction.amountCents;
    const pool=index?[-1,0,1].flatMap(offset=>index.byTransfer.get(`${dayOffset(transaction.date,offset)}|${opposite}`)||[]):state.lancamentos||[];
    const counterparts=pool.filter(entry=>entry.contaId!==transaction.source.accountId&&dayDistance(entry.data,transaction.date)<=1&&entry.status==='Pago'&&(entry.tipo==='Despesa'?-entry.valor:entry.valor)===opposite&&['despesa','receita'].includes(entry.tipoOperacao));
    const descriptionHint=/\b(transf(?:erencia)?|ted|doc|pix)\b/i.test(normalize(transaction.description));
    return {counterparts:counterparts.map(entry=>({entryId:entry.id,accountId:entry.contaId,date:entry.data,description:entry.descricao})),descriptionHint,reason:counterparts.length?'Movimento oposto de mesmo valor em outra conta, na mesma data ou com até um dia de diferença. Confirme a outra ponta.':descriptionHint?'Descrição sugere transferência; confirme se as duas contas são suas.':null};
  }
  window.FinTrackImportAssistant={normalize,suggestCategory,addRule,removeRule,transferHints,isGeneric,dayDistance,prepare};
})();
