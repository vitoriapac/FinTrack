const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};vm.createContext(context);
for(const file of ['js/financial-core.js','js/services/future.js','js/core/closing.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const data={
  contas:[{id:'a',nome:'Conta',saldoInicial:100000,dataSaldoInicial:'2026-01-01'}],categorias:[],
  lancamentos:[
    {id:'income',tipo:'Receita',tipoOperacao:'receita',data:'2026-10-05',valor:20000,status:'Pendente',contaId:'a',descricao:'Receita prevista'},
    {id:'installment',tipo:'Despesa',tipoOperacao:'despesa',data:'2026-10-10',dataVencimento:'2026-10-12',valor:5000,status:'Pendente',contaId:'a',descricao:'Parcela',serieId:'s',serieTipo:'parcelamento'},
    {id:'paid',tipo:'Despesa',tipoOperacao:'despesa',data:'2026-09-01',valor:10000,status:'Pago',contaId:'a'},
  ],
  dividas:[{id:'d',credor:'Banco',saldo:40000,valorParcela:8000,proximoVencimento:'2026-10-20'}],
  ativosInvestimento:[{id:'asset',nome:'Tesouro',instituicao:'Corretora',valorAtual:60000,atualizadoEm:'2026-09-01'}],
  despesasAnuais:[{id:'tax',nome:'IPVA',valorEstimado:120000,mes:12,contaId:'a'}],planejamentos:{'2026-09':{receita:300000,investimento:30000,orcamentos:{food:50000}}}
};
const before=JSON.stringify(data),agenda=context.window.AgendaService.project(data,{start:'2026-10-01',end:'2026-12-31'});
assert.equal(JSON.stringify(agenda.map(item=>item.origem)),JSON.stringify(['lancamento','parcela','divida','despesa_anual']));
assert.equal(context.window.AgendaService.project(data,{start:'2026-10-01',end:'2026-10-31'},{tipo:'receita'}).length,1);
const patrimony=context.window.PatrimonyService.summary(data,'2026-09-30');
assert.equal(patrimony.contas,90000);assert.equal(patrimony.investimentos,60000);assert.equal(patrimony.dividas,40000);assert.equal(patrimony.liquido,110000);
const copied=context.window.PlanningService.copy(data,'2026-09','2026-10');
assert.equal(JSON.stringify(copied.planejamentos['2026-10']),JSON.stringify(data.planejamentos['2026-09']));assert.notEqual(copied.planejamentos['2026-10'],data.planejamentos['2026-09']);
assert.equal(JSON.stringify(context.window.PlanningService.annualReserve(data.despesasAnuais[0],'2026-09')),JSON.stringify({mesesRestantes:4,reservaMensalSugerida:30000}));
const closing=context.window.FinTrackClosing.createSnapshot(data,'2026-09');
assert.equal(closing.snapshot.versao,4);assert.equal(closing.snapshot.patrimonio.liquido,110000);
assert.equal(JSON.stringify(data),before,'serviços puros não podem alterar a entrada');
data.ativosInvestimento[0].valorAtual=999999;assert.equal(closing.snapshot.patrimonio.investimentos,60000,'snapshot v4 deve permanecer imutável após alterações atuais');
const goal={id:'goal',nome:'Reserva',alvo:100000,saldoInicial:10000,prazo:'2026-12-31'},goalData={metas:[goal],lancamentos:[{id:'c1',operacaoId:'o1',metaId:'goal',tipoOperacao:'investimento',movimentoInvestimento:'aporte',status:'Pago',data:'2026-08-10',valor:20000},{id:'c2',operacaoId:'o2',metaId:'goal',tipoOperacao:'investimento',movimentoInvestimento:'resgate',status:'Pago',data:'2026-09-10',valor:5000},{id:'ignored',operacaoId:'o3',metaId:'goal',tipoOperacao:'investimento',movimentoInvestimento:'aporte',status:'Pago',data:'2026-09-12',valor:90000}],operacoes:[{id:'o1',status:'concluida'},{id:'o2',status:'concluida'},{id:'o3',status:'estornada'}]};
const goalSummary=context.window.GoalService.summary(goalData,goal,'2026-09-15');assert.equal(goalSummary.acumulado,25000);assert.equal(goalSummary.aporteMedio,20000);assert.equal(goalSummary.contribuicoes.length,2);
const projected=context.window.ProjectionService.project(data,'2026-10',3);
assert.equal(projected.meses.length,3);assert.equal(projected.meses[0].entradas,20000);assert.ok(projected.meses[0].saidas>=13000);assert.equal(JSON.stringify(projected.cenario),'{}');assert.ok(projected.aviso.includes('Estimativa'));
const scenario=context.window.ProjectionService.project(data,'2026-10',3,{gastoMensal:10000});assert.equal(scenario.meses[2].saldoFinal,projected.meses[2].saldoFinal-30000);assert.equal(JSON.stringify(data),JSON.stringify({...data}));
console.log('future services tests: OK');
