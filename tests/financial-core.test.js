const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/financial-core.js', 'utf8'), context);
const core = context.window.FinTrackCore;

function data(lancamentos){
  return core.normalizeData({
    contas: [
      { id: 'a', nome: 'A', saldoInicial: 100, dataSaldoInicial: '2026-01-01' },
      { id: 'b', nome: 'B', saldoInicial: 0, dataSaldoInicial: '2026-01-01' },
    ],
    categorias: [
      { id: 'r', nome: 'Receita', tipo: 'Entrada', orcado: 0 },
      { id: 'd', nome: 'Despesa', tipo: 'Saída', orcado: 0 },
    ],
    lancamentos,
    series: [],
  });
}

const basic = data([
  { id: 'r1', tipo: 'Receita', data: '2026-09-01', categoriaId: 'r', contaId: 'a', valor: 500, status: 'Pago' },
  { id: 'd1', tipo: 'Despesa', data: '2026-09-02', categoriaId: 'd', contaId: 'a', valor: 200, status: 'Pago' },
]);
const basicTotals = core.totals(basic, 9, 2026, '2026-09-05');
assert.equal(basicTotals.receitas, 50000);
assert.equal(basicTotals.despesas, 20000);
assert.equal(basicTotals.saldo, 30000);
assert.equal(core.accountBalance(basic, basic.contas[0], '2026-09-05'), 40000);

const transfer = data([
  { id: 't1', tipoOperacao: 'transferencia', natureza: 'transferencia', movimentoTransferencia: 'saida', tipo: 'Despesa', data: '2026-09-01', contaId: 'a', contaDestinoId: 'b', valor: 50, status: 'Pago', operacaoId: 'op1' },
  { id: 't2', tipoOperacao: 'transferencia', natureza: 'transferencia', movimentoTransferencia: 'entrada', tipo: 'Receita', data: '2026-09-01', contaId: 'b', contaOrigemId: 'a', valor: 50, status: 'Pago', operacaoId: 'op1' },
]);
assert.equal(core.accountBalance(transfer, transfer.contas[0], '2026-09-05'), 5000);
assert.equal(core.accountBalance(transfer, transfer.contas[1], '2026-09-05'), 5000);
assert.equal(core.totalByNature(transfer, 9, 2026, 'transferencia', '2026-09-05'), 5000);

const paused = data([{ id: 's1', tipo: 'Despesa', data: '2026-09-10', categoriaId: 'd', contaId: 'a', valor: 25, status: 'Pendente', serieId: 'serie1', serieStatus: 'pausada' }]);
paused.series = [{ id: 'serie1', tipo: 'recorrencia', status: 'pausada' }];
assert.equal(core.monthEntries(paused, 9, 2026, '2026-09-05').length, 0);

const investments = data([
  { id: 'i1', tipoOperacao: 'investimento', natureza: 'investimento', movimentoInvestimento: 'aporte', tipo: 'Despesa', data: '2026-09-03', contaId: 'a', valor: 300, status: 'Pago' },
  { id: 'i2', tipoOperacao: 'investimento', natureza: 'investimento', movimentoInvestimento: 'resgate', tipo: 'Despesa', data: '2026-09-04', contaId: 'a', valor: 50, status: 'Pago' },
]);
assert.equal(core.totalByNature(investments, 9, 2026, 'investimento', '2026-09-05'), 25000);
assert.equal(core.accountBalance(investments, investments.contas[0], '2026-09-05'), -15000);

const legacy = core.normalizeData({
  contas: [{ id: 'legacy', nome: 'Legacy', saldoInicial: 12.34, dataSaldoInicial: '2026-01-01' }],
  categorias: [{ id: 'legacy-cat', nome: 'Legacy', tipo: 'Saída', orcado: 10 }],
  lancamentos: [{ id: 'legacy-lanc', tipo: 'Despesa', data: '2026-02-28', categoriaId: 'legacy-cat', contaId: 'legacy', valor: 1.99, status: 'Pago' }],
});
assert.equal(legacy.contas[0].saldoInicial, 1234);
assert.equal(legacy.categorias[0].orcado, 1000);
assert.equal(legacy.lancamentos[0].valor, 199);

const cardData = core.normalizeData({
  contas: [{ id: 'a', saldoInicial: 0, dataSaldoInicial: '2026-01-01' }],
  categorias: [{ id: 'd', nome: 'Despesa', tipo: 'Saída', orcado: 0 }],
  cartoes: [{ id: 'card', nome: 'Card', limite: 100000, fechamento: 10, vencimento: 20 }],
  lancamentos: [
    { id: 'c1', tipo: 'Despesa', data: '2026-09-08', categoriaId: 'd', contaId: 'a', cartaoId: 'card', valor: 125.5, status: 'Pendente' },
    { id: 'c2', tipo: 'Despesa', data: '2026-09-12', categoriaId: 'd', contaId: 'a', cartaoId: 'card', valor: 80, status: 'Pendente' },
  ],
});
const invoice = core.cardInvoice(cardData, cardData.cartoes[0], new Date('2026-09-15T12:00:00'));
assert.equal(invoice.key, '2026-10');
assert.equal(invoice.total, 8000);
assert.equal(invoice.available, 92000);
assert.equal(invoice.dueDate, '2026-10-20');

const debtProjection = core.debtProjection({ saldo: 100000, juros: 1, parcelasRestantes: 10 });
assert.equal(debtProjection.periods, 10);
assert.ok(debtProjection.installment > 10000);
assert.ok(debtProjection.totalInterest > 0);
assert.equal(core.debtProjection({ saldo: 100000, juros: 0, parcelasRestantes: 10 }).installment, 10000);

console.log('financial-core tests: OK');
