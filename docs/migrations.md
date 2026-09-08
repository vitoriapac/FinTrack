# Migrações, reparo e quarentena

O carregamento segue uma sequência determinística:

1. preservar uma cópia do documento recebido;
2. migrar versões de schema em ordem;
3. converter reais legados para centavos somente quando `__centsVersion` estiver ausente;
4. normalizar coleções e defaults;
5. validar referências e invariantes;
6. reparar apenas itens isoláveis, enviando o original à `quarentena` com motivo;
7. persistir somente o documento validado.

Backups com estrutura irrecuperável são rejeitados sem substituir o estado atual. Reparo não inventa valores financeiros nem recria pares de operações. Snapshots históricos são copiados sem recálculo. Fixtures em `tests/fixtures` cobrem o formato v1, um documento intermediário em centavos e regressões do schema v4; toda mudança de schema deve acrescentar fixtures para cada caminho suportado.
