const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('histórico identifica lacunas, estatísticas e snapshots legados sem recalcular',async({page})=>{
  await page.evaluate(()=>{
    const data=FinTrackState.getState();
    data.fechamentos={
      '2026-01':{status:'fechado',fechadoEm:'2026-02-01T00:00:00.000Z',snapshot:{versao:2,receitas:100000,despesas:70000,investimentos:10000,resultado:20000,orcamentoDetalhado:[{categoriaNome:'Mercado legado',orcado:50000,realizado:30000,disponivel:20000}],contas:[],lancamentosDetalhados:[]}},
      '2026-03':{status:'fechado',fechadoEm:'2026-04-01T00:00:00.000Z',snapshot:{versao:3,receitas:200000,despesas:80000,investimentos:20000,resultado:100000,orcamentoDetalhado:[],contas:[],lancamentosDetalhados:[]}},
    };
    FinTrackState.replaceState(data);setView('historico');
  });
  await expect(page.getByRole('heading',{name:'Estatísticas dos fechamentos'})).toBeVisible();
  await expect(page.getByText(/Melhor mês:/)).toContainText('Março de 2026');
  await expect(page.getByText(/vs\. Janeiro de 2026, último mês fechado/).first()).toBeVisible();
  await page.locator('[data-action="select-closing"][data-key="2026-01"]').click();
  await expect(page.getByText('Snapshot legado',{exact:true})).toBeVisible();
  await expect(page.getByText('Indisponível').first()).toBeVisible();
  const stored=await page.evaluate(()=>FinTrackState.getState().fechamentos['2026-01'].snapshot);
  expect(stored.comprometido).toBeUndefined();
  expect(stored.orcamentoDetalhado[0].pendente).toBeUndefined();
});

test('demonstração de seis meses preserva integridade e quatro fechamentos',async({page})=>{
  const result=await page.evaluate(()=>{
    const demo=criarDadosDemo(),months=[...new Set(demo.lancamentos.map(item=>item.data?.slice(0,7)).filter(Boolean))];
    return {months:months.length,closings:Object.keys(demo.fechamentos||{}).length,report:FinTrackValidation.validateData(demo),partial:(demo.pagamentosCartao||[])[0]?.valor,debtPayments:(demo.pagamentosDividas||[]).length,transfers:demo.lancamentos.filter(item=>item.tipoOperacao==='transferencia').length};
  });
  expect(result.months).toBeGreaterThanOrEqual(6);
  expect(result.closings).toBe(4);
  expect(result.partial).toBe(20000);
  expect(result.debtPayments).toBe(1);
  expect(result.transfers).toBe(2);
  expect(result.report.valid).toBe(true);
  expect(result.report.warnings).toEqual([]);
});

test('QA responsivo mantém a aplicação dentro de cinco viewports',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Matriz executada uma vez no Chromium desktop');
  const sizes=[[1440,900],[1024,768],[768,900],[390,844],[360,800]];
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    for(const view of ['Home','Lançamentos','Vencimentos','Agenda','Balanço','Patrimônio','Histórico','Planejamento','Projeção','Metas','Cartões','Dívidas','Auditoria','Cadastro']){
      const button=view==='Home'?page.getByRole('button',{name:'Abrir visão geral'}):page.getByRole('button',{name:view,exact:true});
      await button.click();
      const layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,mainRight:document.querySelector('main').getBoundingClientRect().right}));
      expect(layout.scrollWidth,`${view} em ${width}px não deve criar scroll global`).toBeLessThanOrEqual(layout.clientWidth+1);
      expect(layout.mainRight).toBeLessThanOrEqual(width+1);
    }
  }
});

test('QA estrutural mantém nomes acessíveis, ids únicos e console limpo',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-chromium','Auditoria estrutural executada uma vez');
  const failures=[];
  page.on('pageerror',error=>failures.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')failures.push(`console: ${message.text()}`);});
  for(const view of ['Home','Lançamentos','Vencimentos','Agenda','Balanço','Patrimônio','Histórico','Planejamento','Projeção','Metas','Cartões','Dívidas','Auditoria','Cadastro']){
    const button=view==='Home'?page.getByRole('button',{name:'Abrir visão geral'}):page.getByRole('button',{name:view,exact:true});
    await button.click();
    const audit=await page.evaluate(()=>{
      const visible=element=>Boolean(element.offsetWidth||element.offsetHeight||element.getClientRects().length);
      const ids=[...document.querySelectorAll('[id]')].map(element=>element.id),duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
      const unnamedControls=[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible).filter(control=>!control.getAttribute('aria-label')&&!control.getAttribute('aria-labelledby')&&!control.labels?.length).map(control=>control.id||control.outerHTML.slice(0,80));
      const unnamedButtons=[...document.querySelectorAll('button')].filter(visible).filter(button=>!button.textContent.trim()&&!button.getAttribute('aria-label')).length;
      return {duplicates:[...new Set(duplicates)],unnamedControls,unnamedButtons,h1:document.querySelectorAll('main h1').length};
    });
    expect(audit.duplicates,`${view}: ids duplicados`).toEqual([]);
    expect(audit.unnamedControls,`${view}: campos sem nome acessível`).toEqual([]);
    expect(audit.unnamedButtons,`${view}: botões sem nome acessível`).toBe(0);
    expect(audit.h1,`${view}: deve existir um título principal`).toBe(1);
  }
  await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
  await page.getByRole('button',{name:'Novo lançamento'}).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal','true');
  const dialogAudit=await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"] input,[role="dialog"] select,[role="dialog"] textarea')].filter(control=>!control.labels?.length&&!control.getAttribute('aria-label')).map(control=>control.id));
  expect(dialogAudit).toEqual([]);
  expect(failures).toEqual([]);
});
