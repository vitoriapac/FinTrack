const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();});

test('rodapé reúne backup, recuperação, importação e armazenamento ativo',async({page})=>{
  const footer=page.locator('.app-footer');
  await expect(footer).toContainText(/Salvo localmente/);
  await expect(footer.getByRole('button',{name:'Backup JSON'})).toBeVisible();
  await expect(footer.getByRole('button',{name:'Arquivo de recuperação'})).toBeVisible();
  await expect(footer.getByText('Importar backup',{exact:true})).toBeVisible();
  expect(await footer.locator('.footer-action').evaluateAll(items=>items.map(item=>item.textContent.trim()))).toEqual(['Backup JSON','Importar backup','Relatório mensal','Arquivo de recuperação','Limpar dados']);
  const downloadPromise=page.waitForEvent('download');
  await footer.getByRole('button',{name:'Backup JSON'}).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^fintrack-backup-.*\.json$/);
});

test('central administrativa permanece acessível durante a transição',async({page})=>{
  const details=page.locator('.backup-panel');
  await details.locator('summary').click();
  await expect(details.getByRole('button',{name:'Exportar tudo (JSON)'})).toBeVisible();
  await expect(details.getByText('Backups recentes')).toBeVisible();
});
