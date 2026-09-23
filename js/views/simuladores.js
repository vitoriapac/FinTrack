(function(){
  window.renderSimuladoresView=function(){
    const state=FinTrackState.getState(),debts=(state.dividas||[]).filter(item=>Number(item.saldo||0)>0),choices=[
      ['reduce-expense','Reduzir gastos','Veja quanto uma economia mensal pode melhorar o caixa.'],
      ['reserve','Guardar para a reserva','Compare o impacto de um aporte mensal no saldo disponível.'],
      ['debt','Pagar uma dívida','Teste o efeito de um pagamento extra mensal no caixa.'],
      ['installment','Planejar uma compra parcelada','Distribua uma compra em parcelas e veja os meses afetados.']
    ];
    return `<div class="page-header"><div class="page-heading"><h1 class="page-title">Cenários</h1><p class="page-sub">Compare possibilidades futuras sem alterar seus dados reais</p></div></div>
      <section class="section scenario-workspace"><div class="section-head"><h2>O que você quer avaliar?</h2></div><p>Escolha uma hipótese. A projeção compara o caixa atual com o cenário escolhido; nada é salvo.</p>
        <div class="scenario-choices" role="group" aria-label="Tipo de cenário">${choices.map(([kind,title,description],index)=>`<button type="button" class="scenario-choice" data-scenario-kind="${kind}" aria-pressed="${index===0}"><strong>${title}</strong><small>${description}</small></button>`).join('')}</div>
        <div class="planning-fields"><select id="scenario-kind" hidden aria-hidden="true" tabindex="-1">${choices.map(([kind,title])=>`<option value="${kind}">${title}</option>`).join('')}</select><div class="form-row">
          <div class="field"><label for="scenario-amount" id="scenario-amount-label">Economia mensal (R$)</label><input id="scenario-amount" type="number" min="0.01" step="0.01" value="100"></div>
          <div class="field" id="scenario-installments-field" hidden><label for="scenario-installments">Número de parcelas</label><input id="scenario-installments" type="number" min="1" max="24" value="3"></div>
          <div class="field" id="scenario-debt-field" hidden><label for="scenario-debt">Dívida</label><select id="scenario-debt"><option value="">Selecione uma dívida</option>${debts.map(item=>`<option value="${esc(item.id)}">${esc(item.credor||item.nome||'Dívida')}</option>`).join('')}</select></div></div>
          <p class="scenario-guidance" id="scenario-guidance">A economia é hipotética: o orçamento cadastrado permanece igual.</p><button class="btn btn-primary" id="btn-compare-scenario">Comparar com o plano atual</button>
          <div id="scenario-result" class="scenario-result" aria-live="polite">Escolha uma hipótese e compare para ver a projeção. Esta análise não salva alterações.</div></div>
      </section>
      <section class="section"><div class="section-head"><h2>Outra pergunta: cabe uma compra?</h2></div><p>Estime o efeito de uma compra específica no menor saldo e no saldo final.</p><div class="planning-fields"><div class="form-row"><div class="field"><label for="sim-valor">Valor da compra</label><input id="sim-valor" type="number" min="0" step="0.01"></div><div class="field"><label for="sim-parcelas">Parcelas</label><input id="sim-parcelas" type="number" min="1" value="1"></div></div><button class="btn btn-primary" id="btn-simular-compra">Mostrar consequências</button><div id="sim-resultado" class="history-note" aria-live="polite">A simulação não toma decisões por você.</div></div></section>`;
  };
  FinTrackViews.register('simuladores',()=>window.renderSimuladoresView());
})();
