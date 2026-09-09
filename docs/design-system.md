# FinTrack — sistema visual

Direção: editorial, financeiro e calmo. A identidade usa forest, papel, dourado, Fraunces, IBM Plex Sans e raio de 3px.

## Espaçamento

A escala oficial é 4, 8, 12, 16, 20, 24 e 32px (`--space-1` a `--space-7`). Cards usam 20px; painéis usam 20px no cabeçalho e conteúdo; seções de página usam 20–24px.

## Composição

`DataPanel` é `full` por padrão. `wide` ocupa até dois terços em telas largas. `compact` só deve ser usado ao lado de outro painel compatível. Grids usam `auto-fit` com mínimo de 420px; um item isolado sempre ocupa a linha inteira.

## Estados

Normal usa verde, Atenção usa dourado e Crítico usa terracota. Toda cor possui texto equivalente. Tabelas permanecem prioritárias para dados operacionais e auditoria.

## Controles e estados vazios

Controles têm altura mínima de 42px e foco dourado. Períodos mensais exibem o mês por extenso, preservando `YYYY-MM` internamente. Cada tela apresenta no máximo um estado vazio principal, sempre com explicação e uma única ação contextual.
