(function(){
  'use strict';
  const arrays=['contas','categorias','lancamentos','metas','cartoes','dividas','ativosInvestimento','despesasAnuais','pagamentosCartao','pagamentosDividas','historico','lixeira','quarentena','operacoes','series','recurrenceDecisions'];
  function createEmptyState(current={}){const user=current.usuario||{},next={schemaVersion:8,__centsVersion:1,usuario:{nome:user.nome||'',onboardingIgnorado:Boolean(user.onboardingIgnorado),...(user.preferencias?{preferencias:JSON.parse(JSON.stringify(user.preferencias))}:{})},configuracoesFinanceiras:{reservaMeses:6},planejamentos:{},fechamentos:{},_backups:[]};arrays.forEach(key=>next[key]=[]);return next;}
  window.DataResetService={createEmptyState};
})();
