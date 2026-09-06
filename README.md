# FinTrack

Aplicação web local para controle financeiro pessoal, construída com HTML, CSS e JavaScript vanilla.

## Funcionalidades

- Receitas, despesas, transferências e investimentos
- Lançamentos parcelados e recorrentes
- Contas, categorias, cartões e dívidas
- Faturas de cartão e registro de pagamentos
- Planejamento mensal e fechamento com snapshot
- Metas financeiras
- Backups JSON e exportação/importação CSV
- Armazenamento local via `window.storage`

## Estrutura

```text
index.html              shell da aplicação e compatibilidade do ambiente
js/core/                schema, migrations, normalização, validação e fechamento
js/financial-core.js    regras financeiras centralizadas
js/views/               renderização das telas
js/forms/               formulários e operações de domínio
js/ui/                  navegação, modais, filtros e handlers
tests/                  testes unitários, regressão, migração e contratos de UI
```

## Execução

Abra `index.html` em um ambiente que forneça `window.storage`. Os dados são locais e não são enviados para um servidor pelo aplicativo.

## Testes

Requer Node.js 18 ou superior:

```bash
npm test
```

A suíte cobre cálculos financeiros, persistência, migrações, datas de cartão, recorrências, transferências, fechamentos e sintaxe dos módulos.

## Armazenamento e privacidade

O FinTrack foi projetado para uso local. Backups podem ser exportados manualmente em JSON. Antes de importar CSV ou restaurar dados, a aplicação cria um backup versionado quando possível.

## Modelo financeiro

Valores monetários persistidos são armazenados como inteiros em centavos. Dados antigos passam por migração para o schema atual antes de serem usados pela aplicação.

## CI

O GitHub Actions executa `npm test` em pushes para `main` e em pull requests direcionados à branch `main`.

## Roadmap

- Migrar progressivamente para ES Modules
- Extrair o CSS do HTML
- Consolidar uma camada de estado e services
- Ampliar testes de browser e acessibilidade
- Evoluir autenticação e sincronização somente quando houver backend definido
