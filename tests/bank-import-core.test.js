const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/services/import/core.js','utf8'),context,{filename:'js/services/import/core.js'});
const imports=context.window.FinTrackBankImport;

assert.equal(imports.normalizeDate('21/09/2026'),'2026-09-21');
assert.equal(imports.normalizeDate('2026-02-29'),null);
assert.equal(imports.normalizeAmount({amount:'-1.234,56'}),-123456);
assert.equal(imports.normalizeAmount({amount:'1,234.56'}),123456);
assert.equal(imports.normalizeAmount({amount:'1,234'}),null);
assert.equal(imports.normalizeAmount({amountCents:0}),null);

const input=[
  {rowNumber:2,sourceId:'bank-1',date:'21/09/2026',description:' Mercado ',originalDescription:'COMPRA CARTAO MERCADO 097',amount:'-128,42',documentNumber:' 097 '},
  {rowNumber:3,date:'2026-09-22',description:'Salário',amountCents:500000},
  {rowNumber:4,date:'31/02/2026',description:'Erro',amount:'0,00'},
];
const before=JSON.stringify(input);
const preview=imports.previewTransactions(input,{format:'csv',accountId:'conta-1',currency:'BRL'});
assert.equal(JSON.stringify(input),before);
assert.equal(preview.totalRows,3);
assert.equal(preview.items.length,2);
assert.equal(preview.errors.length,1);
assert.equal(preview.errors[0].rowNumber,4);
assert.equal(preview.errors[0].messages.length,2);
assert.equal(preview.items[0].amountCents,-12842);
assert.equal(preview.items[0].sourceId,'bank-1');
assert.equal(preview.items[0].source.rowNumber,2);
assert.equal(preview.items[0].originalDescription,'COMPRA CARTAO MERCADO 097');
assert.equal(preview.items[0].documentNumber,'097');
assert.equal(preview.items[0].type,'debit');
assert.equal(preview.items[0].reconciliationStatus,'pending');
assert.equal(preview.items[1].type,'credit');
assert.equal(preview.items[1].suggestedNature,'receita');
assert.equal('valor' in preview.items[0],false);
assert.equal('categoriaId' in preview.items[0],false);

const foreign=imports.previewTransactions([{date:'2026-09-21',description:'Compra',amountCents:-100,currency:'USD'}],{format:'ofx',accountId:'conta-1'});
assert.equal(foreign.items.length,0);
assert.ok(foreign.errors[0].messages.some(message=>message.includes('BRL')));
const unselected=imports.previewTransactions([{date:'2026-09-21',description:'Compra',amountCents:-100}],{format:'qif'});
assert.ok(unselected.errors[0].messages.some(message=>message.includes('conta')));
assert.equal(imports.previewTransactions(null,{format:'csv'}).errors.length,1);
console.log('bank import core tests: OK');

for(const file of ['js/core/schema.js','js/core/migrations.js','js/core/normalize.js','js/core/validate.js','js/services/import/csv.js','js/services/import/batches.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const {FinTrackNormalize,FinTrackValidation,FinTrackBankCsv,FinTrackImportBatches}=context.window;
const state=FinTrackNormalize.normalizeData({schemaVersion:9,__centsVersion:1,contas:[{id:'a',nome:'Conta A',saldoInicial:0}],categorias:[{id:'expense',nome:'Outros',tipo:'Saída',orcado:0},{id:'income',nome:'Receita',tipo:'Entrada',orcado:0}],lancamentos:[{id:'old',data:'2026-09-21',descricao:'Mercado',tipo:'Despesa',contaId:'a',categoriaId:'expense',valor:12842,status:'Pago',tipoOperacao:'despesa'}]});
assert.equal(state.schemaVersion,10);
assert.equal(state.importBatches.length,0);
const parsed=FinTrackBankCsv.parse('Data;Histórico;Débito;Crédito;ID transação\n21/09/2026;"Compra; mercado";128,42;;bank-1\n22/09/2026;Salário;;500,00;bank-2');
assert.equal(parsed.rows.length,2);
const multiline=FinTrackBankCsv.parse('Data,Descrição,Valor\n2026-09-21,"Mercado\nCentral","-12,84"');
assert.equal(multiline.rows[0].cells[1],'Mercado\nCentral');
assert.equal(multiline.rows[0].rowNumber,2);
assert.equal(FinTrackBankCsv.parse('Data;Descrição;Valor\n2026-09-21;"Sem fim;-12,84').errors.length,1);
const mapping=FinTrackBankCsv.suggestMapping(parsed.headers);
assert.equal(mapping.debit,2);
const bankPreview=FinTrackBankCsv.preview(parsed,mapping,'a');
assert.equal(bankPreview.errors.length,0);
assert.equal(bankPreview.items[0].amountCents,-12842);
assert.equal(bankPreview.items[0].description,'Compra; mercado');
assert.equal(bankPreview.items[1].amountCents,50000);
assert.equal(FinTrackImportBatches.candidates(state,bankPreview.items[0]).length,1);
let sequence=0;
const ids=prefix=>`${prefix}-${++sequence}`;
const decisions=[{transaction:bankPreview.items[0],action:'link',matchId:'old'},{transaction:bankPreview.items[1],action:'import',categoryId:'income'}];
const result=FinTrackImportBatches.commit(state,decisions,{fileName:'extrato.csv',accountId:'a'},ids);
assert.equal(state.lancamentos.length,1);
assert.equal(result.state.lancamentos.length,2);
assert.equal(result.batch.created.length,1);
assert.equal(result.batch.linked[0].entryId,'old');
assert.equal(FinTrackValidation.validateData(result.state).valid,true);
const undone=FinTrackImportBatches.undo(result.state,result.batch.id);
assert.equal(undone.state.lancamentos.length,1);
assert.equal(undone.state.lancamentos[0].id,'old');
assert.equal(undone.batch.status,'undone');
assert.throws(()=>FinTrackImportBatches.undo(undone.state,result.batch.id),/desfeito/);
const changed=JSON.parse(JSON.stringify(result.state));changed.lancamentos[1].descricao='Corrigido';
assert.throws(()=>FinTrackImportBatches.undo(changed,result.batch.id),/alterados/);
const closed=JSON.parse(JSON.stringify(result.state));closed.fechamentos={'2026-09':{status:'fechado'}};
assert.throws(()=>FinTrackImportBatches.undo(closed,result.batch.id),/mês fechado/);
const reimport=FinTrackImportBatches.commit(result.state,[{transaction:bankPreview.items[1],action:'link',matchId:result.batch.created[0].entryId}],{fileName:'extrato-2.csv',accountId:'a'},ids);
assert.throws(()=>FinTrackImportBatches.undo(reimport.state,result.batch.id),/Outro lote ativo/);
assert.equal(FinTrackImportBatches.undo(FinTrackImportBatches.undo(reimport.state,reimport.batch.id).state,result.batch.id).state.lancamentos.length,1);
const conflicting={...bankPreview.items[1],date:'2026-09-23'};
const conflicts=FinTrackImportBatches.candidates(result.state,conflicting);
assert.equal(conflicts.length,1);
assert.equal(conflicts[0].compatible,false);
assert.throws(()=>FinTrackImportBatches.commit(result.state,[{transaction:conflicting,action:'link',matchId:result.batch.created[0].entryId}],{fileName:'extrato-3.csv',accountId:'a'},ids),/compatível/);
assert.throws(()=>FinTrackImportBatches.commit(state,[{transaction:bankPreview.items[0],action:'import',categoryId:'income'}],{fileName:'extrato.csv',accountId:'a'},ids),/categoria/);
console.log('bank import workflow tests: OK');
