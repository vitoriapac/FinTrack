# QA visual da versão 4.0

Referência 3.9: tag `v3.9.0` e capturas versionadas em `tests/browser/visual-baseline.spec.js-snapshots/` (Chromium no Windows). Os testes funcionais de navegador continuam rodando em Windows e Linux; comparações de pixel são específicas da plataforma.

| Tela | Desktop | Tablet | Mobile | Vazio | Com dados |
| --- | --- | --- | --- | --- | --- |
| Visão Geral | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lançamentos | ✓ | — | ✓ | ✓ | ✓ |
| Agenda | ✓ | ✓ | ✓ | ✓ | ✓ |
| Planejamento | ✓ | ✓ | ✓ | ✓ | ✓ |
| Análises | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patrimônio | ✓ | — | ✓ | ✓ | ✓ |
| Histórico | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projeção | ✓ | — | ✓ | ✓ | ✓ |
| Cenários | ✓ | ✓ | ✓ | ✓ | ✓ |
| Relatório mensal | ✓ (A4) | — | — | legado | ✓ |

O dataset de demonstração (`criarDadosDemo`) é a referência com seis meses, fechamentos, dívida, cartão, investimento, recorrências e parcelas. Cenários de vazio, orçamento estourado e patrimônio negativo são variantes do teste visual determinístico. Os baselines de pixel cobrem 12 cenários em 1440×900, 1280×800, 1024×900, 768×1024, 390×844 e 360×800 no Chromium/Windows. Uma matriz funcional adicional verifica nove telas em 1440×900, 1280×800, 768×1024 e 390×844, incluindo erros JavaScript e rolagem horizontal global. Relatório A4, teclado, zoom 200% e nomes acessíveis exigem revisão específica; não são todos cobertos por comparação de pixel.

Critério para alterar snapshots: primeiro revisar a imagem resultante; depois atualizar as referências somente quando a mudança for intencional. Não recalcular fechamentos históricos para preencher campos ausentes.
