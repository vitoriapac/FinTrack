const assert=require('node:assert/strict');
const fs=require('node:fs');

const files=[
  'js/forms/cards.js','js/forms/catalog.js','js/forms/debts.js','js/forms/entry.js',
  'js/forms/goals.js','js/forms/payments.js','js/forms/transactions.js',
  'js/ui/screen-events.js','js/ui/screen-handlers.js',
];
const forbidden=[
  /state\.[A-Za-z_$][\w$]*\s*=/,
  /state\.[A-Za-z_$][\w$]*\.push\s*\(/,
  /state\.[A-Za-z_$][\w$]*\.splice\s*\(/,
];

for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  for(const pattern of forbidden) assert.doesNotMatch(source,pattern,`${file} altera o estado financeiro diretamente`);
}
assert.ok(fs.readFileSync('js/forms/transactions.js','utf8').includes('FinTrackServices.transfers.upsert'));
assert.ok(fs.readFileSync('js/forms/entry.js','utf8').includes('FinTrackServices.installments.expand'));
assert.ok(fs.readFileSync('js/forms/payments.js','utf8').includes('FinTrackServices.payments'));
assert.equal(fs.existsSync('js/forms/legacy-adapter.js'),false);
assert.doesNotMatch(fs.readFileSync('js/ui/screen-handlers.js','utf8'),/FinTrackFormLayer/);
assert.doesNotMatch(fs.readFileSync('js/ui/screen-events.js','utf8'),/FinTrackFormLayer/);
console.log('architecture tests: OK');
