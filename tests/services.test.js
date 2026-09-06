const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.createContext(context);
for(const file of ['js/core/state.js','js/services/financial.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const services=context.window.FinTrackServices;
const state={contas:[{id:'a'},{id:'b'}],lancamentos:[],pagamentosCartao:[],pagamentosDividas:[],dividas:[{id:'debt',saldo:10000,parcelasRestantes:4}]};

const transfer=services.transfers.upsert(state,{data:'2026-09-01',contaId:'a',contaDestinoId:'b',valor:2500,status:'Pago'},(prefix)=>`${prefix}-test`);
assert.equal(transfer.items.length,2);
assert.equal(transfer.items[0].valor,2500);
assert.equal(transfer.items[0].operacaoId,transfer.items[1].operacaoId);
assert.throws(()=>services.transfers.upsert(state,{contaId:'a',contaDestinoId:'a',valor:100}),/diferentes/);

const installments=services.installments.expand({id:'first',data:'2026-09-01',descricao:'Compra',valor:0,status:'Pago'},
  {totalCents:10001,count:3,frequency:'mensal',addInterval:(date,n)=>`2026-${String(9+n).padStart(2,'0')}-01`,idFactory:prefix=>`${prefix}-test`});
assert.equal(installments.length,3);
assert.equal(installments.reduce((sum,item)=>sum+item.valor,0),10001);
assert.equal(installments.map(item=>item.parcelaAtual).join(','),'1,2,3');

const paidCard=services.payments.card(state,{id:'payment',cartaoId:'card',invoiceKey:'2026-09',valor:500,outstanding:1000,data:'2026-09-10'});
assert.equal(paidCard.pagamentosCartao.length,1);
assert.equal(services.payments.reverseCard(paidCard,'payment').state.pagamentosCartao.length,0);
const paidDebt=services.payments.debt(state,{id:'debt-payment',dividaId:'debt',valor:2500,data:'2026-09-10'});
assert.equal(paidDebt.dividas[0].saldo,7500);
assert.equal(paidDebt.pagamentosDividas.length,1);
const reversedDebt=services.payments.reverseDebt(paidDebt,'debt-payment').state;
assert.equal(reversedDebt.dividas[0].saldo,10000);
assert.equal(reversedDebt.dividas[0].parcelasRestantes,4);
assert.equal(state.dividas[0].saldo,10000,'serviços não devem mutar o estado original');

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
