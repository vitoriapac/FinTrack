/* ---------------------------------------------------------
   FinTrack — base funcional (Vanilla JS, sem backend)
   Estado persistido via window.storage (dado pessoal, não compartilhado)
--------------------------------------------------------- */

const STORAGE_KEY = 'fintrack-data-v1';
const BACKUPS_KEY = 'fintrack-backups-v1';
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const DEFAULT_DATA = {
  usuario: { nome: 'Vitoria' },
  categorias: [
    { id: 'cat-mercado', nome: '🛒 Mercado', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 450 },
    { id: 'cat-necessidades', nome: '⚠️ Necessidades', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 50 },
    { id: 'cat-eletronicos', nome: '📱 Eletrônicos', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 110 },
    { id: 'cat-assinaturas', nome: '📺 Assinaturas', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 40 },
    { id: 'cat-roupas', nome: '👚 Roupas', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 0 },
    { id: 'cat-beleza', nome: '💅 Beleza', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 0 },
    { id: 'cat-presente', nome: '🎁 Presente', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 0 },
    { id: 'cat-saude', nome: '💊 Saúde', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 0 },
    { id: 'cat-outros', nome: '🤷 Outros', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 0 },
    { id: 'cat-desenvolvimento', nome: '🧠 Desenvolvimento', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 0 },
    { id: 'cat-transporte', nome: '🚗 Transporte', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 50 },
    { id: 'cat-comidafora', nome: '🍽️ Comida fora', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 0 },
    { id: 'cat-lazer', nome: '🏖️ Lazer', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 0 },
    { id: 'cat-moradia', nome: '🏠 Moradia', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 100 },
    { id: 'cat-contas', nome: '🧾 Contas', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 450 },
    { id: 'cat-investimento', nome: '📈 Investimento', tipo: 'Saída', tipoGasto: '-', orcado: 600, natureza: 'movimentacao' },
    { id: 'cat-educacao', nome: '🎓 Educação', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 0 },
    { id: 'cat-divida', nome: '🤝 Dívida', tipo: 'Saída', tipoGasto: 'Essencial', orcado: 290 },
    { id: 'cat-negocio', nome: '💼 Negócio', tipo: 'Saída', tipoGasto: 'Não Essencial', orcado: 0 },
    { id: 'cat-receita', nome: '💸 Receita', tipo: 'Entrada', tipoGasto: '-', orcado: 2000 },
    { id: 'cat-fatura', nome: '🧾 Fatura do Cartão', tipo: 'Saída', tipoGasto: '-', orcado: 0 },
    { id: 'cat-transferencia', nome: '🔁 Transferência', tipo: 'Saída', tipoGasto: '-', orcado: 0, natureza: 'movimentacao' },
  ],
  contas: [
    { id: 'conta-inter', nome: 'Inter', saldoInicial: 30, dataSaldoInicial: '2025-03-25' },
    { id: 'conta-beflex', nome: 'BeFlex', saldoInicial: 4.65, dataSaldoInicial: '2025-03-28' },
    { id: 'conta-bb', nome: 'BB', saldoInicial: 0, dataSaldoInicial: '2025-03-28' },
  ],
  lancamentos: [],
};

let state = null;
FinTrackState.bind({get:()=>state,set:next=>{state=next;}});
let currentView = 'home';
let lancFiltro = { mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), categoriaId: 'todas', busca: '' };
let balancoAno = new Date().getFullYear();
let cadastroTab = 'categorias';
let historicoMes = null;
let lancMostrarTodos = false;

/* ---------- Persistência ---------- */

async function loadData(){
  let raw=null;
  try{
    raw=await FinTrackStorage.get(STORAGE_KEY);
    let backups=await FinTrackStorage.load(BACKUPS_KEY,[]);
    backups=Array.isArray(backups)?backups:[];
    const sourceVersion=Number(raw?.schemaVersion||1),targetVersion=Number(FinTrackSchema.version);
    if(sourceVersion<targetVersion){
      const migrationBackup={id:uid('backup-migracao'),criadoEm:new Date().toISOString(),motivo:`Antes da migração v${sourceVersion} → v${targetVersion}`,registros:Array.isArray(raw?.lancamentos)?raw.lancamentos.length:0,dados:JSON.parse(JSON.stringify(raw))};
      backups=[...backups,migrationBackup].slice(-5);
      await FinTrackStorage.set(BACKUPS_KEY,backups);
    }
    state=normalizeData(raw);
    const report=window.FinTrackValidation.validateData(state);
    if(!report.valid||report.warnings.length) state=window.FinTrackValidation.repairData(state);
    state._backups=backups;
    if(sourceVersion<targetVersion||!report.valid||report.warnings.length) await saveData();
  }catch(e){
    if(raw){
      // Nunca substitui dados legíveis por dados padrão quando uma etapa de
      // backup, migração ou reparo falha. A cópia original continua preservada.
      state=normalizeData(raw);
      state._migrationPending=true;
      state._backups=Array.isArray(state._backups)?state._backups:[];
      console.error('Migração adiada para preservar os dados originais',e);
    }else{
      state=normalizeData(DEFAULT_DATA);
      await saveData();
    }
  }
}

function todayLocal(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addDays(iso,n){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function esc(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function toCents(value){ return Math.round(Number(value || 0) * 100); }
function fromCents(value){ return Number(value || 0) / 100; }
function normalizeData(data){
  return window.FinTrackCore.normalizeData(data, DEFAULT_DATA);
}

async function saveData(){
  try{
    await FinTrackStorage.set(STORAGE_KEY,state);
    return true;
  }catch(e){
    console.error('Falha ao salvar dados', e);
    return false;
  }
}

function snapshotAtual(){ const s=JSON.parse(JSON.stringify(state)); delete s._backups; delete s.restauracaoDemo; delete s.modoDemo; return s; }
async function registrarBackup(motivo){
  const item={id:uid('backup'),criadoEm:new Date().toISOString(),motivo,registros:state.lancamentos.length,dados:snapshotAtual()};
  const backups=[...(state._backups||[]),item].slice(-5); FinTrackState.transaction(current=>({...current,_backups:backups}));
  try{ await FinTrackStorage.set(BACKUPS_KEY,backups); }catch(e){ console.error('Falha ao salvar backup versionado',e); }
}
function validarBackup(data){
  return FinTrackImport.validateBackup(data,normalizeData,FinTrackValidation.validateData);
}

/* ---------- Helpers ---------- */

function uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2, 10); }

function formatMoney(v){
  return fromCents(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso){
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function catById(id){ return window.FinTrackCore.category(state,id); }
function contaById(id){ return window.FinTrackCore.account(state,id); }
function naturezaLancamento(l){ return window.FinTrackCore.nature(state,l); }
function totalPorNatureza(mes,ano,natureza){ return window.FinTrackCore.totalByNature(state,mes,ano,natureza,todayLocal()); }

function lancamentosDoMes(mes, ano){
  return window.FinTrackCore.monthEntries(state,mes,ano,todayLocal());
}

function totaisDoMes(mes, ano){
  return window.FinTrackCore.totals(state,mes,ano,todayLocal());
}
function resumoFinanceiroDoMes(mes,ano){
  return window.FinTrackCore.financialSummary(state,mes,ano,todayLocal());
}

function gastoPorCategoria(categoriaId, mes, ano){
  return window.FinTrackCore.categorySpend(state,categoriaId,mes,ano,todayLocal());
}

function saldoAtualConta(conta){
  return window.FinTrackCore.accountBalance(state,conta,todayLocal());
}

function addMonths(isoDate, n){
  const [y,m,d] = isoDate.split('-').map(Number);
  const base = new Date(y, (m - 1) + n, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function addInterval(isoDate,n,frequencia){
  if(frequencia==='semanal') return addDays(isoDate,n*7);
  if(frequencia==='anual'){ const [y,m,d]=isoDate.split('-').map(Number); return `${y+n}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  return addMonths(isoDate,n);
}

function lancamentosEmUso(tipo, id){
  return tipo === 'categoria'
    ? state.lancamentos.filter(l => l.categoriaId === id).length
    : state.lancamentos.filter(l => l.contaId === id).length;
}

function itensDaSerie(serieId){ return serieId ? state.lancamentos.filter(l=>l.serieId===serieId) : []; }
function serieEstaAtiva(lanc){
  if(!lanc?.serieId) return true;
  const serie=state.series.find(s=>s.id===lanc.serieId);
  return (serie?.status || lanc.serieStatus || 'ativa') === 'ativa';
}
function serieLabel(lanc){
  if(!lanc?.serieId) return '';
  const itens=itensDaSerie(lanc.serieId);
  const serie=lanc.serieTipo==='parcelamento' ? `Parcela ${lanc.parcelaAtual||1}/${lanc.totalParcelas||itens.length}` : 'Recorrente';
  const status=(state.series.find(s=>s.id===lanc.serieId)?.status || lanc.serieStatus)==='pausada' ? ' · pausada' : '';
  return `<span style="color:var(--muted);font-size:12px;">(${serie}${status})</span>`;
}
function registrarHistorico(acao, descricao, detalhes={}){
  FinTrackState.transaction(current=>({...current,historico:[...(current.historico||[]),{id:uid('hist'),acao,data:todayLocal(),descricao,detalhes}]}));
}
function chaveMes(iso){ return iso ? iso.slice(0,7) : mesAtualKey(); }
function mesFechado(iso){ return FinTrackClosing.isClosed(state.fechamentos?.[chaveMes(iso)]); }
function impedirAlteracaoMes(iso){
  if(!mesFechado(iso)) return false;
  infoModal('Mês fechado','Este mês já foi fechado. Reabra ou altere o fechamento antes de modificar lançamentos desse período.');
  return true;
}
async function alternarSerie(serieId){
  const itens=itensDaSerie(serieId); if(!itens.length) return;
  const atual=state.series.find(s=>s.id===serieId);
  const status=(atual?.status || itens[0].serieStatus || 'ativa')==='ativa' ? 'pausada' : 'ativa';
  FinTrackState.transaction(current=>({...current,series:atual?current.series.map(series=>series.id===serieId?{...series,status}:series):[...current.series,{id:serieId,tipo:itens[0].serieTipo||'serie',status}],lancamentos:current.lancamentos.map(item=>item.serieId===serieId?{...item,serieStatus:status}:item)}));
  registrarHistorico(status==='ativa'?'retomada_serie':'pausa_serie',`Série ${serieId} ${status}`);
  await saveData(); render();
}

/* ---------- Navegação ---------- */

function setView(view){
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(b => { const active=b.dataset.view===view; b.classList.toggle('active',active); active?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current'); });
  render();
}

FinTrackNavigation.mount();

/* ---------- Modal genérico ---------- */

function openModal(title, bodyHtml, onMount){ return FinTrackModal.open(title,bodyHtml,onMount); }
function closeModal(){ return FinTrackModal.close(); }
function confirmAction(message, onConfirm, confirmLabel='Excluir'){ return FinTrackModal.confirmAction(message,onConfirm,confirmLabel); }
function infoModal(title, message){ return FinTrackModal.info(title,message); }

/* ---------- Render raiz ---------- */

function render(){
  const main = document.getElementById('main');
  const demoBanner=state?.modoDemo?'<div class="demo-banner" role="status" aria-live="polite"><strong>MODO DEMO</strong><span>Nenhuma alteração neste modo representa seus dados pessoais.</span><button class="btn btn-ghost" id="btn-demo-restaurar">Restaurar meus dados</button></div>':'';
  main.innerHTML = demoBanner + FinTrackViews.render(currentView) + renderAppFooter();
  attachViewHandlers();
}

/* ================= HOME ================= */

function calcularSaudeFinanceira(mes,ano){
  const t=totaisDoMes(mes,ano), pendentes=state.lancamentos.filter(l=>l.status==='Pendente'&&serieEstaAtiva(l)&&naturezaLancamento(l)==='despesa');
  const vencidos=pendentes.filter(l=>(l.dataVencimento||l.data)<todayLocal()).length;
  const estouradas=state.categorias.filter(c=>c.tipo==='Saída'&&c.orcado>0&&gastoPorCategoria(c.id,mes,ano)>c.orcado).length;
  const invest=totalPorNatureza(mes,ano,'investimento');
  const componentes=[
    {nome:'Resultado',max:25,pontos:t.saldo>=0?25:0,detalhe:t.saldo>=0?'O mês terminou positivo.':'O resultado mensal está negativo.'},
    {nome:'Pendências',max:20,pontos:Math.max(0,20-Math.min(20,vencidos*6)),detalhe:vencidos?`${vencidos} vencimento(s) atrasado(s).`:'Nenhum vencimento atrasado.'},
    {nome:'Orçamento',max:20,pontos:Math.max(0,20-Math.min(20,estouradas*7)),detalhe:estouradas?`${estouradas} categoria(s) acima do orçamento.`:'Categorias dentro do orçamento.'},
    {nome:'Comprometimento',max:20,pontos:t.receitas>0&&t.despesas/t.receitas>.7?5:20,detalhe:t.receitas>0&&t.despesas/t.receitas>.7?'Despesas acima de 70% das receitas.':'Comprometimento sob controle.'},
    {nome:'Investimentos',max:15,pontos:invest>0?15:8,detalhe:invest>0?'Houve investimento no período.':'Nenhum investimento registrado no período.'},
  ];
  const pontos=componentes.reduce((sum,item)=>sum+item.pontos,0),fatores=componentes.filter(item=>item.pontos<item.max).map(item=>item.detalhe);
  return {pontos,fatores,componentes};
}
function gerarRecomendacoes(mes,ano){
  const t=totaisDoMes(mes,ano), pendentes=state.lancamentos.filter(l=>l.status==='Pendente'&&serieEstaAtiva(l)&&naturezaLancamento(l)==='despesa');
  const vencidos=pendentes.filter(l=>(l.dataVencimento||l.data)<todayLocal());
  const estourada=state.categorias.find(c=>c.tipo==='Saída'&&c.orcado>0&&gastoPorCategoria(c.id,mes,ano)>c.orcado);
  const recomendacoes=[];
  if(vencidos.length) recomendacoes.push({prioridade:'Alta',texto:`Priorize ${vencidos.length} vencimento(s) atrasado(s), totalizando ${formatMoney(vencidos.reduce((s,l)=>s+Number(l.valor),0))}.`});
  if(t.saldo<0) recomendacoes.push({prioridade:'Alta',texto:'O resultado do mês está negativo. Revise despesas pendentes antes de assumir novos compromissos.'});
  if(estourada) recomendacoes.push({prioridade:'Média',texto:`A categoria ${estourada.nome} ultrapassou o orçamento. Revise os lançamentos ou ajuste o planejamento.`});
  if(!recomendacoes.length) recomendacoes.push({prioridade:'Baixa',texto:'Mantenha os lançamentos atualizados e preserve uma margem para os próximos vencimentos.'});
  return recomendacoes;
}

function emptyState(title, sub){
  return `<div class="empty-state"><strong>${title}</strong>${sub}</div>`;
}

/* ================= LANÇAMENTOS ================= */

function anosDisponiveis(){
  const anos = new Set(state.lancamentos.map(l => Number(l.data.slice(0,4))));
  anos.add(new Date().getFullYear());
  return [...anos].sort();
}

/* ================= BALANÇO ================= */

function renderBarChart(receitas, despesas){
  const w = 760, h = 190, padB = 20, padT = 8;
  const max = Math.max(1, ...receitas, ...despesas);
  const groupW = w / 12;
  const barW = groupW / 2 - 5;
  let bars = '';
  for(let i=0;i<12;i++){
    const xGroup = i * groupW;
    const hIncome = (receitas[i] / max) * (h - padT - padB);
    const hExpense = (despesas[i] / max) * (h - padT - padB);
    const yIncome = h - padB - hIncome;
    const yExpense = h - padB - hExpense;
    bars += `<rect x="${xGroup + 2}" y="${yIncome}" width="${barW}" height="${hIncome}" fill="var(--income)" rx="1"></rect>`;
    bars += `<rect x="${xGroup + barW + 7}" y="${yExpense}" width="${barW}" height="${hExpense}" fill="var(--expense)" rx="1"></rect>`;
    bars += `<text x="${xGroup + groupW/2}" y="${h - 4}" font-size="10.5" fill="var(--muted)" text-anchor="middle" font-family="IBM Plex Sans, sans-serif">${MESES[i]}</text>`;
  }
  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;">
      <line x1="0" y1="${h-padB}" x2="${w}" y2="${h-padB}" stroke="var(--line)" stroke-width="1"></line>
      ${bars}
    </svg>
    <div style="display:flex;gap:16px;font-size:12px;color:var(--muted);padding:4px 2px 0;">
      <span><span style="display:inline-block;width:9px;height:9px;background:var(--income);border-radius:2px;margin-right:5px;"></span>Receitas</span>
      <span><span style="display:inline-block;width:9px;height:9px;background:var(--expense);border-radius:2px;margin-right:5px;"></span>Despesas</span>
    </div>
  `;
}

function mesAtualKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function fecharMes(){const key=mesAtualKey();if(mesFechado(`${key}-01`)){infoModal('Mês já fechado','Este mês já está fechado e suas alterações estão protegidas.');return;}const obs=prompt('Observação do fechamento (opcional):','');if(obs!==null){const closing=FinTrackClosing.createSnapshot(state,key,{observacao:obs,fechadoEm:new Date().toISOString()});FinTrackState.transaction(current=>({...current,fechamentos:{...current.fechamentos,[key]:closing}}));registrarHistorico('fechamento_mes',`Mês ${key} fechado`,{snapshot:closing.snapshot});saveData().then(render);}}
function reabrirMes(){const key=mesAtualKey();if(!mesFechado(`${key}-01`))return;const motivo=prompt('Informe o motivo da reabertura:','Inclusão de lançamento atrasado.');if(motivo?.trim()){const closing=FinTrackClosing.reopen(state.fechamentos[key],{motivo:motivo.trim(),usuario:state.usuario?.nome||'local'});FinTrackState.transaction(current=>({...current,fechamentos:{...current.fechamentos,[key]:closing}}));registrarHistorico('reabertura_mes',`Mês ${key} reaberto`,{motivo:motivo.trim()});saveData().then(render);}}

/* ================= CADASTRO ================= */

function renderAuditoriaTab(){
  const itens=[...(state.historico||[])].slice().reverse();
  return `<div class="section"><div class="section-head"><h2>Histórico de alterações</h2><span class="stat-meta">${itens.length} registro(s)</span></div>${itens.length?`<table><thead><tr><th>Data</th><th>Ação</th><th>Descrição</th></tr></thead><tbody>${itens.map(h=>`<tr><td>${formatDate(h.data)}</td><td><span class="badge badge-paid">${esc(h.acao)}</span></td><td>${esc(h.descricao)}</td></tr>`).join('')}</tbody></table>`:emptyState('Nenhuma alteração registrada','As próximas ações relevantes aparecerão aqui.')}</div>`;
}
function renderQuarantine(){
  const items=[...(state.quarentena||[])].slice().reverse();
  return `<div class="section"><div class="section-head"><div><h2>Quarentena de dados</h2><p class="section-sub">Registros isolados automaticamente para proteger os cálculos</p></div><span class="stat-meta">${items.length} registro(s)</span></div>${items.length?`<table><thead><tr><th>Tipo</th><th>Origem</th><th>Motivo</th></tr></thead><tbody>${items.map(item=>`<tr><td>${esc(item.tipo)}</td><td>${esc(item.origemId||'—')}</td><td>${esc(item.motivo||'Inconsistência detectada')}</td></tr>`).join('')}</tbody></table>`:emptyState('Nenhum dado em quarentena','Não foram encontradas inconsistências que exigissem isolamento.')}</div>`;
}

function statusFatura(invoice){
  if(invoice.outstanding===0&&invoice.total>0) return 'Paga';
  if(invoice.paid>0) return 'Parcial';
  if(invoice.outstanding>0&&invoice.dueDate<todayLocal()) return 'Vencida';
  return 'Aberta';
}
function renderCartoesTab(){
  const invoices=state.cartoes.map(c=>({card:c,invoice:FinTrackCore.cardInvoice(state,c,new Date())}));
  return `<div class="section"><div class="section-head"><div><h2>Cartões de crédito</h2><p class="section-sub">Fatura atual calculada pelo ciclo de fechamento</p></div><button class="btn btn-primary" id="btn-novo-cartao">Novo cartão</button></div>${invoices.length?`<table><thead><tr><th>Nome</th><th>Bandeira</th><th>Estado</th><th class="num">Fatura em aberto</th><th class="num">Disponível</th><th>Vencimento</th><th></th></tr></thead><tbody>${invoices.map(({card:c,invoice})=>`<tr><td>${esc(c.nome)}</td><td>${esc(c.bandeira||'—')}</td><td><span class="badge ${statusFatura(invoice)==='Paga'?'badge-paid':'badge-pending'}">${statusFatura(invoice)}</span></td><td class="num money-out">${formatMoney(invoice.outstanding)}<small style="display:block;color:var(--muted);">${invoice.paid?`Pago: ${formatMoney(invoice.paid)} · `:''}${invoice.items.length} compra(s)</small></td><td class="num ${invoice.available<0?'money-out':''}">${formatMoney(invoice.available)}</td><td>${formatDate(invoice.dueDate)}</td><td><button class="icon-btn" data-action="pay-card" data-id="${c.id}" ${invoice.outstanding?'':'disabled'}>Pagar</button><button class="icon-btn" data-action="edit-cartao" data-id="${c.id}">Editar</button><button class="icon-btn" data-action="del-cartao" data-id="${c.id}">Excluir</button></td></tr>`).join('')}</tbody></table>`:emptyState('Nenhum cartão cadastrado','Cadastre cartões para organizar futuras faturas e limites.')}</div>`;
}
function renderDividasTab(){
  const projected=state.dividas.map(d=>({debt:d,projection:FinTrackCore.debtProjection(d)}));
  return `<div class="section"><div class="section-head"><div><h2>Controle de dívidas</h2><p class="section-sub">Estimativa de parcelas pelo saldo, juros e prazo informados</p></div><button class="btn btn-primary" id="btn-nova-divida">Nova dívida</button></div>${projected.length?`<table><thead><tr><th>Credor</th><th class="num">Saldo</th><th class="num">Parcela estimada</th><th class="num">Juros projetados</th><th>Próximo vencimento</th><th>Prioridade</th><th></th></tr></thead><tbody>${projected.map(({debt:d,projection:p})=>`<tr><td>${esc(d.credor)}<small style="display:block;color:var(--muted);">${p.periods?p.periods+' parcela(s)':'Prazo não informado'}</small></td><td class="num money-out">${formatMoney(d.saldo)}</td><td class="num">${p.installment?formatMoney(p.installment):'—'}</td><td class="num">${p.totalInterest?formatMoney(p.totalInterest):'—'}</td><td>${formatDate(d.proximoVencimento)}</td><td>${esc(d.prioridade||'—')}</td><td><button class="icon-btn" data-action="pay-divida" data-id="${d.id}">Pagar</button><button class="icon-btn" data-action="edit-divida" data-id="${d.id}">Editar</button><button class="icon-btn" data-action="del-divida" data-id="${d.id}">Excluir</button></td></tr>`).join('')}</tbody></table>`:emptyState('Nenhuma dívida cadastrada','Cadastre dívidas para acompanhar saldo e prioridade de quitação.')}</div>`;
}
function renderCardPaymentHistory(){
  const payments=[...(state.pagamentosCartao||[])].sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  return `<div class="section"><div class="section-head"><h2>Pagamentos de faturas</h2><span class="stat-meta">${payments.length} registro(s)</span></div>${payments.length?`<table><thead><tr><th>Data</th><th>Cartão</th><th>Conta</th><th>Fatura</th><th class="num">Valor</th><th></th></tr></thead><tbody>${payments.map(payment=>`<tr><td>${formatDate(payment.data)}</td><td>${esc(state.cartoes.find(card=>card.id===payment.cartaoId)?.nome||'Cartão removido')}</td><td>${esc(contaById(payment.contaId)?.nome||'Pagamento legado')}</td><td>${esc(payment.invoiceKey)}</td><td class="num">${formatMoney(payment.valor)}</td><td><button class="icon-btn" data-action="reverse-card-payment" data-id="${payment.id}">Estornar</button></td></tr>`).join('')}</tbody></table>`:emptyState('Nenhum pagamento registrado','Os pagamentos de faturas aparecerão aqui.')}</div>`;
}
function renderDebtPaymentHistory(){
  const payments=[...(state.pagamentosDividas||[])].sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  return `<div class="section"><div class="section-head"><h2>Pagamentos de dívidas</h2><span class="stat-meta">${payments.length} registro(s)</span></div>${payments.length?`<table><thead><tr><th>Data</th><th>Dívida</th><th>Conta</th><th class="num">Juros</th><th class="num">Amortização</th><th class="num">Valor</th><th></th></tr></thead><tbody>${payments.map(payment=>`<tr><td>${formatDate(payment.data)}</td><td>${esc(state.dividas.find(debt=>debt.id===payment.dividaId)?.credor||'Dívida removida')}</td><td>${esc(contaById(payment.contaId)?.nome||'Pagamento legado')}</td><td class="num">${payment.juros===undefined?'—':formatMoney(payment.juros)}</td><td class="num">${payment.amortizacao===undefined?'—':formatMoney(payment.amortizacao)}</td><td class="num">${formatMoney(payment.valor)}</td><td><button class="icon-btn" data-action="reverse-debt-payment" data-id="${payment.id}">Estornar</button></td></tr>`).join('')}</tbody></table>`:emptyState('Nenhum pagamento registrado','Os pagamentos de dívidas aparecerão aqui.')}</div>`;
}
function renderBackupTab(){
  const temDemo = state.lancamentos.some(l => String(l.id).startsWith('demo-'));
  const lixeiraCount = state.lixeira.length;
  const backups = state._backups || [];
  return `
    <div class="section">
      <div class="section-head"><h2>Exportar dados</h2></div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;">
        <p style="margin:0;color:var(--muted);font-size:13.5px;max-width:480px;">
          Seus dados ficam salvos automaticamente neste arquivo, mas vale guardar uma cópia de segurança de vez em quando.
        </p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" id="btn-export-json">Exportar tudo (JSON)</button>
          <button class="btn btn-ghost" id="btn-export-csv">Exportar lançamentos (CSV)</button>
        </div>
        ${state.restauracaoDemo ? '<div style="border-top:1px solid var(--line-soft);padding-top:14px;width:100%;"><p style="margin:0 0 10px;color:var(--muted);font-size:13.5px;">Existe um ponto de restauração salvo antes da demonstração.</p><button class="btn btn-ghost" id="btn-restaurar-demo">Restaurar meus dados anteriores</button></div>' : ''}
        <div style="border-top:1px solid var(--line-soft);padding-top:14px;width:100%;"><h3 style="font-size:15px;margin:0 0 8px;">Backups recentes</h3>${backups.length ? backups.slice().reverse().map((b,i)=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:13px;"><span>${esc(new Date(b.criadoEm).toLocaleString('pt-BR'))} · ${b.registros} registro(s)<small style="display:block;color:var(--muted);">${esc(b.motivo)}</small></span><button class="icon-btn" data-action="restore-backup" data-index="${backups.length-1-i}">Restaurar</button></div>`).join('') : '<p style="margin:0;color:var(--muted);font-size:13px;">Nenhum backup versionado ainda.</p>'}</div>
        <div style="border-top:1px solid var(--line-soft);padding-top:14px;width:100%;">
          <label for="backup-file" class="btn btn-ghost">Importar backup JSON</label>
          <input id="backup-file" type="file" accept="application/json,.json" style="display:none;">
          <label for="csv-file" class="btn btn-ghost">Importar lançamentos CSV</label>
          <input id="csv-file" type="file" accept="text/csv,.csv" style="display:none;">
          <p id="backup-status" style="margin:8px 0 0;color:var(--muted);font-size:12.5px;">A importação substitui os dados atuais após confirmação.</p>
        </div>
        <div style="border-top:1px solid var(--line-soft);padding-top:14px;width:100%;">
          <h3 style="font-size:15px;margin:0 0 6px;">Dados de demonstração</h3>
          <p style="margin:0 0 12px;color:var(--muted);font-size:13.5px;max-width:560px;">Carregue três meses de receitas, despesas, investimentos, transferências e vencimentos para conhecer todas as áreas do FinTrack.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-ghost" id="btn-carregar-demo">${temDemo ? 'Recarregar demonstração' : 'Carregar demonstração'}</button>
            ${temDemo ? '<button class="btn btn-danger" id="btn-apagar-demo">Apagar dados da demonstração</button>' : ''}
          </div>
        </div>
        ${lixeiraCount ? `<div style="border-top:1px solid var(--line-soft);padding-top:14px;width:100%;"><p style="margin:0 0 10px;color:var(--muted);font-size:13.5px;">${lixeiraCount} item(ns) na lixeira temporária.</p><button class="btn btn-ghost" id="btn-desfazer-exclusao">Desfazer última exclusão</button></div>` : ''}
      </div>
    </div>
  `;
}

function renderAppFooter(){
  return `<footer class="app-footer"><details class="backup-panel"><summary>Backup e recuperação</summary><div class="backup-panel-body">${renderBackupTab()}</div></details><p>FinTrack · Seus dados permanecem neste dispositivo.</p></footer>`;
}

function baixarArquivo(nome, conteudo, tipo){
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarJSON(){
  const dataStr = JSON.stringify(state, null, 2);
  baixarArquivo(`fintrack-backup-${todayLocal()}.json`, dataStr, 'application/json');
}

function exportarCSV(){
  const header = ['Data','Data Vencimento','Descricao','Tipo','Conta','Categoria','Valor','Status','Fixa'];
  const linhas = state.lancamentos.map(l => [
    l.data, l.dataVencimento || '', l.descricao.replace(/"/g,'""'), l.tipo,
    contaById(l.contaId)?.nome || '', catById(l.categoriaId)?.nome || '',
    fromCents(l.valor).toFixed(2).replace('.',','), l.status, l.fixa ? 'Sim' : 'Não'
  ].map(v => `"${v}"`).join(';'));
  const csv = [header.join(';'), ...linhas].join('\n');
  baixarArquivo(`fintrack-lancamentos-${todayLocal()}.csv`, csv, 'text/csv;charset=utf-8');
}

function importarJSON(e){
  const file=e.target.files[0]; if(!file) return;
  const status=document.getElementById('backup-status');
  const reader=new FileReader();
  reader.onload=async()=>{ try{
    const raw=JSON.parse(reader.result),report=validarBackup(raw);
    if(!report.valid){status.textContent=`Backup rejeitado: ${report.errors.slice(0,3).join(' ')}`;return;}
    const imported=report.warnings.length?FinTrackValidation.repairData(report.normalized):report.normalized;
    const resumo=`Backup válido: ${imported.lancamentos.length} lançamento(s), ${imported.contas.length} conta(s), ${imported.categorias.length} categoria(s) e ${report.warnings.length} aviso(s).`;
    if(confirm(`${resumo}\n\nOs dados atuais serão salvos como uma versão antes da importação. Continuar?`)){
      const previous=state;await registrarBackup('Antes da importação');const backups=state._backups||[];FinTrackState.replaceState({...imported,_backups:backups});
      if(!await saveData()){FinTrackState.replaceState(previous);status.textContent='A importação falhou e os dados anteriores foram restaurados.';return;}
      status.textContent='Backup importado com sucesso.';render();
    }
  }catch(err){ status.textContent='Arquivo inválido. Selecione um backup JSON do FinTrack.'; } };
  reader.readAsText(file);
}

function importarCSV(e){
  const file=e.target.files[0]; if(!file) return;
  const status=document.getElementById('backup-status'),reader=new FileReader();
  reader.onload=async()=>{try{
    const preview=FinTrackImport.previewCsv(reader.result,state,uid);
    if(!preview.items.length){status.textContent=`Nenhuma linha disponível para importação. ${preview.errors.slice(0,2).join(' ')}`;return;}
    const summary=`Pré-visualização da importação:\n${preview.totalRows} linha(s) analisada(s)\n${preview.items.length} válida(s)\n${preview.duplicates.length} duplicada(s) ignorada(s)\n${preview.errors.length} linha(s) com erro\n\n${preview.errors.slice(0,3).join('\n')}`;
    if(confirm(`${summary}\n\nSalvar backup e importar apenas as linhas válidas?`)){
      const previous=state;await registrarBackup('Antes da importação CSV');FinTrackState.replaceState(FinTrackServices.entries.addMany(state,preview.items));registrarHistorico('importacao_csv',`${preview.items.length} lançamento(s) importado(s)`,{duplicados:preview.duplicates.length,erros:preview.errors.length});
      if(!await saveData()){FinTrackState.replaceState(previous);status.textContent='A importação falhou e foi revertida integralmente.';return;}
      status.textContent=`${preview.items.length} lançamento(s) importado(s). ${preview.duplicates.length} duplicado(s) ignorado(s).`;render();
    }
  }catch(error){status.textContent='Não foi possível ler o CSV. Use separador ponto e vírgula.';}};
  reader.readAsText(file);
}

function criarDadosDemo(){
  const base = JSON.parse(JSON.stringify(DEFAULT_DATA));
  base.usuario = { nome: state?.usuario?.nome || 'Vitoria' };
  base.lancamentos = [];
  const hoje=todayLocal();
  const primeiro=hoje.slice(0,8)+'01';
  const add=(offset,dia,descricao,tipo,contaId,categoriaId,valor,status='Pago',vencimento)=>{
    const mes=addMonths(primeiro,offset).slice(0,8);
    base.lancamentos.push({id:uid('demo'),tipo,data:mes+String(dia).padStart(2,'0'),dataVencimento:vencimento?mes+String(vencimento).padStart(2,'0'):undefined,descricao,contaId,categoriaId,valor,status,fixa:false});
  };
  [-2,-1,0].forEach((offset,i)=>{
    add(offset,5,'Salário','Receita','conta-bb','cat-receita',2000);
    add(offset,7,'Aluguel','Despesa','conta-inter','cat-moradia',650);
    add(offset,10,'Compras do mês','Despesa','conta-inter','cat-mercado',390+i*45);
    add(offset,12,'Assinaturas','Despesa','conta-inter','cat-assinaturas',39.90);
    add(offset,15,'Aporte mensal','Despesa','conta-bb','cat-investimento',250+i*50);
    add(offset,18,'Transferência entre contas','Despesa','conta-bb','cat-transferencia',180);
    add(offset,22,'Transporte','Despesa','conta-inter','cat-transporte',85+i*10);
  });
  add(0,25,'Conta de energia','Despesa','conta-inter','cat-contas',145,'Pendente',25);
  add(-1,28,'Internet residencial','Despesa','conta-inter','cat-contas',99.90,'Pendente',28);
  return normalizeData(base);
}

function carregarDemo(){
  confirmAction('Substituir os dados atuais por três meses de demonstração?', async () => {
    const anterior=snapshotAtual(); await registrarBackup('Antes da demonstração'); const backups=state._backups||[]; FinTrackState.replaceState({...criarDadosDemo(),_backups:backups,restauracaoDemo:anterior,modoDemo:true});
    await saveData();
    currentView='home';
    render();
  }, 'Carregar demonstração');
}

function apagarDemo(){
  const quantidade=state.lancamentos.filter(l=>String(l.id).startsWith('demo-')).length;
  if(!quantidade) return;
  confirmAction(`Apagar ${quantidade} lançamento(s) da demonstração? Seus lançamentos reais serão preservados.`, async () => {
    FinTrackState.transaction(current=>({...current,lancamentos:current.lancamentos.filter(item=>!String(item.id).startsWith('demo-')),modoDemo:false}));
    await saveData();
    render();
  }, 'Apagar demonstração');
}

function restaurarDadosAnteriores(){
  if(!state.restauracaoDemo) return;
  confirmAction('Restaurar os dados salvos antes da demonstração?', async()=>{const backups=state._backups||[],restored=normalizeData(state.restauracaoDemo);FinTrackState.replaceState({...restored,_backups:backups,modoDemo:false});await saveData();render();},'Restaurar dados');
}
function restaurarBackup(index){
  const b=(state._backups||[])[index]; if(!b) return;
  if(confirm(`Restaurar a versão de ${new Date(b.criadoEm).toLocaleString('pt-BR')} com ${b.registros} registro(s)? Os dados atuais serão salvos antes da substituição.`)){
    registrarBackup('Antes da restauração').then(async()=>{const backups=state._backups||[],restored=normalizeData(b.dados);FinTrackState.replaceState({...restored,_backups:backups});await saveData();render();});
  }
}

function renderCategoriasTab(){
  const now = new Date();
  return `
    <div class="section">
      <div class="section-head">
        <h2>Categorias</h2>
        <button class="btn btn-primary" id="btn-nova-categoria">Nova categoria</button>
      </div>
      <table>
        <thead><tr><th>Nome</th><th>Tipo</th><th>Tipo de gasto</th><th class="num">Orçado/mês</th><th class="num">Gasto (mês atual)</th><th></th></tr></thead>
        <tbody>
          ${state.categorias.map(c => {
            const gasto = c.tipo === 'Saída' ? gastoPorCategoria(c.id, now.getMonth()+1, now.getFullYear()) : null;
            return `
            <tr>
              <td>${esc(c.nome)}</td>
              <td>${c.tipo}</td>
              <td>${c.tipoGasto}</td>
              <td class="num">${c.orcado ? formatMoney(c.orcado) : '—'}</td>
              <td class="num ${gasto && c.orcado && gasto > c.orcado ? 'money-out' : ''}">${gasto !== null ? formatMoney(gasto) : '—'}</td>
              <td><div class="row-actions">
                <button class="icon-btn" data-action="edit-cat" data-id="${c.id}">Editar</button>
                <button class="icon-btn" data-action="del-cat" data-id="${c.id}">Excluir</button>
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderContasTab(){
  return `
    <div class="section">
      <div class="section-head">
        <h2>Contas</h2>
        <button class="btn btn-primary" id="btn-nova-conta">Nova conta</button>
      </div>
      <table>
        <thead><tr><th>Nome</th><th>Saldo inicial</th><th>Data do saldo</th><th class="num">Saldo atual</th><th></th></tr></thead>
        <tbody>
          ${state.contas.map(c => `
            <tr>
              <td>${esc(c.nome)}</td>
              <td class="num">${formatMoney(c.saldoInicial)}</td>
              <td>${formatDate(c.dataSaldoInicial)}</td>
              <td class="num"><strong>${formatMoney(saldoAtualConta(c))}</strong></td>
              <td><div class="row-actions">
                <button class="icon-btn" data-action="edit-conta" data-id="${c.id}">Editar</button>
                <button class="icon-btn" data-action="del-conta" data-id="${c.id}">Excluir</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------- Registro de formulários ---------- */
FinTrackForms.register('categoria', openCategoryForm);
FinTrackForms.register('conta', openAccountForm);
FinTrackForms.register('transferencia', openTransferForm);
FinTrackForms.register('investimento', openInvestmentForm);
FinTrackForms.register('lancamento', openEntryForm);
FinTrackForms.register('meta', openGoalForm);
FinTrackForms.register('cartao', openCardForm);
FinTrackForms.register('divida', openDebtForm);
FinTrackEvents.use(attachViewHandlers);

/* ---------- Boot ---------- */

(async function init(){
  document.getElementById('main').innerHTML = `<div class="empty-state">Carregando...</div>`;
  await loadData();
  setView('home');
})();
