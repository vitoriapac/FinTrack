const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/services/import/core.js','js/services/import/csv.js','js/services/import/assistant.js','js/services/import/batches.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const {FinTrackBankCsv,FinTrackImportBatches,FinTrackImportAssistant}=context.window;
const lines=['Data;Descrição;Valor;ID transação'];
const entries=[];
for(let index=0;index<10000;index++){
  const day=String(index%28+1).padStart(2,'0');
  lines.push(`2026-09-${day};Compra ${index};-${index+100},00;fit-${index}`);
  entries.push({id:`entry-${index}`,data:`2026-09-${day}`,descricao:`Compra ${index}`,tipo:'Despesa',contaId:'account',valor:(index+100)*100,importSource:{sourceId:`fit-${index}`}});
}
const started=performance.now();
const parsed=FinTrackBankCsv.parse(lines.join('\n'));
const preview=FinTrackBankCsv.preview(parsed,{date:0,description:1,amount:2,sourceId:3},'account');
const index=FinTrackImportBatches.candidateIndex({lancamentos:entries});
const assistantIndex=FinTrackImportAssistant.prepare({lancamentos:entries});
assert.equal(preview.items.length,10000);
assert.equal(FinTrackImportBatches.candidates({},preview.items[5000],index).length,1);
for(const item of preview.items){FinTrackImportBatches.candidates({},item,index);FinTrackImportAssistant.transferHints({lancamentos:entries},item,assistantIndex);}
console.log(`bank import 10k parse/preview/reconciliation: ${Math.round(performance.now()-started)} ms`);
