const {test,expect}=require('@playwright/test');

const isoToday=()=>{
  const date=new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();
  await expect(page.getByRole('heading',{name:'O que fazer hoje'})).toBeVisible();
});

async function openEntries(page){
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Lançamentos'})).toBeVisible();
}

test('receita paga, despesa pendente e baixa atualizam saldo e projeção',async({page})=>{
  await openEntries(page);
  const initial=await page.evaluate(()=>{
    const data=FinTrackState.getState(),account=data.contas[0];
    return FinTrackCore.accountBalance(data,account,todayLocal());
  });

  await page.getByRole('button',{name:'Novo lançamento'}).click();
  await page.locator('#entry-tipo').selectOption('Receita');
  await page.locator('#entry-status').selectOption('Pago');
  await page.locator('#entry-descricao').fill('Receita E2E');
  await page.locator('#entry-valor').fill('500');
  await page.locator('#entry-save').click();
  expect(await page.evaluate(()=>FinTrackState.getState().lancamentos.some(item=>item.descricao==='Receita E2E'))).toBe(true);

  await page.getByRole('button',{name:'Novo lançamento'}).click();
  await page.locator('#entry-descricao').fill('Despesa pendente E2E');
  await page.locator('#entry-valor').fill('200');
  await page.locator('#entry-save').click();

  const pending=await page.evaluate(({initial})=>{
    const data=FinTrackState.getState(),account=data.contas[0],now=new Date(),summary=FinTrackCore.financialSummary(data,now.getMonth()+1,now.getFullYear(),todayLocal());
    const entry=data.lancamentos.find(item=>item.descricao==='Despesa pendente E2E');
    return {id:entry.id,balance:FinTrackCore.accountBalance(data,account,todayLocal()),projected:FinTrackCore.accountBalance(data,account,todayLocal())+summary.receitasPendentes-summary.despesasPendentes,expectedBalance:initial+50000};
  },{initial});
  expect(pending.balance).toBe(pending.expectedBalance);
  expect(pending.projected).toBe(pending.expectedBalance-20000);

  await page.locator(`[data-action="toggle-status"][data-id="${pending.id}"]:visible`).click();
  const paid=await page.evaluate(()=>{
    const data=FinTrackState.getState(),account=data.contas[0];
    return {balance:FinTrackCore.accountBalance(data,account,todayLocal()),status:data.lancamentos.find(item=>item.descricao==='Despesa pendente E2E').status};
  });
  expect(paid).toEqual({balance:pending.expectedBalance-20000,status:'Pago'});
});

test('transferência e investimento preservam resultado e movimentam as contas',async({page})=>{
  await openEntries(page);
  const before=await page.evaluate(()=>{
    const data=FinTrackState.getState();
    return {a:FinTrackCore.accountBalance(data,data.contas[0],todayLocal()),b:FinTrackCore.accountBalance(data,data.contas[1],todayLocal())};
  });

  await page.locator('.action-menu summary').click();
  await page.getByRole('button',{name:'Transferir entre contas'}).click();
  await page.locator('#tr-status').selectOption('Pago');
  await page.locator('#tr-valor').fill('30');
  await page.locator('#tr-save').click();

  await page.locator('.action-menu summary').click();
  await page.getByRole('button',{name:'Novo investimento'}).click();
  await page.locator('#inv-status').selectOption('Pago');
  await page.locator('#inv-ativo').fill('Tesouro E2E');
  await page.locator('#inv-instituicao').fill('Corretora E2E');
  await page.locator('#inv-valor').fill('40');
  await page.locator('#inv-save').click();

  await page.locator('.action-menu summary').click();
  await page.getByRole('button',{name:'Novo investimento'}).click();
  await page.locator('#inv-tipo').selectOption('resgate');
  await page.locator('#inv-status').selectOption('Pago');
  await page.locator('#inv-ativo').fill('Tesouro E2E');
  await page.locator('#inv-instituicao').fill('Corretora E2E');
  await page.locator('#inv-valor').fill('20');
  await page.locator('#inv-save').click();

  const result=await page.evaluate(()=>{
    const data=FinTrackState.getState(),now=new Date(),summary=FinTrackCore.financialSummary(data,now.getMonth()+1,now.getFullYear(),todayLocal());
    return {a:FinTrackCore.accountBalance(data,data.contas[0],todayLocal()),b:FinTrackCore.accountBalance(data,data.contas[1],todayLocal()),summary,valid:FinTrackValidation.validateData(data).valid};
  });
  expect(result.a).toBe(before.a-3000-4000+2000);
  expect(result.b).toBe(before.b+3000);
  expect(result.summary.resultadoRealizado).toBe(0);
  expect(result.summary.investimentosRealizados).toBe(2000);
  expect(result.valid).toBe(true);
});

test('cartão aceita pagamentos parciais, quitação e estorno sem duplicar despesa',async({page})=>{
  await page.evaluate(async({today})=>{
    let data=FinTrackState.getState();
    const account=data.contas[0],category=data.categorias.find(item=>item.tipo==='Saída'&&item.natureza!=='movimentacao');
    data=FinTrackServices.entities.upsert(data,'cartoes',{id:'card-e2e',nome:'Cartão E2E',bandeira:'Visa',limite:100000,fechamento:31,vencimento:28,ativo:true});
    data=FinTrackServices.entries.add(data,{id:'purchase-e2e',tipo:'Despesa',tipoOperacao:'despesa',data:today,descricao:'Compra cartão E2E',contaId:account.id,categoriaId:category.id,cartaoId:'card-e2e',valor:10000,status:'Pendente',fixa:false});
    FinTrackState.replaceState(data);await saveData();setView('cartoes');
  },{today:isoToday()});
  await expect(page.getByRole('heading',{name:'Cartões',exact:true})).toBeVisible();

  await page.locator('[data-action="pay-card"][data-id="card-e2e"]').click();
  await page.locator('#pay-card-account').selectOption({index:1});
  await page.locator('#pay-card-value').fill('40');
  await page.locator('#pay-card-save').click();
  let invoice=await page.evaluate(()=>{const data=FinTrackState.getState(),card=data.cartoes.find(item=>item.id==='card-e2e');return FinTrackCore.cardInvoice(data,card,new Date());});
  expect(invoice.outstanding).toBe(6000);

  await page.locator('[data-action="pay-card"][data-id="card-e2e"]').click();
  await page.locator('#pay-card-account').selectOption({index:1});
  await page.locator('#pay-card-save').click();
  invoice=await page.evaluate(()=>{const data=FinTrackState.getState(),card=data.cartoes.find(item=>item.id==='card-e2e');return FinTrackCore.cardInvoice(data,card,new Date());});
  expect(invoice.outstanding).toBe(0);
  expect(await page.evaluate(()=>{const data=FinTrackState.getState(),now=new Date();return FinTrackCore.financialSummary(data,now.getMonth()+1,now.getFullYear(),todayLocal()).despesasRealizadas;})).toBe(0);

  await page.locator('[data-action="reverse-card-payment"]').first().click();
  await page.locator('#cf-ok').click();
  const reversed=await page.evaluate(()=>{const data=FinTrackState.getState(),card=data.cartoes.find(item=>item.id==='card-e2e');return {invoice:FinTrackCore.cardInvoice(data,card,new Date()),valid:FinTrackValidation.validateData(data).valid};});
  expect(reversed.invoice.outstanding).toBeGreaterThan(0);
  expect(reversed.valid).toBe(true);
});

test('pagamento de dívida separa juros e amortização e pode ser estornado',async({page})=>{
  await page.evaluate(async({today})=>{
    const data=FinTrackServices.entities.upsert(FinTrackState.getState(),'dividas',{id:'debt-e2e',credor:'Banco E2E',saldo:100000,juros:1,parcelasRestantes:10,proximoVencimento:today,prioridade:'Alta'});
    FinTrackState.replaceState(data);await saveData();setView('dividas');
  },{today:isoToday()});
  await page.locator('[data-action="pay-divida"][data-id="debt-e2e"]').click();
  await page.locator('#pay-debt-account').selectOption({index:1});
  await page.locator('#pay-debt-value').fill('110');
  await page.locator('#pay-debt-save').click();

  const paid=await page.evaluate(()=>{const data=FinTrackState.getState(),payment=data.pagamentosDividas[0],debt=data.dividas.find(item=>item.id==='debt-e2e');return {interest:payment.juros,amortization:payment.amortizacao,balance:debt.saldo};});
  expect(paid).toEqual({interest:1000,amortization:10000,balance:90000});

  await page.locator('[data-action="reverse-debt-payment"]').click();
  await page.locator('#cf-ok').click();
  const reversed=await page.evaluate(()=>{const data=FinTrackState.getState();return {balance:data.dividas.find(item=>item.id==='debt-e2e').saldo,payments:data.pagamentosDividas.length,valid:FinTrackValidation.validateData(data).valid};});
  expect(reversed).toEqual({balance:100000,payments:0,valid:true});
});

test('fechamento preserva nomes históricos e armazenamento restaura o estado',async({page})=>{
  const result=await page.evaluate(async({today})=>{
    let data=FinTrackState.getState(),category=data.categorias.find(item=>item.tipo==='Saída'&&item.natureza!=='movimentacao'),account=data.contas[0];
    const originalName=category.nome,key=today.slice(0,7);
    data=FinTrackServices.entries.add(data,{id:'closing-e2e',tipo:'Despesa',tipoOperacao:'despesa',data:today,descricao:'Fechamento E2E',contaId:account.id,categoriaId:category.id,valor:2500,status:'Pago',fixa:false});
    const closing=FinTrackClosing.createSnapshot(data,key,{observacao:'Snapshot E2E'});
    data={...data,fechamentos:{...data.fechamentos,[key]:closing}};
    data=FinTrackServices.entities.upsert(data,'categorias',{...category,nome:'Categoria renomeada depois'});
    FinTrackState.replaceState(data);await saveData();
    const saved=await FinTrackStorage.get('fintrack-data-v1');
    FinTrackState.replaceState({...data,lancamentos:[]});
    FinTrackState.replaceState(saved);setView('historico');
    return {originalName,key,storedEntries:FinTrackState.getState().lancamentos.length,snapshotName:FinTrackState.getState().fechamentos[key].snapshot.lancamentosDetalhados.find(item=>item.id==='closing-e2e').categoriaNome};
  },{today:isoToday()});
  await expect(page.getByRole('heading',{name:'Histórico mensal'})).toBeVisible();
  await expect(page.getByText(result.originalName,{exact:true}).first()).toBeVisible();
  expect(result.snapshotName).toBe(result.originalName);
  expect(result.storedEntries).toBeGreaterThan(0);
});
