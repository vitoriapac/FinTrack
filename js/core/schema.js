(function(){
  const CURRENT_SCHEMA_VERSION=4;
  const MONEY_FIELDS={
    contas:['saldoInicial'],
    categorias:['orcado'],
    lancamentos:['valor'],
    cartoes:['limite'],
    dividas:['saldo'],
    metas:['alvo','acumulado','aporte'],
    pagamentosCartao:['valor'],
    pagamentosDividas:['valor'],
    fechamentos:['resultado','gasto','investido'],
    planejamentos:['receita','investimento'],
  };
  window.FinTrackSchema={version:CURRENT_SCHEMA_VERSION,moneyFields:MONEY_FIELDS};
})();
