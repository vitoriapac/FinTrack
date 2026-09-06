function attachViewHandlers(){
  const main = document.getElementById('main');

  FinTrackScreenEvents.attach(main);

  main.querySelectorAll('[data-action="go-lancamentos"]').forEach(b => b.onclick = () => setView('lancamentos'));
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
  const backupFile=document.getElementById('backup-file');
  if(backupFile) backupFile.onchange=importarJSON;
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
  const salvarPlan=document.getElementById('btn-salvar-planejamento'); if(salvarPlan) salvarPlan.onclick=async()=>{const key=mesAtualKey();if(impedirAlteracaoMes(`${key}-01`))return;const planning={receita:toCents(document.getElementById('pl-receita').value),investimento:toCents(document.getElementById('pl-investimento').value),orcamentos:Object.fromEntries(state.categorias.map(c=>[c.id,toCents(document.getElementById('pl-cat-'+c.id).value)]))};FinTrackState.transaction(current=>({...current,planejamentos:{...current.planejamentos,[key]:planning}}));registrarHistorico('planejamento_salvo',`Planejamento salvo: ${key}`);await saveData();render();};
  const fechar=document.getElementById('btn-fechar-mes'); if(fechar) fechar.onclick=fecharMes;
  const reabrir=document.getElementById('btn-reabrir-mes'); if(reabrir) reabrir.onclick=reabrirMes;
  const novaMetaBtn=document.getElementById('btn-nova-meta'); if(novaMetaBtn) novaMetaBtn.onclick=()=>FinTrackForms.open('meta');
}
