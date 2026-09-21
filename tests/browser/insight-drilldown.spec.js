const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>{FinTrackState.replaceState(criarDadosDemo());setView('home');});});

test('meta, dívida e cartão identificados recebem foco e permitem voltar',async({page})=>{
  await page.evaluate(()=>{const data=FinTrackState.getState();data.metas=[{id:'goal-route',nome:'Reserva para viagem',alvo:50000,saldoInicial:0,prazo:'2027-12-31'}];FinTrackState.replaceState(data);navigateToInsight({view:'metas',entityId:'goal-route'});});
  await expect(page.locator('.panel-layout .data-panel').filter({hasText:'Reserva para viagem'})).toBeFocused();
  await page.getByRole('button',{name:'Voltar à análise'}).click();
  await expect(page.getByRole('heading',{name:/Olá/})).toBeFocused();
  await page.evaluate(()=>navigateToInsight({view:'dividas',entityId:'demo-debt'}));
  await expect(page.locator('tr').filter({has:page.locator('[data-action="pay-divida"][data-id="demo-debt"]')})).toBeFocused();
  await page.getByRole('button',{name:'Voltar à análise'}).click();
  await page.evaluate(()=>navigateToInsight({view:'cartoes',entityId:'demo-card'}));
  await expect(page.locator('tr').filter({has:page.locator('[data-action="pay-card"][data-id="demo-card"]')})).toBeFocused();
});

test('item removido abre seção com aviso sem focar outra entidade',async({page})=>{
  await page.evaluate(()=>navigateToInsight({view:'dividas',entityId:'debt-deleted'}));
  await expect(page.locator('.insight-return')).toContainText('não está mais disponível');
  await expect(page.getByRole('heading',{name:'Dívidas',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Voltar à análise'}).click();
  await expect(page.getByRole('heading',{name:/Olá/})).toBeVisible();
});

test('lançamento de outro mês aparece mesmo além do limite da lista',async({page,isMobile})=>{
  const id=await page.evaluate(()=>FinTrackState.getState().lancamentos.find(item=>item.descricao==='Internet residencial')?.id);
  await page.evaluate(id=>navigateToInsight({view:'lancamentos',entityId:id}),id);
  const item=isMobile?page.locator(`.transaction-card [data-action="edit-lanc"][data-id="${id}"]`).locator('xpath=ancestor::article'):page.locator(`.transaction-table [data-action="edit-lanc"][data-id="${id}"]`).locator('xpath=ancestor::tr');
  await expect(item).toBeFocused();
});
