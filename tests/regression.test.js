const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/core/schema.js','js/core/migrations.js','js/core/normalize.js','js/core/validate.js','js/financial-core.js','js/core/closing.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const core=context.window.FinTrackCore;

function base(extra={}){return context.window.FinTrackNormalize.normalizeData({
  schemaVersion:4,__centsVersion:1,
  contas:[{id:'a',saldoInicial:100000,dataSaldoInicial:'2026-01-01'},{id:'b',saldoInicial:0,dataSaldoInicial:'2026-01-01'}],
  categorias:[{id:'r',nome:'Receita',tipo:'Entrada',orcado:0},{id:'d',nome:'Despesa',tipo:'Saída',orcado:50000}],
  lancamentos:[],series:[],cartoes:[],dividas:[],planejamentos:{},fechamentos:{},...extra,
});}

const card={id:'card',nome:'Cartão',limite:100000,fechamento:10,vencimento:20};
const cardState=base({cartoes:[card],lancamentos:[
  {id:'before',tipo:'Despesa',data:'2026-09-10',contaId:'a',categoriaId:'d',cartaoId:'card',valor:1000,status:'Pendente'},
  {id:'after',tipo:'Despesa',data:'2026-09-11',contaId:'a',categoriaId:'d',cartaoId:'card',valor:2000,status:'Pendente'},
]});
assert.equal(core.cardInvoice(cardState,card,new Date('2026-09-15T12:00:00')).key,'2026-10');
assert.equal(core.cardInvoice(cardState,card,new Date('2026-09-15T12:00:00')).total,2000);
assert.equal(core.cardInvoice(cardState,card,new Date('2026-09-10T12:00:00')).key,'2026-09');
assert.equal(core.cardInvoice(cardState,card,new Date('2026-09-10T12:00:00')).total,1000);

const leapCard={...card,fechamento:28,vencimento:31};
const leapState=base({cartoes:[leapCard],lancamentos:[{id:'leap',tipo:'Despesa',data:'2028-02-29',contaId:'a',categoriaId:'d',cartaoId:'card',valor:1500,status:'Pendente'}]});
const leapInvoice=core.cardInvoice(leapState,leapCard,new Date('2028-02-29T12:00:00'));
assert.equal(leapInvoice.key,'2028-03');
assert.equal(leapInvoice.dueDate,'2028-03-31');

const yearCard={...card,fechamento:20,vencimento:10};
const yearState=base({cartoes:[yearCard],lancamentos:[{id:'year',tipo:'Despesa',data:'2026-12-21',contaId:'a',categoriaId:'d',cartaoId:'card',valor:3000,status:'Pendente'}]});
assert.equal(core.cardInvoice(yearState,yearCard,new Date('2026-12-25T12:00:00')).key,'2027-01');

const recurrence=base({series:[{id:'series-1',tipo:'recorrencia',status:'pausada'}],lancamentos:[{id:'future',tipo:'Despesa',data:'2026-06-01',contaId:'a',categoriaId:'d',valor:1000,status:'Pendente',serieId:'series-1'}]});
assert.equal(core.monthEntries(recurrence,6,2026,'2026-05-31').length,0);
assert.equal(core.monthEntries(recurrence,6,2026,'2026-06-02').length,1);

const transfer=base({lancamentos:[{id:'out',tipo:'Despesa',tipoOperacao:'transferencia',natureza:'transferencia',movimentoTransferencia:'saida',operacaoId:'op',data:'2026-01-05',contaId:'a',contaDestinoId:'b',valor:5000,status:'Pago'},{id:'in',tipo:'Receita',tipoOperacao:'transferencia',natureza:'transferencia',movimentoTransferencia:'entrada',operacaoId:'op',data:'2026-01-05',contaId:'b',contaOrigemId:'a',valor:5000,status:'Pago'}]});
assert.equal(core.accountBalance(transfer,transfer.contas[0],'2026-01-10'),95000);
assert.equal(core.accountBalance(transfer,transfer.contas[1],'2026-01-10'),5000);
assert.equal(core.totalByNature(transfer,1,2026,'transferencia','2026-01-10'),5000);

const investment=base({lancamentos:[{id:'aporte',tipo:'Despesa',tipoOperacao:'investimento',natureza:'investimento',movimentoInvestimento:'aporte',data:'2026-01-05',contaId:'a',categoriaId:'d',valor:10000,status:'Pago'},{id:'resgate',tipo:'Despesa',tipoOperacao:'investimento',natureza:'investimento',movimentoInvestimento:'resgate',data:'2026-01-06',contaId:'a',categoriaId:'d',valor:2500,status:'Pago'}]});
assert.equal(core.totals(investment,1,2026,'2026-01-10').despesas,0);
assert.equal(core.accountBalance(investment,investment.contas[0],'2026-01-10'),92500);

const planned=base({planejamentos:{'2026-01':{receita:200000,investimento:30000,orcamentos:{d:50000}}},lancamentos:[{id:'r',tipo:'Receita',data:'2026-01-05',contaId:'a',categoriaId:'r',valor:200000,status:'Pago'},{id:'d1',tipo:'Despesa',data:'2026-01-06',contaId:'a',categoriaId:'d',valor:60000,status:'Pago'}]});
const snapshot=context.window.FinTrackClosing.createSnapshot(planned,'2026-01',{fechadoEm:'2026-02-01T00:00:00.000Z'});
assert.equal(snapshot.snapshot.receitas,200000);
assert.equal(snapshot.snapshot.despesas,60000);
assert.equal(snapshot.snapshot.categoriasEstouradas.length,1);
assert.equal(snapshot.snapshot.orcamentos.d,50000);

const mixedBudget=base({planejamentos:{'2026-01':{receita:0,investimento:0,orcamentos:{d:100000}}},lancamentos:[
  {id:'paid',tipo:'Despesa',tipoOperacao:'despesa',data:'2026-01-06',contaId:'a',categoriaId:'d',valor:30000,status:'Pago'},
  {id:'pending',tipo:'Despesa',tipoOperacao:'despesa',data:'2026-01-07',contaId:'a',categoriaId:'d',valor:20000,status:'Pendente'},
]});
const mixedSummary=core.budgetSummary(mixedBudget,'d',1,2026,100000);
const mixedSnapshot=context.window.FinTrackClosing.createSnapshot(mixedBudget,'2026-01').snapshot.orcamentoDetalhado[0];
assert.deepEqual(
  {realizado:mixedSnapshot.realizado,pendente:mixedSnapshot.pendente,comprometido:mixedSnapshot.comprometido,disponivel:mixedSnapshot.disponivel},
  {realizado:mixedSummary.realizado,pendente:mixedSummary.pendente,comprometido:mixedSummary.comprometido,disponivel:mixedSummary.disponivel},
  'núcleo e fechamento devem usar o mesmo contrato de orçamento',
);
assert.deepEqual(
  {realizado:mixedSnapshot.realizado,pendente:mixedSnapshot.pendente,comprometido:mixedSnapshot.comprometido,disponivel:mixedSnapshot.disponivel},
  {realizado:30000,pendente:20000,comprometido:50000,disponivel:50000},
);
console.log('regression tests: OK');
