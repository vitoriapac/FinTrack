# Snapshots mensais

Snapshots são documentos históricos imutáveis. `FinTrackClosing.readSnapshot` cria uma cópia compatível para exibição e jamais altera o documento armazenado.

## Versões suportadas

- **v1** — totais essenciais (`receitas`, `despesas`, `investimentos`, `resultado`). A ausência de `versao` é interpretada como v1.
- **v2** — acrescenta planejamento, orçamento detalhado, saldos e referências do fechamento.
- **v3** — congela pendências, comprometido/disponível por categoria, contas, cartões, dívidas e lançamentos detalhados.
- **v4** — congela contas, ativos de investimento, dívidas e patrimônio líquido. A evolução patrimonial usa exclusivamente snapshots v4.

Campos que não existiam em versões antigas são exibidos como indisponíveis (`null`/travessão), e não reconstruídos a partir dos dados atuais. Comparações históricas usam somente snapshots. Alterar lançamentos, categorias ou contas após o fechamento não pode mudar um relatório fechado.

Uma versão futura adiciona campos de forma aditiva. Snapshots v1–v3 permanecem legíveis e não são regravados durante migração.
