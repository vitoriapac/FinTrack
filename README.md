# FinTrack

FinTrack é um aplicativo web de controle financeiro pessoal construído em HTML, CSS e JavaScript puro (vanilla), sem frameworks e sem servidor — todos os dados ficam salvos localmente no seu navegador. Nasceu como uma adaptação de uma planilha de controle financeiro e cresceu para um app modular.

## Funcionalidades

- Receitas, despesas, transferências e investimentos
- Lançamentos parcelados e recorrentes
- Contas, categorias, cartões e dívidas
- Faturas com pagamentos parciais vinculados às contas
- Dívidas com separação entre juros e amortização
- Planejamento mensal e fechamento com snapshot
- Histórico permanente, comparação mensal e saldos por conta no fechamento
- Relatório mensal imprimível em PDF, gerado exclusivamente do snapshot fechado
- Orçamento operacional com realizado, pendente e disponível
- Recomendações diárias explicáveis
- Metas financeiras
- Backups JSON e importação CSV com pré-validação e deduplicação
- Adaptadores de armazenamento para `window.storage`, `localStorage` e IndexedDB
- Configurações unificadas para perfil, PWA/offline, dados locais e lembretes opcionais derivados da Agenda
- Guia integrado de uso e análises determinísticas com proveniência, confiabilidade do cálculo e qualidade dos dados
- Central de decisão com saúde financeira, relevância explicável e até três próximas ações
- Inteligência diária na Agenda, com mapas de gastos, saldo, ritmo do orçamento, pressão futura e níveis de confiança
- Memória financeira congelada nos novos fechamentos, com evolução da saúde e histórico de sinais mensais sem recalcular períodos legados
- Cenários temporários de gastos, reserva, dívida e parcelamento; relatório mensal visual gerado apenas dos snapshots fechados
- Reparo automático de relacionamentos e quarentena auditável
- Busca global, atalhos de teclado e cards de lançamentos no celular
- Visão inicial 4.0 com resumo financeiro, até três alertas e três ações, dois gráficos essenciais e ritmo diário do orçamento
- Navegação contextual dos alertas para Agenda, Planejamento e Projeção, além de barra de acesso rápido no celular
- Exploração 4.1: destinos de insights padronizados, leitura diária de pressão na Agenda, tooltips de orçamento com diferença e matriz de QA ampliada
- Aprofundamento 4.1.1: foco e retorno em itens identificados, aviso para itens removidos e quatro leituras rápidas da Agenda acessíveis por teclado
- Cenários 2.0 (4.2): área própria para hipóteses de economia, reserva, pagamento de dívida ou compra parcelada, com comparação explicada do menor saldo e confirmação de que os dados reais não são alterados
- Extrato Financeiro (4.3): consulta por período, conta, categoria, tipo, status e descrição; totais distinguem caixa, resultado operacional, investimentos, transferências e pagamentos, com exportação CSV do filtro aplicado
- Consolidação visual e técnica (4.4): Lançamentos e Extrato compartilham classificação financeira e tabela acessível, com componentes e estilos guiados pelos tokens do produto
- Núcleo de importação bancária (4.5): prévia local e pura de transações intermediárias, com origem por linha, normalização de datas e centavos, validação de BRL e erros estruturados; a leitura ainda não grava lançamentos
- CSV bancário e revisão segura (4.7): mapeamento de colunas, débito/crédito, revisão por linha, correspondências sugeridas, vínculo manual, histórico de lotes e desfazer protegido
- OFX e assistência local (4.9): extratos bancários OFX 1.x/2.x em BRL usam a mesma revisão; FITID identifica a origem. Regras explícitas sugerem categorias com motivo visível, e transferências confirmadas criam pares ou incorporam um movimento oposto existente, com desfazer protegido
- Consolidação da importação (4.10): CSV e OFX compartilham o contrato intermediário; a identidade OFX considera instituição, conta externa e FITID sem gravar o número completo da conta. Lotes anteriores permanecem legíveis. O período coberto só é registrado quando informado no OFX ou confirmado no CSV.
- Tela de importação (4.11): fluxo em Lançamentos com arquivo, confirmação explícita da conta, configuração com exemplos e análise das linhas antes de salvar. QIF permanece fora do escopo.

## Estrutura

```text
index.html              shell da aplicação e compatibilidade do ambiente
css/                    tokens de design, estilos gerais e acabamento móvel
js/app.js               composição, renderizadores e inicialização da aplicação
js/core/                schema, migrations, normalização, validação e fechamento
js/financial-core.js    regras financeiras centralizadas
js/services/            operações imutáveis de lançamentos, pagamentos e cadastros
js/services/import/     modelo intermediário e prévia de importação bancária
js/views/               renderização das telas
js/forms/               formulários e operações de domínio
js/ui/                  navegação, modais, filtros e handlers
js/reporting/           relatórios derivados dos snapshots de fechamento
tests/                  testes unitários, contratos e cenários Playwright
```

## Execução

Abra `index.html` diretamente ou sirva a pasta com um servidor HTTP local. Os dados são locais e não são enviados para um servidor pelo aplicativo.

## Testes

Requer Node.js 18 ou superior:

```bash
npm test
npm run test:browser
```

A suíte cobre cálculos financeiros, persistência, migrações v1–v8, importação, deduplicação, quarentena, integridade bidirecional de operações, transferências, pagamentos e reversões atômicas, juros, amortização, fechamentos, contratos de UI, separação de recursos e sintaxe dos módulos.

Os fluxos principais também são validados em navegador real com Playwright: receita e despesa, baixa de pendência, transferência, investimento, pagamentos parciais e estornos de cartão, amortização e estorno de dívida, imutabilidade do fechamento, persistência, navegação, layout móvel e ausência de erros no console. A matriz de QA cobre larguras de 1440, 1024, 768, 390 e 360 pixels, além de nomes acessíveis, IDs únicos e estrutura dos diálogos.

## Armazenamento e privacidade

O FinTrack foi projetado para uso local. Backups podem ser exportados manualmente em JSON. A aplicação cria um backup versionado antes de importar, restaurar ou migrar dados. A migração opcional para IndexedDB mantém o adaptador anterior como rollback quando a cópia falha.

## Modelo financeiro

Valores monetários persistidos são armazenados como inteiros em centavos. O schema atual é a versão 11 e novos fechamentos usam snapshots versão 4. Dados antigos passam por migração antes do uso; snapshots históricos anteriores são lidos por compatibilidade sem recálculo ou alteração, e registros inseguros são isolados na quarentena exibida em Cadastro → Auditoria. A importação bancária aceita CSV e extratos OFX bancários em BRL de até 10 MB; outros conjuntos de mensagens OFX, como cartão e investimento, não entram nesta versão. Cada linha precisa de uma decisão; lançamentos operacionais exigem categoria. O desfazer de um lote é bloqueado quando seus lançamentos foram alterados, removidos, vinculados por outro lote ou pertencem a mês fechado. Regras de categoria criadas explicitamente permanecem disponíveis após desfazer o lote.

O contrato financeiro distingue valores realizados (`status === Pago`) de pendentes (`status === Pendente`). Em orçamentos, `comprometido` é a soma de realizado e pendente, e `disponível` é o valor planejado menos o comprometido. Saldos de contas consideram apenas movimentos realizados; projeções acrescentam entradas pendentes e descontam saídas pendentes. Transferências, investimentos e pagamentos de cartão ou dívida são classificados por `tipoOperacao`, sem inferência por nome durante o uso normal da aplicação.

## CI

O GitHub Actions executa os testes unitários e os cenários Playwright em Chromium, nas configurações desktop e mobile, em pushes para `main` e pull requests direcionados à branch `main`.

## Roadmap

- Migrar progressivamente para ES Modules
- Evoluir autenticação e sincronização somente quando houver backend definido
