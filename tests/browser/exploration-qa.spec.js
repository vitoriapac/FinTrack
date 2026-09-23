const {test,expect}=require('@playwright/test');
test.setTimeout(90000);
test('matriz 4.1 mantém telas legíveis sem rolagem horizontal global',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Matriz de viewports executada uma vez');
  await page.clock.install({time:new Date('2026-09-15T12:00:00-03:00')});
  await page.goto('/');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [width,height] of [[1440,900],[1280,800],[768,1024],[390,844]]){
    await page.setViewportSize({width,height});
    for(const view of ['home','lancamentos','extrato','agenda','planejamento','analises','patrimonio','historico','projecao','simuladores']){
      await page.evaluate(view=>{FinTrackState.replaceState(criarDadosDemo());setView(view);},view);
      await expect(page.locator('#main h1').first()).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${view} em ${width}px`).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('alerta de vencimento abre o dia correspondente na Agenda',async({page})=>{
  await page.clock.install({time:new Date('2026-09-15T12:00:00-03:00')});
  await page.goto('/');
  await page.evaluate(()=>{const data=criarDadosDemo();data.lancamentos.push({id:'route-late',descricao:'Conta vencida para rota',tipo:'Despesa',tipoOperacao:'despesa',categoriaId:data.categorias.find(item=>item.tipo==='Saída').id,contaId:data.contas[0].id,data:'2026-08-01',dataVencimento:'2026-08-10',valor:15000,status:'Pendente'});FinTrackState.replaceState(data);setView('home');});
  await page.locator('.insight-card').filter({hasText:'Vencimentos atrasados'}).getByRole('button',{name:'Ver detalhes'}).click();
  await expect(page.locator('#agenda-mes')).toHaveValue('2026-08');
  await expect(page.getByRole('dialog')).toContainText('Conta vencida para rota');
  await expect(page.locator('#agenda-close-day')).toBeFocused();
});

test('tooltip do ritmo mostra diferença e painel diário separa certeza dos valores',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{FinTrackState.replaceState(criarDadosDemo());setView('agenda');});
  const mark=page.locator('[data-chart="multi-line"] [data-chart-value]').first();await mark.focus();
  await expect(page.locator('[data-chart="multi-line"] .chart-tooltip')).toContainText('Diferença para o ritmo');
  const day=page.locator('[data-agenda-day]').first();await day.click();
  await expect(page.locator('.agenda-day-reading')).toContainText('apenas gastos pagos são confirmados');
});

test('quatro leituras da Agenda alternam por clique e teclado',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{FinTrackState.replaceState(criarDadosDemo());setView('agenda');});
  for(const mode of ['gastos','saldo','orcamento','pressao']){
    const button=page.locator(`[data-agenda-layer="${mode}"]`);await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.agenda-calendar')).toHaveClass(new RegExp(`mode-${mode}`));
  }
  await page.locator('[data-agenda-layer="saldo"]').focus();await page.keyboard.press('Space');
  await expect(page.locator('[data-agenda-layer="saldo"]')).toHaveAttribute('aria-pressed','true');
});
