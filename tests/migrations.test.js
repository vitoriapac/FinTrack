const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/core/schema.js','js/core/migrations.js','js/core/normalize.js','js/core/validate.js','js/financial-core.js','js/core/closing.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const legacy=JSON.parse(fs.readFileSync('tests/fixtures/legacy-v1.json','utf8'));
const current=context.window.FinTrackNormalize.normalizeData(legacy);
assert.equal(current.schemaVersion,6);
assert.equal(current.contas[0].saldoInicial,10050);
assert.equal(current.lancamentos[0].valor,2590);
assert.equal(current.cartoes[0].limite,120000);
assert.equal(current.dividas[0].saldo,80000);
assert.equal(current.planejamentos['2026-02'].receita,300000);
assert.equal(current.planejamentos['2026-02'].orcamentos['cat-1'],45000);
assert.equal(context.window.FinTrackValidation.validateData(current).valid,true);

const regression=JSON.parse(fs.readFileSync('tests/fixtures/regression-v4.json','utf8'));
const normalized=context.window.FinTrackNormalize.normalizeData(regression);
assert.equal(normalized.lancamentos.length,3);
assert.equal(context.window.FinTrackValidation.validateData(normalized).warnings.length,0);
const repaired=context.window.FinTrackValidation.repairData({...normalized,lancamentos:[...normalized.lancamentos,{id:null}]});
assert.equal(repaired.lancamentos.length,3);

const fallback=context.window.FinTrackNormalize.normalizeData({
  categorias:[{id:'cat-default',nome:'Mercado',tipo:'Saída',orcado:450}],
  contas:[{id:'conta-default',nome:'Conta',saldoInicial:30,dataSaldoInicial:'2026-01-01'}],
  lancamentos:[],
});
for(const key of ['metas','cartoes','dividas','pagamentosCartao','pagamentosDividas','historico','lixeira','operacoes','series']) assert.ok(Array.isArray(fallback[key]),`${key} deve ser uma lista`);
for(const key of ['planejamentos','fechamentos']) {
  assert.equal(typeof fallback[key],'object',`${key} deve ser um objeto`);
  assert.equal(Object.keys(fallback[key]).length,0,`${key} deve começar vazio`);
}
assert.equal(fallback.categorias[0].orcado,45000);
assert.equal(fallback.contas[0].saldoInicial,3000);

const legacyNamed=context.window.FinTrackNormalize.normalizeData({schemaVersion:5,__centsVersion:1,categorias:[{id:'legacy-invest',nome:'Investimentos antigos',tipo:'Saída',orcado:0}],contas:[{id:'a',saldoInicial:0,dataSaldoInicial:'2026-01-01'}],lancamentos:[{id:'legacy-invest-entry',tipo:'Despesa',categoriaId:'legacy-invest',contaId:'a',data:'2026-01-01',valor:100,status:'Pago'}]});
assert.equal(legacyNamed.lancamentos[0].tipoOperacao,'investimento','migração deve materializar a heurística legada');
const currentNamed=context.window.FinTrackNormalize.normalizeData({schemaVersion:6,__centsVersion:1,categorias:[{id:'course',nome:'Curso de investimentos',tipo:'Saída',orcado:0}],contas:[{id:'a',saldoInicial:0,dataSaldoInicial:'2026-01-01'}],lancamentos:[{id:'course-entry',tipo:'Despesa',categoriaId:'course',contaId:'a',data:'2026-01-01',valor:100,status:'Pago'}]});
assert.equal(currentNamed.lancamentos[0].tipoOperacao,'despesa','dados atuais não devem inferir operação pelo nome');

const brokenTransfer={...normalized,lancamentos:[...normalized.lancamentos,{id:'transfer-out',tipo:'Despesa',tipoOperacao:'transferencia',natureza:'transferencia',movimentoTransferencia:'saida',operacaoId:'op-broken',valor:100,data:'2026-02-10',contaId:'a'}]};
assert.ok(context.window.FinTrackValidation.validateData(brokenTransfer).warnings.some(item=>item.includes('transferência incompleta')));
const closed=context.window.FinTrackClosing.createSnapshot(normalized,'2026-01',{observacao:'Fechamento de teste',fechadoEm:'2026-02-01T12:00:00.000Z'});
assert.equal(closed.status,'fechado');
assert.equal(closed.snapshot.receitas,500000);
assert.equal(closed.snapshot.versao,2);
assert.ok(Array.isArray(closed.snapshot.contas));
assert.ok(Array.isArray(closed.snapshot.lancamentosDetalhados));
assert.equal(closed.snapshot.planejamento.receita,0);
const reopened=context.window.FinTrackClosing.reopen(closed,{quando:'2026-02-02T12:00:00.000Z',motivo:'Ajuste auditável',usuario:'Teste'});
assert.equal(reopened.status,'aberto');
assert.equal(reopened.reaberturas[0].motivo,'Ajuste auditável');
console.log('migration tests: OK');
