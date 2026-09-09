const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();
});

test('navega por atalhos e abre a busca global',async({page})=>{
  await expect(page.getByRole('heading',{name:'O que fazer hoje'})).toBeVisible();
  await page.keyboard.press('Alt+Digit7');
  await expect(page.getByRole('heading',{name:'Metas financeiras'})).toBeVisible();
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('heading',{name:'Busca global'})).toBeVisible();
  await expect(page.getByPlaceholder(/Lançamentos, contas/)).toBeFocused();
});

test('mantém a navegação e ações principais acessíveis no mobile',async({page,isMobile})=>{
  test.skip(!isMobile,'Cenário específico do projeto mobile');
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Lançamentos'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Novo lançamento'})).toBeVisible();
  await expect(page.locator('.transaction-table')).toBeHidden();
});

test('não gera erros JavaScript na carga e navegação principal',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.locator('.nav-group-toggle').filter({hasText:'Mais'}).click();
  for(const label of ['Balanço','Histórico','Planejamento','Cartões','Dívidas','Auditoria','Cadastro']){
    await page.getByRole('button',{name:label,exact:true}).click();
  }
  expect(errors).toEqual([]);
});
