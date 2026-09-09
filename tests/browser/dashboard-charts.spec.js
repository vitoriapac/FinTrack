const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();});

test('dashboard apresenta gráficos acessíveis e equivalentes textuais',async({page})=>{
  await expect(page.locator('[data-chart="bars"]')).toContainText('Receitas × despesas');
  await expect(page.locator('[data-chart="horizontal"]')).toContainText('Orçamento comprometido');
  await expect(page.locator('[data-chart="area"]')).toContainText('Projeção de três meses');
  await expect(page.locator('[data-chart="line"]')).toContainText('Evolução patrimonial');
  await expect(page.locator('[data-chart="donut"]')).toContainText('Despesas por categoria');
  for(const chart of await page.locator('.chart').all())await expect(chart.locator('.chart-summary')).not.toBeEmpty();
});

test('gráficos usam fallback explícito em séries sem dados',async({page})=>{
  await expect(page.locator('[data-chart="line"] .chart-empty')).toContainText('Sem dados suficientes');
  await expect(page.locator('[data-chart="donut"] .chart-empty')).toContainText('Sem dados suficientes');
});
