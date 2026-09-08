const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const requiredScripts = [
  'js/financial-core.js',
  'js/ui/screen-events.js',
  'js/forms/entry.js',
  'js/views/cadastro.js',
  'js/views/cartoes.js',
  'js/views/dividas.js',
  'js/views/auditoria.js',
  'js/views/historico.js',
  'js/reporting/monthly-pdf.js',
  'js/ui/productivity.js',
];
for (const script of requiredScripts) assert.ok(html.includes(`src="${script}"`), `script ausente: ${script}`);
assert.ok(html.indexOf('js/financial-core.js') < html.indexOf('js/ui/screen-events.js'));
assert.ok(fs.readFileSync('js/ui/screen-handlers.js', 'utf8').includes('FinTrackScreenEvents.attach(main)'));
const app=fs.readFileSync('js/app.js','utf8');
assert.ok(app.includes('FinTrackCore.cardInvoice(state,c,new Date())'));
assert.ok(app.includes('FinTrackCore.debtProjection(d)'));
assert.ok(app.includes('Parcela estimada'));
assert.ok(app.includes('Importar lançamentos CSV'));
assert.ok(app.includes('function importarCSV(e)'));
assert.ok(html.includes('js/forms/payments.js'));
assert.ok(app.includes('data-action="pay-card"'));
assert.ok(app.includes('data-action="pay-divida"'));
assert.ok(app.includes('data-action="reverse-card-payment"'));
assert.ok(app.includes('data-action="reverse-debt-payment"'));
assert.ok(app.includes('Pagamentos de faturas'));
assert.ok(app.includes('Pagamentos de dívidas'));
assert.ok(html.includes('js/core/state.js'));
assert.ok(html.includes('js/services/financial.js'));
assert.ok(html.includes('js/core/data-import.js'));
assert.ok(app.includes('Antes da migração'));
assert.ok(app.includes('Pré-visualização da importação'));
assert.ok(app.includes('foi revertida integralmente'));
assert.ok(app.includes('MODO DEMO'));
const home=fs.readFileSync('js/views/home.js','utf8');
assert.ok(home.includes('Situação'));
assert.ok(home.includes('Atenção e ação'));
assert.ok(home.includes('Diagnóstico financeiro'));
assert.ok(home.includes('role="progressbar"'));
assert.ok(app.includes('Fatura atual'));
assert.ok(app.includes('renderAppFooter()'));
assert.ok(app.includes('Backup e recuperação'));
assert.ok(fs.readFileSync('js/views/metas.js','utf8').includes('data-action="del-meta"'));
assert.ok(fs.readFileSync('js/ui/screen-handlers.js','utf8').includes("entities.remove(state,'metas'"));
assert.ok(fs.readFileSync('js/views/balanco.js','utf8').includes('balance-section'));
const css=fs.readFileSync('css/app.css','utf8');
assert.ok(css.includes('min-height:100vh;margin:0 auto;display:flex;flex-direction:column'));
assert.ok(css.includes('.app-footer{margin-top:auto'));
assert.ok(html.includes('js/ui/form-validation.js'));
assert.ok(fs.readFileSync('js/views/home.js','utf8').includes('O que fazer hoje'));
assert.ok(fs.readFileSync('js/views/home.js','utf8').includes('Por quê?'));
assert.ok(fs.readFileSync('js/views/planejamento.js','utf8').includes('Orçamento operacional'));
assert.ok(fs.readFileSync('js/views/planejamento.js','utf8').includes('Acompanhamento'));
assert.ok(fs.readFileSync('js/views/historico.js','utf8').includes('lancamentosDetalhados'));
assert.ok(fs.readFileSync('js/views/historico.js','utf8').includes('data-action="export-closing-pdf"'));
assert.ok(fs.readFileSync('js/views/lancamentos.js','utf8').includes('transaction-mobile-list'));
const history=fs.readFileSync('js/views/historico.js','utf8');
assert.ok(history.includes('Estatísticas dos fechamentos'));
assert.ok(history.includes('último mês fechado'));
assert.ok(history.includes('Snapshot legado'));
assert.ok(fs.readFileSync('js/ui/productivity.js','utf8').includes("event.key.toLowerCase()==='k'"));
const cadastro=fs.readFileSync('js/views/cadastro.js','utf8');
assert.ok(cadastro.includes('Categorias'));
assert.ok(cadastro.includes('Contas'));
for(const removed of ['Backup e demonstração','Auditoria','Cartões','Dívidas']) assert.ok(!cadastro.includes(removed),`${removed} ainda aparece no Cadastro`);
assert.ok(html.includes('href="css/app.css"'));
assert.ok(html.includes('href="css/tokens.css"'));
assert.ok(html.includes('href="css/mobile.css"'));
assert.ok(html.includes('href="#main"'));
assert.ok(!html.includes('legacy-adapter'));
assert.ok(!html.includes('<style>'));
assert.ok(!html.includes('<script>'));

const events = fs.readFileSync('js/ui/screen-events.js', 'utf8');
assert.ok(events.includes('data-action="del-cartao"'));
assert.ok(events.includes('data-action="del-divida"'));
console.log('ui contract tests: OK');
