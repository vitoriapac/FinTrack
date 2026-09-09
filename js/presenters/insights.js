(function(){'use strict';
  const metric=(label,value,format='money')=>({label,value:Number(value||0),format}),targets={orcamento:'planejamento',projecao:'projecao',atrasos:'agenda',dividas:'dividas',metas:'metas',investimentos:'lancamentos',tendencia:'balanco'};
  function present(insight,context={}){const e=insight?.evidencia||{};let metrics=[],comparison='',visualType='metrics';
    if(insight.tipo==='orcamento'){const excess=Math.max(0,Number(e.comprometido||0)-Number(e.planejado||0));metrics=[metric('Planejado',e.planejado),metric('Comprometido',e.comprometido),metric('Uso do orçamento',e.percentual,'percent')];comparison=excess?`${context.money?context.money(excess):excess} acima do planejado`:'Dentro do valor planejado';visualType='progress';}
    else if(insight.tipo==='projecao'){metrics=[metric('Menor saldo projetado',e.menorSaldo),metric('Saldo final',e.saldoFinal)];comparison=`${e.periodo||'Período futuro'} · principal impacto: ${e.principalImpacto||'não identificado'}`;visualType='line';}
    else if(insight.tipo==='atrasos'){metrics=[metric('Compromissos vencidos',e.quantidade,'count'),metric('Total pendente',e.total)];comparison='Valores aguardando confirmação ou reagendamento';visualType='status';}
    else if(insight.tipo==='dividas'){metrics=[metric('Saldo total',e.saldo),metric('Dívidas ativas',e.quantidade,'count')];comparison='Saldo informado nos cadastros de dívida';visualType='status';}
    else if(insight.tipo==='metas'){metrics=[metric('Acumulado',e.acumulado),metric('Aporte médio',e.aporteMedio)];comparison='Ritmo abaixo do necessário para o prazo';visualType='progress';}
    else if(insight.tipo==='investimentos'){metrics=[metric('Receitas do mês',e.receitas),metric('Investimentos',e.investimentos)];comparison=`Período ${e.periodo||''}`.trim();visualType='status';}
    else if(insight.tipo==='tendencia'){const delta=Number(e.atual||0)-Number(e.anterior||0);metrics=[metric('Mês atual',e.atual),metric('Mês anterior',e.anterior)];comparison=`${delta>=0?'Aumento':'Redução'} de ${context.money?context.money(Math.abs(delta)):Math.abs(delta)}`;visualType='sparkline';}
    return {headline:insight.titulo||'Leitura financeira',metrics,comparison,visualType,actionLabel:'Ver detalhes',actionTarget:targets[insight.tipo]||'home',details:insight.mensagem||'',severity:insight.severidade,action:insight.acao||''};}
  window.InsightPresenter={present};
})();
