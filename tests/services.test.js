const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/core/state.js','js/financial-core.js','js/services/financial.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const services=context.window.FinTrackServices;
const core=context.window.FinTrackCore;
const state={contas:[{id:'a',saldoInicial:10000,dataSaldoInicial:'2026-01-01'},{id:'b',saldoInicial:0,dataSaldoInicial:'2026-01-01'}],categorias:[],cartoes:[{id:'card'}],lancamentos:[],operacoes:[],pagamentosCartao:[],pagamentosDividas:[],dividas:[{id:'debt',saldo:10000,juros:1,parcelasRestantes:4}]};

const transfer=services.transfers.upsert(state,{data:'2026-09-01',contaId:'a',contaDestinoId:'b',valor:2500,status:'Pago'},(prefix)=>`${prefix}-test`);
assert.equal(transfer.items.length,2);
assert.equal(transfer.items[0].valor,2500);
assert.equal(transfer.items[0].operacaoId,transfer.items[1].operacaoId);
assert.equal(transfer.state.operacoes[0].tipo,'transferencia');
assert.throws(()=>services.transfers.upsert(state,{contaId:'a',contaDestinoId:'a',valor:100}),/diferentes/);

const installments=services.installments.expand({id:'first',data:'2026-09-01',descricao:'Compra',valor:0,status:'Pago'},
  {totalCents:10001,count:3,frequency:'mensal',addInterval:(date,n)=>`2026-${String(9+n).padStart(2,'0')}-01`,idFactory:prefix=>`${prefix}-test`});
assert.equal(installments.length,3);
assert.equal(installments.reduce((sum,item)=>sum+item.valor,0),10001);
assert.equal(installments.map(item=>item.parcelaAtual).join(','),'1,2,3');

const paidCard=services.payments.card(state,{id:'payment',operacaoId:'op-card-1',lancamentoId:'mov-card-1',cartaoId:'card',invoiceKey:'2026-09',contaId:'a',valor:500,outstanding:1000,data:'2026-09-10'});
assert.equal(paidCard.pagamentosCartao.length,1);
assert.equal(paidCard.lancamentos[0].natureza,'pagamento_cartao');
assert.equal(paidCard.operacoes[0].tipo,'pagamento_cartao');
assert.equal(core.accountBalance(paidCard,paidCard.contas[0],'2026-09-30'),9500);
assert.equal(core.totals(paidCard,9,2026,'2026-09-30').despesas,0,'pagamento de fatura não duplica despesa operacional');
const paidCardTwice=services.payments.card(paidCard,{id:'payment-2',operacaoId:'op-card-2',lancamentoId:'mov-card-2',cartaoId:'card',invoiceKey:'2026-09',contaId:'a',valor:300,outstanding:500,data:'2026-09-11'});
assert.equal(paidCardTwice.pagamentosCartao.reduce((sum,item)=>sum+item.valor,0),800);
const reversedCard=services.payments.reverseCard(paidCardTwice,'payment').state;
assert.equal(reversedCard.pagamentosCartao.length,1);
assert.equal(reversedCard.lancamentos.some(item=>item.id==='mov-card-1'),false);
assert.equal(reversedCard.operacoes.find(item=>item.id==='op-card-1').status,'estornada');
const paidDebt=services.payments.debt(state,{id:'debt-payment',operacaoId:'op-debt-1',lancamentoId:'mov-debt-1',dividaId:'debt',contaId:'a',valor:2500,data:'2026-09-10'});
assert.equal(paidDebt.dividas[0].saldo,7600);
assert.equal(paidDebt.pagamentosDividas.length,1);
assert.equal(paidDebt.pagamentosDividas[0].juros,100);
assert.equal(paidDebt.pagamentosDividas[0].amortizacao,2400);
const reversedDebt=services.payments.reverseDebt(paidDebt,'debt-payment').state;
assert.equal(reversedDebt.dividas[0].saldo,10000);
assert.equal(reversedDebt.dividas[0].parcelasRestantes,4);
assert.equal(state.dividas[0].saldo,10000,'serviços não devem mutar o estado original');
assert.throws(()=>services.payments.card(state,{cartaoId:'card',invoiceKey:'2026-09',valor:100,outstanding:100,data:'2026-09-10'}),/conta pagadora/);
const invested=services.investments.register(state,{id:'investment',operacaoId:'op-investment',movimentoInvestimento:'aporte',contaId:'a',valor:1000,data:'2026-09-12',status:'Pago'});
assert.equal(invested.state.operacoes[0].tipo,'investimento');
assert.equal(invested.entry.operacaoId,'op-investment');

const transferTrash=services.entries.trash(transfer.state,transfer.items[0].id,'item','2026-09-12T00:00:00.000Z');
assert.equal(transferTrash.items.length,2,'transferência deve ser excluída de forma atômica');
assert.equal(transferTrash.state.lancamentos.length,0);
assert.equal(transferTrash.state.lixeira.length,2);
const toggled=services.entries.toggleStatus(transfer.state,transfer.items[0].id);
assert.equal(toggled.items.length,2);
assert.equal(toggled.items[0].status,'Pendente');

const entityState=services.entities.upsert(state,'dividas',{id:'new-debt',saldo:5000});
assert.equal(entityState.dividas.length,2);
assert.equal(services.entities.remove(entityState,'dividas','new-debt').dividas.length,1);
console.log('services tests: OK');
