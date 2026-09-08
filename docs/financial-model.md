# Contrato financeiro do FinTrack 1.x

Este documento congela as regras financeiras da linha 1.x. Valores monetários são inteiros em centavos após a normalização; conversão de valores legados em reais acontece uma única vez na migração.

## Resultado mensal

- Receita e despesa entram no realizado somente com status `Pago`.
- Investimento é fluxo financeiro próprio: reduz caixa, mas não é despesa de consumo.
- Transferência interna tem duas pernas iguais e não altera receita, despesa, resultado ou patrimônio consolidado.
- Pendências aparecem na projeção/comprometido, nunca no realizado.
- Pagamentos de cartão e dívida são movimentos de liquidação e não repetem a despesa original.
- Estorno invalida o movimento original de forma auditável; registros não são apagados silenciosamente.

## Orçamento e fechamento

Orçamento realizado considera despesas operacionais pagas. Comprometido soma realizado e pendente; disponível é `orçado - comprometido`. Fechar um mês grava os valores calculados e as entidades necessárias em snapshot imutável. Telas e relatórios históricos leem o snapshot, sem recalcular com o estado atual.

## Integridade

Operações compostas (transferências e pagamentos) devem ser atômicas, balanceadas e referenciar entidades existentes. Importações inválidas são rejeitadas; inconsistências reparáveis são preservadas em quarentena com motivo.
