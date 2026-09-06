(function(){
  const CURRENT_SCHEMA_VERSION=6;
  const MONEY_FIELDS={
    contas:['saldoInicial'],
    categorias:['orcado'],
    lancamentos:['valor'],
    cartoes:['limite'],
    dividas:['saldo'],
    metas:['alvo','acumulado','aporte'],
    pagamentosCartao:['valor'],
    pagamentosDividas:['valor','juros','amortizacao','saldoAnterior','saldoPosterior'],
    operacoes:['valor'],
    fechamentos:['resultado','gasto','investido'],
    planejamentos:['receita','investimento'],
  };
  window.FinTrackSchema={version:CURRENT_SCHEMA_VERSION,moneyFields:MONEY_FIELDS,requiredCollections:['contas','categorias','lancamentos','metas','cartoes','dividas','pagamentosCartao','pagamentosDividas','historico','lixeira','quarentena','operacoes','series']};
})();
