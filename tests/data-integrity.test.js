const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/core/schema.js','js/core/migrations.js','js/core/normalize.js','js/core/validate.js','js/financial-core.js','js/core/data-import.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const normalize=context.window.FinTrackNormalize.normalizeData,validation=context.window.FinTrackValidation,imports=context.window.FinTrackImport;
const base=normalize({schemaVersion:5,__centsVersion:1,contas:[{id:'a',nome:'Conta A',saldoInicial:0,dataSaldoInicial:'2026-01-01'},{id:'b',nome:'Conta B',saldoInicial:0,dataSaldoInicial:'2026-01-01'}],categorias:[{id:'expense',nome:'Mercado',tipo:'Saída',orcado:0},{id:'income',nome:'Salário',tipo:'Entrada',orcado:0}],lancamentos:[]});

const broken=normalize({...base,lancamentos:[{id:'out',tipo:'Despesa',tipoOperacao:'transferencia',natureza:'transferencia',movimentoTransferencia:'saida',operacaoId:'op-1',valor:5000,status:'Pago',data:'2026-09-01',descricao:'Transferência',contaId:'a',contaDestinoId:'b'}]});
assert.ok(validation.validateData(broken).warnings.some(item=>item.includes('transferência incompleta')));
const repaired=validation.repairData(broken);
const pair=repaired.lancamentos.filter(item=>item.operacaoId==='op-1');
assert.equal(pair.length,2);
assert.equal(pair.find(item=>item.movimentoTransferencia==='entrada').contaId,'b');
assert.ok(!validation.validateData(repaired).warnings.some(item=>item.includes('transferência')));

const quarantined=validation.repairData(normalize({...base,lancamentos:[{id:'orphan',tipo:'Despesa',valor:1000,status:'Pago',data:'2026-09-02',descricao:'Órfão',contaId:'missing',categoriaId:'expense'}]}));
assert.equal(quarantined.lancamentos.length,0);
assert.equal(quarantined.quarentena.length,1);
assert.equal(quarantined.quarentena[0].origemId,'orphan');

const csv=['Data;Data Vencimento;Descricao;Tipo;Conta;Categoria;Valor;Status;Fixa','2026-09-05;;Compra;Despesa;Conta A;Mercado;10,50;Pago;Não','2026-09-05;;Compra;Despesa;Conta A;Mercado;10,50;Pago;Não','data-invalida;;Erro;Despesa;Conta A;Mercado;20,00;Pago;Não'].join('\n');
let id=0;
const preview=imports.previewCsv(csv,base,()=>`csv-${++id}`);
assert.equal(preview.items.length,1);
assert.equal(preview.duplicates.length,1);
assert.equal(preview.errors.length,1);
assert.equal(preview.items[0].valor,1050);

const backup=imports.validateBackup({schemaVersion:4,__centsVersion:1,contas:base.contas,categorias:base.categorias,lancamentos:[]},normalize,validation.validateData);
assert.equal(backup.valid,true);
assert.ok(backup.warnings.some(item=>item.includes('migrado')));
console.log('data integrity tests: OK');
