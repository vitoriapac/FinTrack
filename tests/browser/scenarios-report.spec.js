const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();});
test('cenário temporário compara caixa sem alterar estado',async({page})=>{
  await page.evaluate(()=>setView('simuladores'));
  const before=await page.evaluate(()=>JSON.stringify(FinTrackState.getState()));
  await page.getByLabel('Mudança').selectOption('reduce-expense');
  await page.getByLabel('Valor (R$)').fill('150');
  await page.getByRole('button',{name:'Comparar cenários'}).click();
  await expect(page.locator('#scenario-result')).toContainText('Saldo projetado: atual × cenário');
  await expect(page.locator('#scenario-result')).toContainText('Nenhum lançamento, orçamento ou dívida foi alterado');
  expect(await page.evaluate(()=>JSON.stringify(FinTrackState.getState()))).toBe(before);
  await page.getByLabel('Mudança').selectOption('debt');
  await page.getByRole('button',{name:'Comparar cenários'}).click();
  await expect(page.locator('#scenario-result')).toContainText('Selecione uma dívida ativa');
});
test('relatório visual usa apenas snapshot e comparação congelada',async({page})=>{
  const result=await page.evaluate(()=>{const demo=criarDadosDemo(),entries=Object.entries(demo.fechamentos).sort(([a],[b])=>a.localeCompare(b)),[key,closing]=entries.at(-1),previous=entries.at(-2)[1],before=JSON.stringify(closing.snapshot),html=FinTrackPdfReport.buildHtml(key,closing,previous);return {html,unchanged:JSON.stringify(closing.snapshot)===before};});
  expect(result.unchanged).toBe(true);
  expect(result.html).toContain('Quando o dinheiro saiu');
  expect(result.html).toContain('Para onde foi o dinheiro');
  expect(result.html).toContain('Comparação com');
  expect(result.html).toContain('Diagnóstico histórico');
});
