function attachViewHandlers(){
  const main = document.getElementById('main');

  FinTrackScreenEvents.attach(main);

  main.querySelectorAll('[data-action="go-lancamentos"]').forEach(b => b.onclick = () => setView('lancamentos'));
  main.querySelectorAll('[data-action="select-closing"]').forEach(button=>button.onclick=()=>{historicoMes=button.dataset.key;render();});
  main.querySelectorAll('[data-action="export-closing-pdf"]').forEach(button=>button.onclick=()=>FinTrackPdfReport.open(button.dataset.key,state.fechamentos[button.dataset.key]));
  const btnHomeNovo = document.getElementById('btn-home-novo');
  if(btnHomeNovo) btnHomeNovo.onclick = () => FinTrackForms.open('lancamento',null);
  const demoRestore=document.getElementById('btn-demo-restaurar');
  if(demoRestore) demoRestore.onclick=restaurarDadosAnteriores;
  const btnMostrarLanc = document.getElementById('btn-mostrar-lancamentos');
  if(btnMostrarLanc) btnMostrarLanc.onclick = () => { lancMostrarTodos = !lancMostrarTodos; render(); };

  // Lançamentos
  const btnNovo = document.getElementById('btn-novo-lancamento');
  if(btnNovo) btnNovo.onclick = () => FinTrackForms.open('lancamento',null);
  const btnTransferencia = document.getElementById('btn-nova-transferencia');
  if(btnTransferencia) btnTransferencia.onclick = () => FinTrackForms.open('transferencia');
  const btnInvestimento = document.getElementById('btn-novo-investimento');
  if(btnInvestimento) btnInvestimento.onclick = () => FinTrackForms.open('investimento');

  main.querySelectorAll('[data-action="edit-lanc"]').forEach(b => b.onclick = () => {
    let lanc = state.lancamentos.find(l => l.id === b.dataset.id);
    if(impedirAlteracaoMes(lanc?.data)) return;
    if(lanc?.tipoOperacao==='transferencia'){
      lanc=state.lancamentos.find(l=>l.operacaoId===lanc.operacaoId && l.movimentoTransferencia==='saida') || lanc;
      FinTrackForms.open('transferencia',lanc);
      return;
    }
    const serie=state.lancamentos.filter(x=>x.serieId && x.serieId===lanc?.serieId);
    if(serie.length>1) lanc={...lanc,_editarSerie:confirm('Este lançamento faz parte de uma série. OK edita toda a série; Cancelar edita somente este item.')};
    FinTrackForms.open('lancamento',lanc);
  });
  main.querySelectorAll('[data-action="del-lanc"]').forEach(b => b.onclick = () => {
    const lanc=state.lancamentos.find(l=>l.id===b.dataset.id);
    if(impedirAlteracaoMes(lanc?.data)) return;
    const linked=lanc?.tipoOperacao==='transferencia' && lanc.operacaoId
      ? state.lancamentos.filter(l=>l.operacaoId===lanc.operacaoId)
      : state.lancamentos.filter(l=>l.serieId && l.serieId===lanc?.serieId);
    let modo='item';
    if(lanc?.tipoOperacao==='transferencia' && linked.length>1){
      if(!confirm('Esta transferência possui duas movimentações vinculadas. Mover as duas para a lixeira?')) return;
      modo='serie';
    }else if(linked.length>1){
      if(lanc.serieTipo==='recorrencia'){
        const escolha=prompt('Esta recorrência possui '+linked.length+' ocorrências. Digite 1 para excluir toda a série, 2 para excluir esta e as próximas ocorrências, ou 3 para excluir somente esta:','2');
        modo=escolha==='1'?'serie':escolha==='2'?'futuro':'item';
      }else{
        modo=confirm(`Este lançamento faz parte de uma série com ${linked.length} itens. Clique em OK para excluir toda a série ou em Cancelar para excluir somente este item.`)?'serie':'item';
      }
    }
    confirmAction(modo==='serie' ? 'Mover toda a série para a lixeira?' : modo==='futuro' ? 'Mover esta e as próximas ocorrências para a lixeira?' : 'Mover este lançamento para a lixeira?', async () => {
      const result=FinTrackServices.entries.trash(state,lanc.id,modo);
      FinTrackState.replaceState(result.state);
      registrarHistorico('exclusao',`${result.items.length} lançamento(s) movido(s) para a lixeira`,{lancamentoIds:result.items.map(item=>item.id),operacaoId:lanc.operacaoId||null,serieId:lanc.serieId||null});
      await saveData();
      render();
    });
  });
  main.querySelectorAll('[data-action="toggle-serie"]').forEach(b => b.onclick = () => alternarSerie(b.dataset.id));
  main.querySelectorAll('[data-action="toggle-status"]').forEach(b => b.onclick = async () => {
    const lanc = state.lancamentos.find(l => l.id === b.dataset.id);
    if(impedirAlteracaoMes(lanc?.data)) return;
    const result=FinTrackServices.entries.toggleStatus(state,lanc.id);
    FinTrackState.replaceState(result.state);
    registrarHistorico('alteracao_status',`Status alterado para ${result.status}: ${lanc.descricao}`,{lancamentoIds:result.items.map(item=>item.id),operacaoId:lanc.operacaoId||null});
    await saveData();
    render();
  });

  FinTrackFilters.bind(main);
  const agendaFilter=document.getElementById('agenda-tipo');if(agendaFilter)agendaFilter.onchange=()=>{agendaTipo=agendaFilter.value;agendaDiaSelecionado=null;render();};
  const agendaMonth=document.getElementById('agenda-mes');if(agendaMonth)agendaMonth.onchange=()=>{agendaMes=agendaMonth.value;agendaDiaSelecionado=null;render();};
  const shiftAgenda=amount=>{agendaMes=addMonths(`${agendaMes}-01`,amount).slice(0,7);agendaDiaSelecionado=null;render();};
  const agendaPrev=document.getElementById('agenda-prev');if(agendaPrev)agendaPrev.onclick=()=>shiftAgenda(-1);
  const agendaNext=document.getElementById('agenda-next');if(agendaNext)agendaNext.onclick=()=>shiftAgenda(1);
  const agendaToday=document.getElementById('agenda-today');if(agendaToday)agendaToday.onclick=()=>{agendaMes=todayLocal().slice(0,7);agendaDiaSelecionado=todayLocal();render();};
  [['agenda-conta','contaId'],['agenda-cartao','cartaoId'],['agenda-divida','dividaId']].forEach(([id,key])=>{const field=document.getElementById(id);if(field)field.onchange=()=>{agendaFiltros[key]=field.value;agendaDiaSelecionado=null;render();};});
  const agendaInstallment=document.getElementById('agenda-parcela');if(agendaInstallment)agendaInstallment.onchange=()=>{agendaFiltros.parcela=agendaInstallment.checked;agendaDiaSelecionado=null;render();};
  main.querySelectorAll('[data-agenda-mode]').forEach(button=>button.onclick=()=>{agendaModo=button.dataset.agendaMode;agendaDiaSelecionado=null;render();});
  main.querySelectorAll('[data-agenda-day]').forEach(button=>button.onclick=()=>{agendaDiaSelecionado=button.dataset.agendaDay;render();document.getElementById('agenda-close-day')?.focus();});
  main.querySelectorAll('[data-agenda-open]').forEach(button=>button.onclick=()=>{const item=AgendaService.project(state,{start:`${agendaMes}-01`,end:addMonths(`${agendaMes}-01`,1).slice(0,7)+'-01'}).find(entry=>entry.id===button.dataset.agendaOpen);if(item){agendaDiaSelecionado=item.vencimento;render();document.getElementById('agenda-close-day')?.focus();}});
  const closeAgendaDay=document.getElementById('agenda-close-day');if(closeAgendaDay)closeAgendaDay.onclick=()=>{agendaDiaSelecionado=null;render();};
  main.querySelectorAll('[data-agenda-link]').forEach(button=>button.onclick=()=>setView(button.dataset.agendaLink.split(':')[0]||'lancamentos'));
  main.querySelectorAll('[data-agenda-pay]').forEach(button=>button.onclick=async()=>{const lanc=state.lancamentos.find(item=>item.id===button.dataset.agendaPay);if(!lanc||impedirAlteracaoMes(lanc.data))return;const result=FinTrackServices.entries.toggleStatus(state,lanc.id);FinTrackState.replaceState(result.state);registrarHistorico('alteracao_status',`Status alterado para ${result.status}: ${lanc.descricao}`,{lancamentoIds:result.items.map(item=>item.id),operacaoId:lanc.operacaoId||null});await saveData();agendaDiaSelecionado=null;render();});
  const saveProfile=document.getElementById('btn-save-profile');if(saveProfile)saveProfile.onclick=async()=>{await saveProfileName(document.getElementById('profile-name').value);render();};
  main.querySelectorAll('[data-insight-target]').forEach(button=>button.onclick=()=>setView(button.dataset.insightTarget));
  main.querySelectorAll('[data-panel-target],[data-chart-action]').forEach(button=>button.onclick=()=>{const target=button.dataset.panelTarget||button.dataset.chartAction;if(target.startsWith('delete-goal:'))return confirmAction('Excluir esta meta?',async()=>{FinTrackState.replaceState(FinTrackServices.entities.remove(state,'metas',target.split(':')[1]));await saveData();render();});setView(target);});
  const notifications=document.getElementById('btn-enable-notifications');if(notifications)notifications.onclick=async()=>{const status=document.getElementById('notification-status');if(!('Notification'in window)){status.textContent='Notificações não são suportadas neste navegador.';return;}const permission=await Notification.requestPermission();if(permission!=='granted'){status.textContent='Permissão não concedida.';return;}const next=AgendaService.project(state,{start:todayLocal(),end:addMonths(todayLocal(),1)},{tipo:'despesa'})[0],registration=await navigator.serviceWorker?.ready;if(next&&registration)await registration.showNotification('Próximo compromisso FinTrack',{body:`${next.titulo} · ${formatDate(next.vencimento)} · ${formatMoney(next.valor)}`,tag:`agenda-${next.id}`});status.textContent=next?'Lembrete local ativado para o próximo compromisso.':'Permissão concedida; não há compromissos próximos.';};
  const planningMonth=document.getElementById('planejamento-mes');if(planningMonth)planningMonth.onchange=()=>{planejamentoMes=planningMonth.value;render();};
  const copyPlanning=document.getElementById('btn-copiar-planejamento');if(copyPlanning)copyPlanning.onclick=async()=>{const source=addMonths(`${planejamentoMes}-01`,-1).slice(0,7);FinTrackState.replaceState(PlanningService.copy(state,source,planejamentoMes));await saveData();render();};
  const projectionScenario=document.getElementById('btn-cenario-projecao');if(projectionScenario)projectionScenario.onclick=()=>{const gasto=toCents(prompt('Gasto mensal adicional para o cenário:','0')),investimento=toCents(prompt('Investimento mensal adicional para o cenário:','0')),result=ProjectionService.project(state,mesAtualKey(),3,{gastoMensal:gasto,investimentoMensal:investimento});infoModal('Resultado do cenário',`Saldo final estimado em três meses: ${formatMoney(result.meses.at(-1).saldoFinal)}. O cenário é temporário e não alterou seus dados.`);};
  main.querySelectorAll('[data-action="simulate-payoff"]').forEach(button=>button.onclick=()=>{const extra=toCents(prompt('Valor adicional mensal:','0')),result=SimulatorService.payoff(state,button.dataset.id,extra);infoModal('Simulação de quitação',`Prazo estimado: ${result.mesesEstimados} mês(es). Total simplificado: ${formatMoney(result.totalEstimado)}. ${result.aviso}`);});
  const simulatePurchase=document.getElementById('btn-simular-compra');if(simulatePurchase)simulatePurchase.onclick=()=>{const result=SimulatorService.affordability(state,toCents(document.getElementById('sim-valor').value),Number(document.getElementById('sim-parcelas').value)),target=document.getElementById('sim-resultado');target.innerHTML=`<strong>Parcela: ${formatMoney(result.parcela)}</strong><p>Menor saldo: ${formatMoney(result.menorSaldo)} · saldo final: ${formatMoney(result.saldoFinal)}</p><p>${esc(result.consequencia)}</p><small>${esc(result.aviso)}</small>`;};
  const newAsset=document.getElementById('btn-novo-ativo');if(newAsset)newAsset.onclick=async()=>{const nome=prompt('Nome do ativo:','');if(!nome?.trim())return;const instituicao=prompt('Instituição (opcional):','')||'',valor=toCents(prompt('Valor atual:','0'));if(valor<0)return;const ativo={id:uid('ativo'),nome:nome.trim(),instituicao:instituicao.trim(),valorAtual:valor,atualizadoEm:new Date().toISOString()};FinTrackState.replaceState(FinTrackServices.entities.upsert(state,'ativosInvestimento',ativo));await saveData();render();};
  main.querySelectorAll('[data-action="del-ativo"]').forEach(button=>button.onclick=()=>confirmAction('Excluir este ativo?',async()=>{FinTrackState.replaceState(FinTrackServices.entities.remove(state,'ativosInvestimento',button.dataset.id));await saveData();render();}));
  const annualExpense=document.getElementById('btn-nova-despesa-anual');if(annualExpense)annualExpense.onclick=async()=>{const nome=prompt('Nome da despesa anual:','');if(!nome?.trim())return;const valorEstimado=toCents(prompt('Valor estimado:','0')),mes=Number(prompt('Mês de vencimento (1 a 12):',String(new Date().getMonth()+1)));if(valorEstimado<=0||mes<1||mes>12)return;FinTrackState.replaceState(FinTrackServices.entities.upsert(state,'despesasAnuais',{id:uid('despesa-anual'),nome:nome.trim(),valorEstimado,mes}));await saveData();render();};

  const btnNovaCat = document.getElementById('btn-nova-categoria');
  if(btnNovaCat) btnNovaCat.onclick = () => FinTrackForms.open('categoria',null);
  main.querySelectorAll('[data-action="edit-cat"]').forEach(b => b.onclick = () => FinTrackForms.open('categoria',catById(b.dataset.id)));
  main.querySelectorAll('[data-action="del-cat"]').forEach(b => b.onclick = () => {
    const emUso = lancamentosEmUso('categoria', b.dataset.id);
    if(emUso > 0){
      infoModal('Não é possível excluir', `Esta categoria está sendo usada em ${emUso} lançamento${emUso > 1 ? 's' : ''}. Edite ou exclua esses lançamentos primeiro.`);
      return;
    }
    confirmAction('Excluir esta categoria?', async () => {
      FinTrackState.replaceState(FinTrackServices.entities.remove(state,'categorias',b.dataset.id));
      await saveData();
      render();
    });
  });

  const btnNovaConta = document.getElementById('btn-nova-conta');
  if(btnNovaConta) btnNovaConta.onclick = () => FinTrackForms.open('conta',null);
  main.querySelectorAll('[data-action="edit-conta"]').forEach(b => b.onclick = () => FinTrackForms.open('conta',contaById(b.dataset.id)));
  main.querySelectorAll('[data-action="del-conta"]').forEach(b => b.onclick = () => {
    const emUso = lancamentosEmUso('conta', b.dataset.id);
    if(emUso > 0){
      infoModal('Não é possível excluir', `Esta conta está sendo usada em ${emUso} lançamento${emUso > 1 ? 's' : ''}. Edite ou exclua esses lançamentos primeiro.`);
      return;
    }
    confirmAction('Excluir esta conta?', async () => {
      FinTrackState.replaceState(FinTrackServices.entities.remove(state,'contas',b.dataset.id));
      await saveData();
      render();
    });
  });

  const btnExportJson = document.getElementById('btn-export-json');
  if(btnExportJson) btnExportJson.onclick = exportarJSON;
  const btnExportCsv = document.getElementById('btn-export-csv');
  if(btnExportCsv) btnExportCsv.onclick = exportarCSV;
  const annualCsv=document.getElementById('btn-export-annual-csv');if(annualCsv)annualCsv.onclick=()=>baixarArquivo(`fintrack-anual-${balancoAno}.csv`,AnnualReportService.csv(state,balancoAno),'text/csv;charset=utf-8');
  const annualExcel=document.getElementById('btn-export-annual-excel');if(annualExcel)annualExcel.onclick=()=>baixarArquivo(`fintrack-anual-${balancoAno}.xls`,AnnualReportService.excel(state,balancoAno),'application/vnd.ms-excel');
  const backupFile=document.getElementById('backup-file');
  if(backupFile) backupFile.onchange=importarJSON;
  const footerImport=document.getElementById('footer-import');if(footerImport)footerImport.onchange=importarJSON;
  const footerBackup=document.getElementById('footer-backup');if(footerBackup)footerBackup.onclick=exportarJSON;
  const footerRecovery=document.getElementById('footer-recovery');if(footerRecovery)footerRecovery.onclick=exportarArquivoRecuperacao;
  const footerReport=document.getElementById('footer-report');if(footerReport)footerReport.onclick=()=>{const latest=Object.entries(state.fechamentos||{}).filter(([,item])=>item.status==='fechado'&&item.snapshot).sort(([a],[b])=>b.localeCompare(a))[0];if(latest)FinTrackPdfReport.open(latest[0],latest[1]);};
  const csvFile=document.getElementById('csv-file');
  if(csvFile) csvFile.onchange=importarCSV;
  const btnDemo=document.getElementById('btn-carregar-demo');
  if(btnDemo) btnDemo.onclick=carregarDemo;
  const btnApagarDemo=document.getElementById('btn-apagar-demo');
  if(btnApagarDemo) btnApagarDemo.onclick=apagarDemo;
  const btnDesfazer=document.getElementById('btn-desfazer-exclusao');
  if(btnDesfazer) btnDesfazer.onclick=async()=>{const result=FinTrackServices.entries.restoreLast(state);if(result.item){FinTrackState.replaceState(result.state);registrarHistorico('restauracao_lixeira',`Lançamento restaurado: ${result.item.descricao}`,{lancamentoId:result.item.id});await saveData();render();}};
  const btnRestaurarDemo=document.getElementById('btn-restaurar-demo');
  if(btnRestaurarDemo) btnRestaurarDemo.onclick=restaurarDadosAnteriores;
  main.querySelectorAll('[data-action="restore-backup"]').forEach(b=>b.onclick=()=>restaurarBackup(Number(b.dataset.index)));
  const salvarPlan=document.getElementById('btn-salvar-planejamento'); if(salvarPlan) salvarPlan.onclick=async()=>{const key=planejamentoMes;if(impedirAlteracaoMes(`${key}-01`))return;const planning={receita:toCents(document.getElementById('pl-receita').value),investimento:toCents(document.getElementById('pl-investimento').value),orcamentos:Object.fromEntries(state.categorias.filter(c=>c.tipo==='Saída'&&c.natureza!=='movimentacao').map(c=>[c.id,toCents(document.getElementById('pl-cat-'+c.id).value)]))};FinTrackState.transaction(current=>({...current,planejamentos:{...current.planejamentos,[key]:planning}}));registrarHistorico('planejamento_salvo',`Planejamento salvo: ${key}`);await saveData();render();};
  const fechar=document.getElementById('btn-fechar-mes'); if(fechar) fechar.onclick=fecharMes;
  const reabrir=document.getElementById('btn-reabrir-mes'); if(reabrir) reabrir.onclick=reabrirMes;
  const novaMetaBtn=document.getElementById('btn-nova-meta'); if(novaMetaBtn) novaMetaBtn.onclick=()=>FinTrackForms.open('meta');
  main.querySelectorAll('[data-action="del-meta"]').forEach(button=>button.onclick=()=>{
    const goal=state.metas.find(item=>item.id===button.dataset.id);
    confirmAction(`Excluir a meta “${goal?.nome||'selecionada'}”?`,async()=>{
      FinTrackState.replaceState(FinTrackServices.entities.remove(state,'metas',button.dataset.id));
      registrarHistorico('exclusao_meta',`Meta excluída: ${goal?.nome||button.dataset.id}`,{metaId:button.dataset.id});
      await saveData();render();
    });
  });
}
