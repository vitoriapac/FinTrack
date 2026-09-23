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
