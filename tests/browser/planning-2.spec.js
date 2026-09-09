const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();await page.locator('.nav-group-toggle').evaluateAll(buttons=>buttons.forEach(button=>button.click()));});
test('agenda, patrimônio e planejamento futuro usam os contratos do 2.0',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.evaluate(()=>{const data=FinTrackState.getState();data.lancamentos.push({id:'future',tipo:'Despesa',tipoOperacao:'despesa',descricao:'Seguro futuro',data:'2026-12-10',dataVencimento:'2026-12-10',valor:12000,status:'Pendente',contaId:data.contas[0].id,categoriaId:data.categorias[0].id});data.ativosInvestimento.push({id:'asset',nome:'Tesouro Direto',instituicao:'Corretora',valorAtual:50000,atualizadoEm:'2026-09-01T00:00:00.000Z'});FinTrackState.replaceState(data);});
  await page.getByRole('button',{name:'Agenda',exact:true}).click();await page.locator('#agenda-mes').fill('2026-12');await page.getByRole('tab',{name:'Lista'}).click();await expect(page.getByText('Seguro futuro')).toBeVisible();
  await page.getByRole('button',{name:'Patrimônio',exact:true}).click();await expect(page.getByText('Tesouro Direto')).toBeVisible();await expect(page.getByText('Somente snapshots v4')).toBeVisible();
  await page.getByRole('button',{name:'Planejamento',exact:true}).click();await page.locator('#planejamento-mes').selectOption('2026-10');await expect(page.getByText('Out de 2026')).toBeVisible();
  await page.getByRole('button',{name:'Projeção',exact:true}).click();await expect(page.getByRole('heading',{name:'Fluxo projetado'})).toBeVisible();await expect(page.getByText('Não altera dados reais')).toBeVisible();
  expect(errors).toEqual([]);
});
