const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();
  await page.getByRole('button',{name:'Agenda',exact:true}).click();
});

test('agenda alterna calendário e lista, filtra e abre o painel diário',async({page})=>{
  const date=await page.locator('#agenda-mes').inputValue();
  await page.evaluate(month=>{
    const data=FinTrackState.getState(),account=data.contas[0];
    data.lancamentos=[{id:'agenda-entry',descricao:'Conta da agenda',tipo:'Despesa',valor:12500,data:`${month}-10`,dataVencimento:`${month}-10`,status:'Pendente',contaId:account.id,categoriaId:'cat-contas'}];
    FinTrackState.replaceState(data);render();
  },date);
  await expect(page.getByRole('tab',{name:'Calendário'})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:/10 de .*1 evento/}).click();
  await expect(page.getByRole('dialog')).toContainText('Conta da agenda');
  await expect(page.getByRole('button',{name:'Marcar como pago'})).toBeVisible();
  await page.getByRole('button',{name:'Fechar detalhes do dia'}).click();
  await page.getByRole('tab',{name:'Lista'}).click();
  await expect(page.getByRole('cell',{name:'Conta da agenda'})).toBeVisible();
  await page.getByLabel('Tipo').selectOption('receita');
  await expect(page.getByText('Agenda vazia')).toBeVisible();
});

test('baixa da agenda reutiliza o serviço transacional',async({page})=>{
  const date=await page.locator('#agenda-mes').inputValue();
  await page.evaluate(month=>{const data=FinTrackState.getState();data.lancamentos=[{id:'agenda-pay',descricao:'Pagamento seguro',tipo:'Despesa',valor:9900,data:`${month}-12`,status:'Pendente',contaId:data.contas[0].id,categoriaId:'cat-contas'}];FinTrackState.replaceState(data);render();},date);
  await page.getByRole('button',{name:/12 de .*1 evento/}).click();
  await page.getByRole('button',{name:'Marcar como pago'}).click();
  expect(await page.evaluate(()=>FinTrackState.getState().lancamentos.find(item=>item.id==='agenda-pay').status)).toBe('Pago');
});
