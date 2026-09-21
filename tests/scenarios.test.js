const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{ProjectionService:{project:(_data,start,count,scenario={})=>({meses:Array.from({length:count},(_,index)=>{const month=`2026-${String(9+index).padStart(2,'0')}`,adjustment=Number(scenario.ajustes?.[month]||0)-Number(scenario.gastoMensal||0)-Number(scenario.investimentoMensal||0);return {mes:month,saldoFinal:100000+adjustment*(index+1),menorSaldo:50000+adjustment*(index+1)};})})},SimulatorService:{payoff:()=>({mesesEstimados:4,totalEstimado:40000})}}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/services/scenarios.js','utf8'),context);
const service=context.window.ScenarioService,data={dividas:[{id:'d',saldo:50000}]},before=JSON.stringify(data);
assert.equal(service.compare(data,'2026-09',{kind:'reduce-expense',amount:1000}).rows[0].difference,1000);
assert.equal(service.compare(data,'2026-09',{kind:'reserve',amount:1000}).rows[0].difference,-1000);
assert.equal(service.compare(data,'2026-09',{kind:'debt',amount:1000,debtId:'d'}).debt.mesesEstimados,4);
const purchase=service.compare(data,'2026-09',{kind:'installment',amount:10001,installments:3});assert.equal(purchase.rows.length,3);assert.equal(purchase.rows[0].difference,-3334);assert.equal(purchase.rows[1].difference,-6668);
assert.equal(JSON.stringify(data),before);assert.throws(()=>service.compare(data,'2026-09',{kind:'debt',amount:1000,debtId:'none'}),/dívida ativa/);assert.throws(()=>service.compare(data,'2026-09',{kind:'reserve',amount:0}),/maior que zero/);
console.log('scenario tests: OK');
