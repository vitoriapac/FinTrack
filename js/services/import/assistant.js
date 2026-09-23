(function(){
  'use strict';
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const typeOf=transaction=>transaction.amountCents<0?'Despesa':'Receita';
  function suggestCategory(state,transaction){
    const description=normalize(transaction.description),type=typeOf(transaction);
    const eligible=(state.importRules||[]).filter(rule=>rule.type===type&&description.includes(normalize(rule.pattern))&&normalize(rule.pattern).length>=3&&state.categorias?.some(category=>category.id===rule.categoryId&&category.tipo===(type==='Despesa'?'Saída':'Entrada')&&category.natureza!=='movimentacao'));
    eligible.sort((a,b)=>normalize(b.pattern).length-normalize(a.pattern).length||String(a.id).localeCompare(String(b.id)));
    const rule=eligible[0];
    return rule?{categoryId:rule.categoryId,reason:`Regra local: descrição contém “${rule.pattern}”.`,ruleId:rule.id}:null;
  }
  function addRule(state,input,idFactory){
    const pattern=String(input.pattern??'').trim(),type=input.type,category=state.categorias?.find(item=>item.id===input.categoryId);
    if(normalize(pattern).length<3||pattern.length>80)throw new Error('Use um texto de 3 a 80 caracteres para a regra.');
    if(!['Despesa','Receita'].includes(type)||!category||category.tipo!==(type==='Despesa'?'Saída':'Entrada')||category.natureza==='movimentacao')throw new Error('Categoria incompatível com o tipo da regra.');
    const existing=(state.importRules||[]).find(rule=>rule.type===type&&normalize(rule.pattern)===normalize(pattern));
    if(existing&&existing.categoryId!==category.id)throw new Error('Já existe uma regra para esse texto com outra categoria.');
    if(existing)return state;
    return {...state,importRules:[...(state.importRules||[]),{id:idFactory('import-rule'),pattern,type,categoryId:category.id,createdAt:new Date().toISOString()}]};
  }
  function removeRule(state,id){return {...state,importRules:(state.importRules||[]).filter(rule=>rule.id!==id)};}
  function transferHints(state,transaction){
    const opposite=-transaction.amountCents;
    const counterparts=(state.lancamentos||[]).filter(entry=>entry.contaId!==transaction.source.accountId&&entry.data===transaction.date&&entry.status==='Pago'&&(entry.tipo==='Despesa'?-entry.valor:entry.valor)===opposite&&['despesa','receita'].includes(entry.tipoOperacao));
    const descriptionHint=/\b(transf(?:erencia)?|ted|doc|pix)\b/i.test(normalize(transaction.description));
    return {counterparts:counterparts.map(entry=>({entryId:entry.id,accountId:entry.contaId,description:entry.descricao})),descriptionHint,reason:counterparts.length?'Movimento oposto de mesmo valor e data em outra conta.':descriptionHint?'Descrição sugere transferência; confirme se as duas contas são suas.':null};
  }
  window.FinTrackImportAssistant={normalize,suggestCategory,addRule,removeRule,transferHints};
})();
