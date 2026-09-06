# FinTrack

Aplicação web local para controle financeiro pessoal, construída com HTML, CSS e JavaScript vanilla.

## Funcionalidades

- Receitas, despesas, transferências e investimentos
- Lançamentos parcelados e recorrentes
- Contas, categorias, cartões e dívidas
- Faturas com pagamentos parciais vinculados às contas
- Dívidas com separação entre juros e amortização
- Planejamento mensal e fechamento com snapshot
- Metas financeiras
- Backups JSON e importação CSV com pré-validação e deduplicação
- Armazenamento local via `window.storage`, com fallback para `localStorage`
- Reparo automático de relacionamentos e quarentena auditável

## Estrutura

```text
index.html              shell da aplicação e compatibilidade do ambiente
css/app.css             estilos responsivos e estados de foco
js/app.js               composição, renderizadores e inicialização da aplicação
js/core/                schema, migrations, normalização, validação e fechamento
js/financial-core.js    regras financeiras centralizadas
js/services/            operações imutáveis de lançamentos, pagamentos e cadastros
js/views/               renderização das telas
js/forms/               formulários e operações de domínio
js/ui/                  navegação, modais, filtros e handlers
tests/                  testes unitários, regressão, migração e contratos de UI
```

## Execução

Abra `index.html` diretamente ou sirva a pasta com um servidor HTTP local. Os dados são locais e não são enviados para um servidor pelo aplicativo.

## Testes

Requer Node.js 18 ou superior:

```bash
npm test
```

A suíte cobre cálculos financeiros, persistência, migrações v1–v6, importação, deduplicação, quarentena, relacionamentos, transferências, pagamentos e reversões atômicas, juros, amortização, fechamentos, contratos de UI, separação de recursos e sintaxe dos módulos.

Os fluxos principais também são validados em navegador real com Playwright: navegação entre telas, abertura e fechamento de modal, validação acessível de formulário, foco por teclado, layout móvel e ausência de erros no console.

## Armazenamento e privacidade

O FinTrack foi projetado para uso local. Backups podem ser exportados manualmente em JSON. A aplicação cria um backup versionado antes de importar, restaurar ou migrar dados. Importações são revertidas se a persistência falhar.

## Modelo financeiro

Valores monetários persistidos são armazenados como inteiros em centavos. O schema atual é a versão 6. Dados antigos passam por migração antes do uso; registros inseguros são isolados na quarentena exibida em Cadastro → Auditoria.

## CI

O GitHub Actions executa `npm test` em pushes para `main` e em pull requests direcionados à branch `main`.

## Roadmap

- Migrar progressivamente para ES Modules
- Automatizar os cenários Playwright no CI quando a aplicação adotar dependências de desenvolvimento
- Evoluir autenticação e sincronização somente quando houver backend definido
