const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();});
async function selectFile(page,format,file){
  await page.getByRole('button',{name:'Importar extrato'}).click();
  await page.locator(format==='ofx'?'#bank-ofx-file':'#bank-csv-file').setInputFiles(file);
  await expect(page.getByRole('heading',{name:'Confirmar conta'})).toBeVisible();
  await page.locator('#bank-account').selectOption({index:1});
  await page.getByRole('button',{name:'Confirmar conta'}).click();
}
async function analyze(page){await page.getByRole('button',{name:'Analisar linhas'}).click();return page.locator('.bank-import-screen');}

test('conta exige confirmação e período CSV só é salvo quando informado',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('button',{name:'Importar extrato'}).click();
  await page.locator('#bank-csv-file').setInputFiles({name:'periodo.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Mercado;-10,00','utf8')});
  await page.getByRole('button',{name:'Confirmar conta'}).click();
  await expect(page.locator('#bank-account-error')).toContainText('Selecione');
  await page.locator('#bank-account').selectOption({index:1});
  await page.getByRole('button',{name:'Confirmar conta'}).click();
  await page.locator('#bank-period-from').fill('2026-09-01');
  await page.locator('#bank-period-to').fill('2026-09-30');
  const review=await analyze(page);
  await review.locator('[data-bank-category]').selectOption('cat-mercado');
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>state.importBatches[0].period)).toEqual({from:'2026-09-01',to:'2026-09-30',kind:'confirmed'});
});

test('caixa de exceções permite ignorar em lote com confirmação sem decidir vínculos automaticamente',async({page})=>{
  await page.evaluate(async()=>{FinTrackState.replaceState({...state,lancamentos:[...state.lancamentos,{id:'existing-import-check',data:'2026-09-21',descricao:'Mercado',tipo:'Despesa',contaId:state.contas[0].id,categoriaId:'cat-mercado',valor:1000,status:'Pago',tipoOperacao:'despesa'}]});await saveData();});
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await selectFile(page,'csv',{name:'lote.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Mercado;-10,00\n2026-09-22;Farmácia;-5,00','utf8')});
  const review=await analyze(page);
  await expect(review).toContainText('1 pendente(s)');
  await review.getByRole('button',{name:/Caixa de exceções/}).click();
  await expect(review.locator('[data-bank-row]')).toHaveCount(1);
  await review.getByRole('button',{name:'Selecionar página'}).click();
  await review.getByRole('button',{name:'Ignorar selecionadas'}).click();
  await expect(page.getByRole('dialog',{name:'Confirmar'})).toContainText('Ignorar 1 linha');
  await page.getByRole('dialog',{name:'Confirmar'}).getByRole('button',{name:'Ignorar linhas'}).click();
  await expect(review).toContainText('0 pendente(s)');
  await review.getByRole('button',{name:/Prontas/}).click();
  await review.locator('[data-bank-category]').selectOption('cat-mercado');
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({ignored:state.importBatches[0].ignored.length,created:state.importBatches[0].created.length}))).toEqual({ignored:1,created:1});
});

test('correspondência de data próxima é provável e só vincula após decisão manual',async({page})=>{
  await page.evaluate(async()=>{FinTrackState.replaceState({...state,lancamentos:[...state.lancamentos,{id:'near-match',data:'2026-09-21',descricao:'Mercado Central',tipo:'Despesa',contaId:state.contas[0].id,categoriaId:'cat-mercado',valor:1000,status:'Pago',tipoOperacao:'despesa'}]});await saveData();});
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await selectFile(page,'csv',{name:'proximo.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-22;Mercado Central;-10,00','utf8')});
  const review=await analyze(page);
  await expect(review).toContainText('1 provável');
  await expect(review.locator('[data-bank-action]')).toHaveValue('review');
  await review.locator('[data-bank-action]').selectOption('link');
  await review.locator('[data-bank-match]').selectOption('near-match');
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({linked:state.importBatches[0].linked.length,created:state.importBatches[0].created.length}))).toEqual({linked:1,created:0});
});

test('CSV bancário exige revisão, grava lote e permite desfazer',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  const file={name:'extrato.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Histórico;Débito;Crédito;ID transação\n21/09/2026;Mercado;12,84;;mov-1','utf8')};
  await selectFile(page,'csv',file);
  await expect(page.getByRole('heading',{name:'Configurar CSV'})).toBeVisible();
  const dialog=await analyze(page);
  await expect(dialog).toContainText('Linha 2');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  await expect(dialog.getByRole('alert')).toContainText('categoria');
  await dialog.locator('[data-bank-category]').selectOption('cat-mercado');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.bank-batches')).toContainText('extrato.csv');
  expect(await page.evaluate(()=>state.importBatches[0].created.length)).toBe(1);
  await page.getByRole('button',{name:'Detalhes'}).click();
  const detail=page.getByRole('dialog',{name:'Detalhes da importação'});
  await expect(detail).toContainText('Período coberto desconhecido');
  await expect(detail).toContainText('Linha 2 · Criado');
  if(test.info().project.name==='mobile-chromium'){
    const box=await detail.boundingBox(),viewport=page.viewportSize();
    expect(Math.abs(box.y+box.height-viewport.height)).toBeLessThan(3);
  }
  await detail.getByRole('button',{name:'Fechar'}).click();
  await page.reload();
  if(await page.locator('#nav-mobile-toggle').isVisible())await page.locator('#nav-mobile-toggle').click();
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('button',{name:'Desfazer lote'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Desfazer lote'}).click();
  await expect(page.locator('.bank-batches')).toContainText('desfeito');
  expect(await page.evaluate(()=>state.lancamentos.filter(item=>item.importBatchId).length)).toBe(0);
});

test('desfazer bloqueado enumera lançamento alterado sem modificar o lote',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await selectFile(page,'csv',{name:'alterado.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Mercado;-10,00','utf8')});
  const review=await analyze(page);
  await review.locator('[data-bank-category]').selectOption('cat-mercado');
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  await page.evaluate(async()=>{const entries=state.lancamentos.map(item=>item.importBatchId?{...item,descricao:'Mercado ajustado'}:item);FinTrackState.replaceState({...state,lancamentos:entries});await saveData();render();});
  await page.getByRole('button',{name:'Desfazer lote'}).click();
  const detail=page.getByRole('dialog',{name:'Detalhes da importação'});
  await expect(detail).toContainText('Linha 2: lançamentos alterados ou removidos');
  await expect(detail.getByRole('button',{name:'Desfazer lote'})).toHaveCount(0);
  expect(await page.evaluate(()=>({status:state.importBatches[0].status,entries:state.lancamentos.filter(item=>item.importBatchId).length}))).toEqual({status:'active',entries:1});
});

test('cobertura mostra somente lacuna entre períodos confirmados',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  for(const [name,date,from,to] of [['primeiro.csv','2026-09-05','2026-09-01','2026-09-10'],['segundo.csv','2026-09-17','2026-09-15','2026-09-20']]){
    await selectFile(page,'csv',{name,mimeType:'text/csv',buffer:Buffer.from(`Data;Descrição;Valor\n${date};${name};-10,00`,'utf8')});
    await page.locator('#bank-period-from').fill(from);
    await page.locator('#bank-period-to').fill(to);
    const review=await analyze(page);
    await review.locator('[data-bank-category]').selectOption('cat-mercado');
    await review.getByRole('button',{name:'Salvar decisões'}).click();
  }
  await expect(page.locator('.bank-coverage')).toContainText('2026-09-11 a 2026-09-14');
  await expect(page.locator('.bank-coverage')).toContainText('Um dia sem movimentação não é uma lacuna');
});

test('prévia de mil linhas mantém paginação e salva sem renderizar toda a lista',async({page})=>{
  test.slow();
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  const rows=Array.from({length:1000},(_,index)=>`2026-09-${String(index%28+1).padStart(2,'0')};Compra ${index};-10,00`);
  await selectFile(page,'csv',{name:'mil.csv',mimeType:'text/csv',buffer:Buffer.from(['Data;Descrição;Valor',...rows].join('\n'),'utf8')});
  const review=await analyze(page);
  await expect(review).toContainText('1000 linha(s)');
  await expect(review.locator('[data-bank-row]')).toHaveCount(40);
  await review.locator('#bank-bulk-debit').selectOption('cat-mercado');
  await review.getByRole('button',{name:'Aplicar categorias'}).click();
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>state.importBatches[0].created.length)).toBe(1000);
});

test('linha inválida pode ser corrigida na revisão antes de salvar',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await selectFile(page,'csv',{name:'corrigir.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n31/02/2026;Compra;-12,84','utf8')});
  let dialog=await analyze(page);
  await expect(dialog).toContainText('Linha 2 · Inválida');
  await dialog.getByText('Ajustar linha').click();
  await dialog.locator('[data-bank-edit-date]').fill('2026-02-28');
  await dialog.locator('[data-bank-apply-edit]').click();
  dialog=page.locator('.bank-import-screen');
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
  await selectFile(page,'csv',file);
  await analyze(page);
  await page.locator('[data-bank-category]').selectOption('cat-mercado');
  await page.getByRole('button',{name:'Salvar decisões'}).click();
  await selectFile(page,'csv',file);
  const dialog=await analyze(page);
  await expect(dialog).toContainText('Correspondências: 1 forte');
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
  await selectFile(page,'ofx',{name:'banco.ofx',mimeType:'application/x-ofx',buffer:Buffer.from(ofx,'utf8')});
  await expect(page.locator('.bank-import-screen')).toContainText('conta final 5678');
  const dialog=await analyze(page);
  await expect(dialog).toContainText('Mercado');
  await dialog.locator('[data-bank-category]').selectOption('cat-mercado');
  await dialog.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({format:state.importBatches[0].format,sourceId:state.lancamentos.find(item=>item.importBatchId)?.importSource.sourceId,identityKey:state.lancamentos.find(item=>item.importBatchId)?.importSource.identityKey,accountLeaked:JSON.stringify(state.importBatches[0]).includes('12345678')}))).toMatchObject({format:'ofx',sourceId:'fit-1',accountLeaked:false});
  expect(await page.evaluate(()=>state.lancamentos.find(item=>item.importBatchId)?.importSource.identityKey)).toMatch(/^v1-[0-9a-f]{16}\|fit-1$/);
});

test('regra local explica categoria sugerida no CSV',async({page})=>{
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('button',{name:'Regras de categoria'}).click();
  const rules=page.locator('.section').filter({has:page.getByRole('heading',{name:'Regras de categoria'})});
  await expect(page.getByRole('heading',{name:'Configurações'})).toBeVisible();
  await rules.locator('#bank-rule-pattern').fill('PIX');
  await rules.getByRole('button',{name:'Adicionar regra'}).click();
  await expect(rules.locator('#bank-rule-error')).toContainText('genérico');
  await rules.locator('#bank-rule-pattern').fill('mercado');
  await rules.locator('#bank-rule-category').selectOption('cat-mercado');
  await rules.getByRole('button',{name:'Adicionar regra'}).click();
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await selectFile(page,'csv',{name:'regra.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Mercado Central;-10,00','utf8')});
  const review=await analyze(page);
  await expect(review).toContainText('Regra local explícita: descrição contém “mercado”');
  await expect(review.locator('[data-bank-category]')).toHaveValue('cat-mercado');
});

test('transferência confirmada incorpora movimento oposto e desfazer o restaura',async({page})=>{
  await page.evaluate(async()=>{FinTrackState.replaceState({...state,lancamentos:[...state.lancamentos,{id:'opposite-test',data:'2026-09-21',descricao:'Crédito já registrado',tipo:'Receita',contaId:'conta-beflex',categoriaId:'cat-receita',valor:1000,status:'Pago',tipoOperacao:'receita'}]});await saveData();});
  await page.locator('.nav-group-toggle').filter({hasText:'Movimentações'}).click();
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await selectFile(page,'csv',{name:'transferencia.csv',mimeType:'text/csv',buffer:Buffer.from('Data;Descrição;Valor\n2026-09-21;Transferência própria;-10,00','utf8')});
  const review=await analyze(page);
  await expect(review).toContainText('Movimento oposto de mesmo valor');
  await review.locator('[data-bank-action]').selectOption('transfer');
  await review.locator('[data-bank-counterpart]').selectOption('opposite-test');
  await review.getByRole('button',{name:'Salvar decisões'}).click();
  expect(await page.evaluate(()=>({entries:state.lancamentos.length,operations:state.operacoes.length,kind:state.lancamentos.find(item=>item.id==='opposite-test').tipoOperacao}))).toEqual({entries:2,operations:1,kind:'transferencia'});
  await page.getByRole('button',{name:'Desfazer lote'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Desfazer lote'}).click();
  expect(await page.evaluate(()=>({entries:state.lancamentos.length,operations:state.operacoes.length,kind:state.lancamentos.find(item=>item.id==='opposite-test').tipoOperacao}))).toEqual({entries:1,operations:0,kind:'receita'});
});
