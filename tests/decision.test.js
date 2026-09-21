const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.createContext(context);
const files=['js/financial-core.js','js/services/future.js','js/services/analysis/core.js','js/services/analysis/recurring.js','js/services/analysis/commitment.js','js/services/analysis/reserve.js','js/services/analysis/quality.js','js/services/analysis/anomaly.js','js/services/analysis/concentration.js','js/services/analysis/index.js','js/services/health.js','js/services/insights.js','js/services/decision.js'];
for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const data={
  contas:[{id:'account',nome:'Conta',saldoInicial:100000,dataSaldoInicial:'2026-01-01'}],
  categorias:[{id:'income',nome:'Renda',tipo:'Entrada'},{id:'food',nome:'Mercado',tipo:'Saída',orcado:10000,essencial:true}],
  lancamentos:[
    {id:'income-paid',tipo:'Receita',tipoOperacao:'receita',status:'Pago',data:'2026-09-01',valor:50000,contaId:'account',categoriaId:'income'},
    {id:'expense-paid',tipo:'Despesa',tipoOperacao:'despesa',status:'Pago',data:'2026-09-03',valor:15000,contaId:'account',categoriaId:'food'},
    {id:'overdue',tipo:'Despesa',tipoOperacao:'despesa',status:'Pendente',data:'2026-09-05',dataVencimento:'2026-09-05',valor:20000,contaId:'account',categoriaId:'food'},
  ],
  planejamentos:{'2026-09':{receita:50000,investimento:0,orcamentos:{food:10000}}},fechamentos:{},ativosInvestimento:[],dividas:[],metas:[],despesasAnuais:[],operacoes:[],series:[],recurrenceDecisions:[],configuracoesFinanceiras:{reservaMeses:6},
};
const before=JSON.stringify(data),health=context.window.HealthService.evaluate(data,{today:'2026-09-15'}),decision=context.window.DecisionService.evaluate(data,{today:'2026-09-15',limit:3});
assert.equal(JSON.stringify(data),before,'a camada de decisão deve ser pura');
assert.equal(health.period,'2026-09');assert.equal(health.components.length,5);assert.ok(health.score>=0&&health.score<=100);assert.ok(['normal','atencao','critico'].includes(health.status));
assert.ok(decision.primary);assert.ok(decision.actions.length>=1&&decision.actions.length<=3);assert.equal(new Set(decision.actions.map(item=>`${item.target}|${item.title}`)).size,decision.actions.length,'ações não devem se repetir');
assert.ok(decision.insights.every(item=>Number.isInteger(item.relevancia)&&item.relevancia>=0&&item.relevancia<=100));assert.ok(decision.insights.every(item=>Object.keys(item.fatoresRelevancia).join(',')==='urgency,impact,dataQuality,actionability'));assert.ok(decision.insights.every((item,index,list)=>index===0||list[index-1].relevancia>=item.relevancia),'insights devem ser ordenados por relevância');
assert.ok(decision.narrative.some(group=>group.section==='Agora'));assert.ok(decision.actions[0].effect);assert.equal(decision.health.score,health.score);
console.log('decision tests: OK');
