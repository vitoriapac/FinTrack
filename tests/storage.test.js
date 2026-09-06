const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const values = new Map();
const context = { window: { storage: {
  async get(key){ if(!values.has(key)) throw new Error('missing'); return { value: values.get(key) }; },
  async set(key,value){ values.set(key,value); },
} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/storage.js','utf8'), context);
const storage = context.window.FinTrackStorage;

(async()=>{
  await storage.set('sample', { value: 42 });
  assert.equal((await storage.get('sample')).value, 42);
  assert.equal((await storage.load('missing', { fallback: true })).fallback, true);
  console.log('storage tests: OK');
})().catch(error=>{ console.error(error); process.exitCode=1; });

const fallbackContext = { window: {} };
vm.createContext(fallbackContext);
vm.runInContext(fs.readFileSync('js/storage.js','utf8'), fallbackContext);
const fallbackStorage = fallbackContext.window.FinTrackStorage;
(async()=>{
  await fallbackStorage.set('fallback', { value: 7 });
  assert.equal((await fallbackStorage.get('fallback')).value, 7);
  assert.equal((await fallbackStorage.load('missing', 'default')), 'default');
  console.log('storage fallback tests: OK');
})().catch(error=>{ console.error(error); process.exitCode=1; });
