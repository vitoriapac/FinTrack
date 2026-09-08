(function(){
  const CURRENT_SCHEMA_VERSION=7;
  const MONEY_FIELDS={
    contas:['saldoInicial'],
    categorias:['orcado'],
    lancamentos:['valor'],
    cartoes:['limite'],
    dividas:['saldo','saldoInicial'],
    metas:['alvo','acumulado','aporte','saldoInicial'],
    pagamentosCartao:['valor'],
    pagamentosDividas:['valor','juros','amortizacao','saldoAnterior','saldoPosterior'],
    operacoes:['valor'],
    fechamentos:['resultado','gasto','investido'],
    planejamentos:['receita','investimento'],
    ativosInvestimento:['valorAtual'],
    despesasAnuais:['valorEstimado'],
  };
  window.FinTrackSchema={version:CURRENT_SCHEMA_VERSION,moneyFields:MONEY_FIELDS,requiredCollections:['contas','categorias','lancamentos','metas','cartoes','dividas','ativosInvestimento','despesasAnuais','pagamentosCartao','pagamentosDividas','historico','lixeira','quarentena','operacoes','series']};
})();
