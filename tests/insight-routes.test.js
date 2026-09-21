const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('js/ui/insight-routes.js','utf8'),context);
const routes=context.window.FinTrackInsightRoutes;
for(const [type,view] of Object.entries({orcamento:'planejamento',atrasos:'agenda',projecao:'projecao',comprometimento:'planejamento',qualidade:'auditoria',reserva:'patrimonio',anomalia:'analises',concentracao:'analises',dividas:'dividas',metas:'metas'}))assert.equal(routes.forInsight({tipo:type},{}).view,view);
const overdue=routes.forInsight({tipo:'atrasos',evidencia:{lancamentoIds:['late']}},{lancamentos:[{id:'late',data:'2026-09-10',dataVencimento:'2026-09-08'}]});assert.equal(overdue.date,'2026-09-08');
const budget=routes.forInsight({tipo:'orcamento',evidencia:{periodo:'2026-09',categoriaId:'food'}},{});assert.equal(budget.month,'2026-09');assert.equal(budget.categoryId,'food');
assert.equal(routes.forInsight({tipo:'metas',evidencia:{metaId:'goal-1'}},{}).entityId,'goal-1');
assert.equal(routes.forInsight({tipo:'projecao',evidencia:{periodo:'invalid'}},{}).month,null);
console.log('insight route tests: OK');
