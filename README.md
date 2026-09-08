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
- Instalação PWA, cache offline e lembretes locais opcionais derivados da Agenda
- Reparo automático de relacionamentos e quarentena auditável
- Busca global, atalhos de teclado e cards de lançamentos no celular

## Estrutura

```text
index.html              shell da aplicação e compatibilidade do ambiente
css/                    tokens de design, estilos gerais e acabamento móvel
js/app.js               composição, renderizadores e inicialização da aplicação
js/core/                schema, migrations, normalização, validação e fechamento
js/financial-core.js    regras financeiras centralizadas
js/services/            operações imutáveis de lançamentos, pagamentos e cadastros
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

A suíte cobre cálculos financeiros, persistência, migrações v1–v7, importação, deduplicação, quarentena, integridade bidirecional de operações, transferências, pagamentos e reversões atômicas, juros, amortização, fechamentos, contratos de UI, separação de recursos e sintaxe dos módulos.

Os fluxos principais também são validados em navegador real com Playwright: receita e despesa, baixa de pendência, transferência, investimento, pagamentos parciais e estornos de cartão, amortização e estorno de dívida, imutabilidade do fechamento, persistência, navegação, layout móvel e ausência de erros no console. A matriz de QA cobre larguras de 1440, 1024, 768, 390 e 360 pixels, além de nomes acessíveis, IDs únicos e estrutura dos diálogos.

## Armazenamento e privacidade

O FinTrack foi projetado para uso local. Backups podem ser exportados manualmente em JSON. A aplicação cria um backup versionado antes de importar, restaurar ou migrar dados. A migração opcional para IndexedDB mantém o adaptador anterior como rollback quando a cópia falha.

## Modelo financeiro

Valores monetários persistidos são armazenados como inteiros em centavos. O schema atual é a versão 7 e novos fechamentos usam snapshots versão 4. Dados antigos passam por migração antes do uso; snapshots históricos anteriores são lidos por compatibilidade sem recálculo ou alteração, e registros inseguros são isolados na quarentena exibida em Cadastro → Auditoria.

O contrato financeiro distingue valores realizados (`status === Pago`) de pendentes (`status === Pendente`). Em orçamentos, `comprometido` é a soma de realizado e pendente, e `disponível` é o valor planejado menos o comprometido. Saldos de contas consideram apenas movimentos realizados; projeções acrescentam entradas pendentes e descontam saídas pendentes. Transferências, investimentos e pagamentos de cartão ou dívida são classificados por `tipoOperacao`, sem inferência por nome durante o uso normal da aplicação.

## CI

O GitHub Actions executa os testes unitários e os cenários Playwright em Chromium, nas configurações desktop e mobile, em pushes para `main` e pull requests direcionados à branch `main`.

## Roadmap

- Migrar progressivamente para ES Modules
- Evoluir autenticação e sincronização somente quando houver backend definido
