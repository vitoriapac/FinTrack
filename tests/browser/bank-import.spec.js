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

test('OFX bancário em BRL usa a mesma revisão e preserva FITID',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  const ofx='OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>001<ACCTID>12345678</BANKACCTFROM><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260921120000<TRNAMT>-12.84<FITID>fit-1<NAME>Mercado</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
  await page.locator('#bank-ofx-file').setInputFiles({name:'banco.ofx',mimeType:'application/x-ofx',buffer:Buffer.from(ofx,'utf8')});
  await expect(page.getByRole('dialog',{name:'Selecionar extrato OFX'})).toContainText('conta final 5678');
  await page.getByRole('button',{name:'Ver prévia'}).click();
  const dialog=page.getByRole('dialog',{name:'Revisar extrato OFX'});
  await expect(dialog).toContainText('Mercado');
  await dialog.locator('[data-bank-category]').selectOption('cat-mercado');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({format:state.importBatches[0].format,sourceId:state.lancamentos.find(item=>item.importBatchId)?.importSource.sourceId}))).toEqual({format:'ofx',sourceId:'fit-1'});
});

test('regra local explica categoria sugerida no CSV',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('button',{name:'Regras de categoria'}).click();
  const rules=page.getByRole('dialog',{name:'Regras de categoria'});
  await rules.locator('#bank-rule-pattern').fill('mercado');
  await rules.locator('#bank-rule-category').selectOption('cat-mercado');
  await rules.getByRole('button',{name:'Adicionar regra'}).click();
  await rules.getByRole('button',{name:'Fechar'}).click();
  await page.locator('#bank-csv-file').setInputFiles({name:'regra.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Mercado Central;-10,00','utf8')});
  await page.getByRole('button',{name:'Ver prévia'}).click();
  const review=page.getByRole('dialog',{name:'Revisar extrato CSV'});
  await expect(review).toContainText('Regra local: descrição contém “mercado”');
  await expect(review.locator('[data-bank-category]')).toHaveValue('cat-mercado');
});

test('transferência confirmada incorpora movimento oposto e desfazer o restaura',async({page})=>{
  await page.evaluate(async()=>{FinTrackState.replaceState({...state,lancamentos:[...state.lancamentos,{id:'opposite-test',data:'2026-09-21',descricao:'Crédito já registrado',tipo:'Receita',contaId:'conta-beflex',categoriaId:'cat-receita',valor:1000,status:'Pago',tipoOperacao:'receita'}]});await saveData();});
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.locator('#bank-csv-file').setInputFiles({name:'transferencia.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Transferência própria;-10,00','utf8')});
  await page.getByRole('button',{name:'Ver prévia'}).click();
  const review=page.getByRole('dialog',{name:'Revisar extrato CSV'});
  await expect(review).toContainText('Movimento oposto de mesmo valor');
  await review.locator('[data-bank-action]').selectOption('transfer');
  await review.locator('[data-bank-counterpart]').selectOption('opposite-test');
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({entries:state.lancamentos.length,operations:state.operacoes.length,kind:state.lancamentos.find(item=>item.id==='opposite-test').tipoOperacao}))).toEqual({entries:2,operations:1,kind:'transferencia'});
  await page.getByRole('button',{name:'Desfazer lote'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Desfazer lote'}).click();
  expect(await page.evaluate(()=>({entries:state.lancamentos.length,operations:state.operacoes.length,kind:state.lancamentos.find(item=>item.id==='opposite-test').tipoOperacao}))).toEqual({entries:1,operations:0,kind:'receita'});
});
