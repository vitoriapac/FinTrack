const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/view-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/forms/registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ui/events.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/core/state.js', 'utf8'), context);
const views = context.window.FinTrackViews;
const forms = context.window.FinTrackForms;

views.register('sample', () => 'ok');
assert.equal(views.render('sample'), 'ok');
assert.equal(views.names().join(','), 'sample');

forms.register('sample', value => value + 1);
assert.equal(forms.open('sample', 4), 5);
assert.equal(forms.names().join(','), 'sample');

let current={value:1};
context.window.FinTrackState.bind({get:()=>current,set:next=>{current=next;}});
let observed=0;
const unsubscribe=context.window.FinTrackState.subscribe(next=>{observed=next.value;});
context.window.FinTrackState.updateState(state=>({...state,value:state.value+2}));
assert.equal(context.window.FinTrackState.getState().value,3);
assert.equal(observed,3);
unsubscribe();

console.log('registry tests: OK');
