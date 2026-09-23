const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/services/import/core.js','js/services/import/csv.js','js/services/import/assistant.js','js/services/import/batches.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const {FinTrackBankCsv,FinTrackImportBatches,FinTrackImportAssistant}=context.window;
for(const size of [100,1000,5000,10000]){
  const lines=['Data;Descrição;Valor;ID transação'],entries=[];
  for(let index=0;index<size;index++){
    const day=String(index%28+1).padStart(2,'0');
    lines.push(`2026-09-${day};Compra ${index};-${index+100},00;fit-${index}`);
    entries.push({id:`entry-${index}`,data:`2026-09-${day}`,descricao:`Compra ${index}`,tipo:'Despesa',contaId:'account',valor:(index+100)*100,importSource:{sourceId:`fit-${index}`}});
  }
  const started=performance.now(),parsed=FinTrackBankCsv.parse(lines.join('\n'));
  const preview=FinTrackBankCsv.preview(parsed,{date:0,description:1,amount:2,sourceId:3},'account');
  const index=FinTrackImportBatches.candidateIndex({lancamentos:entries}),assistantIndex=FinTrackImportAssistant.prepare({lancamentos:entries});
  assert.equal(preview.items.length,size);
  for(const item of preview.items){FinTrackImportBatches.candidates({},item,index);FinTrackImportAssistant.transferHints({lancamentos:entries},item,assistantIndex);}
  const state={contas:[{id:'account'}],categorias:[{id:'expense',tipo:'Saída'}],lancamentos:entries,importBatches:[],importRules:[],operacoes:[],fechamentos:{}};
  let sequence=0;const result=FinTrackImportBatches.commit(state,preview.items.map(transaction=>({transaction,action:'import',categoryId:'expense'})),{format:'csv',fileName:'scale.csv',accountId:'account'},prefix=>`${prefix}-${++sequence}`);
  assert.equal(result.batch.created.length,size);
  assert.equal(FinTrackImportBatches.undo(result.state,result.batch.id).state.lancamentos.length,size);
  console.log(`bank import ${size} parse/preview/reconcile/commit/undo: ${Math.round(performance.now()-started)} ms`);
}
