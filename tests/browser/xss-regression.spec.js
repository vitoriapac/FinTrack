const {test,expect}=require('@playwright/test');
test('nomes financeiros são renderizados como texto, nunca como HTML executável',async({page})=>{
  await page.addInitScript(()=>{window.__fintrackXss=false;});await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();
  const payload='<img src=x onerror="window.__fintrackXss=true">';
  await page.evaluate(value=>{const data=FinTrackState.getState();data.contas=[{id:'evil-account',nome:value,saldoInicial:0,dataSaldoInicial:'2026-09-01'}];data.categorias=[{id:'evil-category',nome:value,tipo:'Saída',tipoGasto:'Essencial',orcado:10000}];data.metas=[{id:'evil-goal',nome:value,alvo:10000,saldoInicial:0,prazo:'2026-12-31'}];data.lancamentos=[{id:'evil-entry',descricao:value,tipo:'Despesa',tipoOperacao:'despesa',categoriaId:'evil-category',contaId:'evil-account',data:'2026-09-10',valor:100,status:'Pago'}];FinTrackState.replaceState(data);render();},payload);
  await page.evaluate(()=>{cadastroTab='contas';setView('cadastro');});await expect(page.getByText(payload,{exact:true})).toBeVisible();
  await page.evaluate(()=>setView('metas'));await expect(page.getByText(payload,{exact:true}).first()).toBeVisible();
  await page.evaluate(()=>setView('lancamentos'));await expect(page.locator('main')).toContainText(payload);
  expect(await page.evaluate(()=>window.__fintrackXss)).toBe(false);expect(await page.locator('main img').count()).toBe(0);
});
