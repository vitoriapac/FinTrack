const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/view-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/forms/registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ui/events.js', 'utf8'), context);
const views = context.window.FinTrackViews;
const forms = context.window.FinTrackForms;

views.register('sample', () => 'ok');
assert.equal(views.render('sample'), 'ok');
assert.equal(views.names().join(','), 'sample');

forms.register('sample', value => value + 1);
assert.equal(forms.open('sample', 4), 5);
assert.equal(forms.names().join(','), 'sample');

console.log('registry tests: OK');
