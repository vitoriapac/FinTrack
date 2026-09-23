const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const data={
  contas:[{id:'cash',nome:'Conta principal'},{id:'savings',nome:'Reserva'}],
  categorias:[{id:'food',nome:'Alimentação'}],
  series:[],
  lancamentos:[
    {id:'income',data:'2026-09-01',descricao:'Salário',tipo:'Receita',tipoOperacao:'receita',valor:10000,status:'Pago',contaId:'cash'},
    {id:'expense',data:'2026-09-02',descricao:'Mercado',tipo:'Despesa',tipoOperacao:'despesa',valor:2500,status:'Pago',contaId:'cash',categoriaId:'food'},
    {id:'pending',data:'2026-09-03',descricao:'Conta pendente',tipo:'Despesa',tipoOperacao:'despesa',valor:1200,status:'Pendente',contaId:'cash'},
    {id:'aporte',data:'2026-09-04',descricao:'Aporte',tipo:'Despesa',tipoOperacao:'investimento',movimentoInvestimento:'aporte',valor:1000,status:'Pago',contaId:'cash'},
    {id:'resgate',data:'2026-09-05',descricao:'Resgate',tipo:'Despesa',tipoOperacao:'investimento',movimentoInvestimento:'resgate',valor:500,status:'Pago',contaId:'cash'},
    {id:'transfer-out',data:'2026-09-06',descricao:'Transferência',tipo:'Despesa',tipoOperacao:'transferencia',movimentoTransferencia:'saida',valor:500,status:'Pago',contaId:'cash'},
    {id:'transfer-in',data:'2026-09-06',descricao:'Transferência',tipo:'Receita',tipoOperacao:'transferencia',movimentoTransferencia:'entrada',valor:500,status:'Pago',contaId:'savings'},
    {id:'card-payment',data:'2026-09-07',descricao:'Pagamento cartão',tipo:'Despesa',tipoOperacao:'pagamento_cartao',valor:1000,status:'Pago',contaId:'cash'},
    {id:'debt-payment',data:'2026-09-08',descricao:'Pagamento dívida',tipo:'Despesa',tipoOperacao:'pagamento_divida',valor:600,status:'Pago',contaId:'cash'},
    {id:'old',data:'2026-08-31',descricao:'Fora do período',tipo:'Receita',tipoOperacao:'receita',valor:9000,status:'Pago',contaId:'cash'},
  ]
};
const context={window:{FinTrackCore:{nature:(_data,item)=>item.tipoOperacao||'despesa',seriesActive:()=>true,account:(source,id)=>source.contas.find(item=>item.id===id),category:(source,id)=>source.categorias.find(item=>item.id===id)}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('js/services/statement.js','utf8'),context);
const service=context.window.FinancialStatementService,filters={from:'2026-09-01',to:'2026-09-30',today:'2026-09-15'},result=service.query(data,filters);
assert.equal(result.rows.length,9);
assert.deepEqual(JSON.parse(JSON.stringify(result.totals)),{count:9,inflows:11000,outflows:6800,inflowsPaid:11000,outflowsPaid:5600,inflowsPending:0,outflowsPending:1200,netMovement:5400,projectedMovement:4200,income:10000,expenses:2500,incomePending:0,expensesPending:1200,operatingResult:7500,projectedOperatingResult:6300,investments:1500,cardPayments:1000,debtPayments:600,transfersIn:500,transfersOut:500});
assert.equal(service.query(data,{...filters,accountId:'cash'}).totals.transfersIn,0,'transferências são filtradas pelo lado da conta');
assert.equal(service.query(data,{...filters,kind:'transferencia'}).totals.netMovement,0,'transferências internas ficam neutras sem filtro por conta');
assert.equal(service.query(data,{...filters,status:'Pendente'}).rows[0].entry.id,'pending');
assert.equal(service.query(data,{...filters,categoryId:'food'}).rows.length,1);
assert.equal(service.query(data,{...filters,search:'SALÁRIO'}).rows[0].entry.id,'income');
assert.throws(()=>service.query(data,{from:'2026-09-31'}),/Data inicial inválida/);
assert.throws(()=>service.query(data,{from:'2026-09-20',to:'2026-09-01'}),/anterior ou igual/);
const csv=service.csv(data,filters);
assert.match(csv,/"Mercado";"Despesa";"Conta principal";"Alimentação";"Pago";"-25,00"/);
const formulaCsv=service.csv({...data,lancamentos:[{...data.lancamentos[0],descricao:'=HYPERLINK("https://example.invalid")'}]},filters);
assert.ok(formulaCsv.includes('"\'=HYPERLINK(""https://example.invalid"")"'),'CSV neutraliza fórmulas em campos textuais');
console.log('financial statement tests: OK');
