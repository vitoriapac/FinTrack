const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.clock.install({time:new Date('2026-09-15T12:00:00-03:00')});
  await page.goto('/');
  await page.evaluate(()=>{
    const data=criarDadosDemo(),account=data.contas[0].id,other=data.contas[1].id,category=data.categorias.find(item=>item.tipo==='Saída').id;
    data.lancamentos=[
      {id:'statement-income',data:'2026-09-01',descricao:'Salário',tipo:'Receita',tipoOperacao:'receita',valor:10000,status:'Pago',contaId:account},
      {id:'statement-expense',data:'2026-09-02',descricao:'Mercado',tipo:'Despesa',tipoOperacao:'despesa',valor:2500,status:'Pago',contaId:account,categoriaId:category},
      {id:'statement-investment',data:'2026-09-03',descricao:'Aporte',tipo:'Despesa',tipoOperacao:'investimento',movimentoInvestimento:'aporte',valor:1000,status:'Pago',contaId:account},
      {id:'statement-transfer-out',data:'2026-09-04',descricao:'Reserva mensal',tipo:'Despesa',tipoOperacao:'transferencia',movimentoTransferencia:'saida',valor:500,status:'Pago',contaId:account,contaDestinoId:other},
      {id:'statement-transfer-in',data:'2026-09-04',descricao:'Reserva mensal',tipo:'Receita',tipoOperacao:'transferencia',movimentoTransferencia:'entrada',valor:500,status:'Pago',contaId:other,contaOrigemId:account},
      {id:'statement-card',data:'2026-09-05',descricao:'Pagamento da fatura',tipo:'Despesa',tipoOperacao:'pagamento_cartao',valor:300,status:'Pago',contaId:account},
      {id:'statement-pending',data:'2026-09-20',descricao:'Conta de luz',tipo:'Despesa',tipoOperacao:'despesa',valor:1200,status:'Pendente',contaId:account,categoriaId:category},
      {id:'statement-old',data:'2026-08-31',descricao:'Mês anterior',tipo:'Receita',tipoOperacao:'receita',valor:9000,status:'Pago',contaId:account},
    ];
    FinTrackState.replaceState(data);setView('extrato');
  });
});

test('extrato consolida tipos sem duplicar transferências ou pagamentos de fatura',async({page})=>{
  await expect(page.getByRole('heading',{name:'Extrato financeiro'})).toBeVisible();
  await expect(page.locator('.statement-metrics')).toContainText('R$ 105,00');
  await expect(page.locator('.statement-metrics')).toContainText('R$ 43,00');
  await expect(page.locator('.statement-metrics')).toContainText('R$ 62,00');
  await expect(page.locator('.statement-metrics')).toContainText('R$ 75,00');
  await expect(page.locator('.statement-pending-summary')).toContainText('R$ 12,00 em saídas');
  await expect(page.locator('.statement-pending-summary')).toContainText('R$ 50,00');
  await expect(page.locator('.statement-method-note')).toContainText('pagamentos de cartão não duplicam');
  await expect(page.locator('.financial-ledger tbody tr')).toHaveCount(7);
  await expect(page.locator('.financial-ledger')).toContainText('− R$ 12,00');
});

test('filtros aplicam período, status e conta; erro de intervalo é anunciado',async({page})=>{
  await page.getByLabel('Status').selectOption('Pendente');
  await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page.locator('.financial-ledger tbody tr')).toHaveCount(1);
  await expect(page.locator('.financial-ledger')).toContainText('Conta de luz');
  await expect(page.locator('.financial-ledger')).not.toContainText('Salário');
  await page.getByLabel('Status').selectOption('todos');
  await page.locator('#statement-account').selectOption({index:1});
  await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page.locator('.financial-ledger')).not.toContainText('Transferência recebida');
  await expect(page.locator('.financial-ledger')).toContainText('Salário');
  await page.locator('#statement-from').fill('2026-09-25');
  await page.locator('#statement-to').fill('2026-09-01');
  await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page.getByRole('alert')).toContainText('anterior ou igual');
});

test('exporta CSV do recorte e abre o lançamento original',async({page})=>{
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Exportar extrato CSV'}).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^fintrack-extrato-2026-09-01-2026-09-30\.csv$/);
  await page.getByRole('button',{name:'Abrir lançamento Salário'}).click();
  await expect(page.getByRole('heading',{name:'Lançamentos'})).toBeVisible();
  await expect(page.locator('.transaction-table')).toContainText('Salário');
});
