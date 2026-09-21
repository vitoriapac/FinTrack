const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();
  await page.locator('.nav-group-toggle').filter({hasText:'Planejar'}).click();
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
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
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

test('inteligência diária alterna dimensões e explica o dia',async({page})=>{
  const month=await page.locator('#agenda-mes').inputValue();
  await page.evaluate(month=>{const data=FinTrackState.getState();data.lancamentos=[{id:'daily-paid',descricao:'Mercado confirmado',tipo:'Despesa',valor:15000,data:`${month}-08`,status:'Pago',contaId:data.contas[0].id,categoriaId:'cat-mercado'}];data.planejamentos={[month]:{orcamentos:{'cat-mercado':30000}}};FinTrackState.replaceState(data);render();},month);
  await expect(page.getByText('Ritmo do orçamento',{exact:true}).first()).toBeVisible();
  await page.getByLabel('Visualização').selectOption('gastos');
  await page.getByLabel('Categoria').selectOption('cat-mercado');
  await page.locator(`[data-agenda-day="${month}-08"]`).click();
  await expect(page.getByRole('dialog')).toContainText('Gasto confirmado');
  await expect(page.getByRole('dialog')).toContainText('Mercado');
  await expect(page.getByRole('dialog')).toContainText('R$ 150,00');
  await page.getByRole('button',{name:'Fechar detalhes do dia'}).click();
  await page.getByLabel('Visualização').selectOption('pressao');
  await expect(page.locator(`[data-agenda-day="${month}-08"]`)).toHaveClass(/heat-level-/);
});
