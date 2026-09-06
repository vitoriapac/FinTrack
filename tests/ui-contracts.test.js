const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const requiredScripts = [
  'js/financial-core.js',
  'js/ui/screen-events.js',
  'js/forms/entry.js',
  'js/views/cadastro.js',
];
for (const script of requiredScripts) assert.ok(html.includes(`src="${script}"`), `script ausente: ${script}`);
assert.ok(html.indexOf('js/financial-core.js') < html.indexOf('js/ui/screen-events.js'));
assert.ok(html.includes('FinTrackScreenEvents.attach(main)'));
assert.ok(html.includes('FinTrackCore.cardInvoice(state,c,new Date())'));
assert.ok(html.includes('FinTrackCore.debtProjection(d)'));
assert.ok(html.includes('Parcela estimada'));
assert.ok(html.includes('Fatura atual'));

const events = fs.readFileSync('js/ui/screen-events.js', 'utf8');
assert.ok(events.includes('data-action="del-cartao"'));
assert.ok(events.includes('data-action="del-divida"'));
console.log('ui contract tests: OK');
