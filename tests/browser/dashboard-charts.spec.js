const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();});

test('dashboard apresenta gráficos acessíveis e equivalentes textuais',async({page})=>{
  await expect(page.locator('[data-chart="bars"]')).toContainText('Receitas × despesas');
  await expect(page.locator('[data-chart="horizontal"]')).toContainText('Orçamento comprometido');
  await expect(page.locator('[data-chart="area"]')).toContainText('Saldo projetado');
  await expect(page.locator('[data-chart="line"]').filter({hasText:'Evolução patrimonial'})).toBeVisible();
  await expect(page.locator('[data-chart="donut"]').filter({hasText:'Despesas por categoria'})).toBeVisible();
  for(const chart of await page.locator('.chart').all())await expect(chart.locator('.chart-summary')).not.toBeEmpty();
});

test('gráficos usam fallback explícito em séries sem dados',async({page})=>{
  await expect(page.locator('[data-chart="line"]').filter({hasText:'Evolução patrimonial'}).locator('.chart-empty')).toContainText('Ainda faltam dados');
  await expect(page.locator('[data-chart="donut"]').filter({hasText:'Despesas por categoria'}).locator('.chart-empty')).toContainText('Ainda faltam dados');
});

test('tooltip compartilhado responde a teclado e mantém valor acessível',async({page})=>{
  const mark=page.locator('[data-chart="bars"] [data-chart-value]').first();
  await mark.focus();
  await expect(page.locator('[data-chart="bars"] .chart-tooltip')).toBeVisible();
  await expect(page.locator('[data-chart="bars"] .chart-tooltip')).toContainText('Receitas');
  await page.keyboard.press('Tab');
  await expect(mark).not.toBeFocused();
});
