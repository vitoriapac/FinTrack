const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();});

test('CSV bancário exige revisão, grava lote e permite desfazer',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  const file={name:'extrato.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Histórico;Débito;Crédito;ID transação\n21/09/2026;Mercado;12,84;;mov-1','utf8')};
  await page.locator('#bank-csv-file').setInputFiles(file);
  await expect(page.getByRole('dialog',{name:'Mapear extrato CSV'})).toBeVisible();
  await page.getByRole('button',{name:'Ver prévia'}).click();
  const dialog=page.getByRole('dialog',{name:'Revisar extrato CSV'});
  await expect(dialog).toContainText('Linha 2');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  await expect(dialog.getByRole('alert')).toContainText('categoria');
  await dialog.locator('[data-bank-category]').selectOption('cat-mercado');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.bank-batches')).toContainText('extrato.csv');
  expect(await page.evaluate(()=>state.importBatches[0].created.length)).toBe(1);
  await page.reload();
  if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('button',{name:'Desfazer lote'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Desfazer lote'}).click();
  await expect(page.locator('.bank-batches')).toContainText('desfeito');
  expect(await page.evaluate(()=>state.lancamentos.filter(item=>item.importBatchId).length)).toBe(0);
});

test('linha inválida pode ser corrigida na revisão antes de salvar',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.locator('#bank-csv-file').setInputFiles({name:'corrigir.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n31/02/2026;Compra;-12,84','utf8')});
  await page.getByRole('button',{name:'Ver prévia'}).click();
  let dialog=page.getByRole('dialog',{name:'Revisar extrato CSV'});
  await expect(dialog).toContainText('Linha 2 · Inválida');
  await dialog.getByText('Ajustar linha').click();
  await dialog.locator('[data-bank-edit-date]').fill('2026-02-28');
  await dialog.locator('[data-bank-apply-edit]').click();
  dialog=page.getByRole('dialog',{name:'Revisar extrato CSV'});
  await expect(dialog).toContainText('1 válida(s)');
  expect(await page.evaluate(()=>state.lancamentos.length)).toBe(0);
  await dialog.locator('[data-bank-action]').selectOption('import');
  await dialog.locator('[data-bank-category]').selectOption('cat-mercado');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(()=>state.lancamentos.find(item=>item.importBatchId)?.data)).toBe('2026-02-28');
});

test('reimportação pede decisão e vínculo manual preserva o lançamento anterior',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  const file={name:'repetido.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor;ID transação\n2026-09-21;Compra;-10,00;abc-1','utf8')};
  await page.locator('#bank-csv-file').setInputFiles(file);
  await page.getByRole('button',{name:'Ver prévia'}).click();
  await page.locator('[data-bank-category]').selectOption('cat-mercado');
  await page.getByRole('button',{name:'Salvar decisões'}).click();
  await page.locator('#bank-csv-file').setInputFiles(file);
  await page.getByRole('button',{name:'Ver prévia'}).click();
  const dialog=page.getByRole('dialog',{name:'Revisar extrato CSV'});
  await expect(dialog).toContainText('Possível correspondência');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Resolva');
  await dialog.locator('[data-bank-action]').selectOption('link');
  await dialog.locator('[data-bank-match]').selectOption({index:1});
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({entries:state.lancamentos.filter(item=>item.importBatchId).length,links:state.importBatches[1].linked.length}))).toEqual({entries:1,links:1});
});
