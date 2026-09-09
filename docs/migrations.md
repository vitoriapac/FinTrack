# Migrações, reparo e quarentena

O carregamento segue uma sequência determinística:

1. preservar uma cópia do documento recebido;
2. migrar versões de schema em ordem;
3. converter reais legados para centavos somente quando `__centsVersion` estiver ausente;
4. normalizar coleções e defaults;
5. validar referências e invariantes;
6. reparar apenas itens isoláveis, enviando o original à `quarentena` com motivo;
7. persistir somente o documento validado.

Backups com estrutura irrecuperável são rejeitados sem substituir o estado atual. Reparo não inventa valores financeiros nem recria pares de operações. Snapshots históricos são copiados sem recálculo. O schema v7 acrescenta `ativosInvestimento` e `despesasAnuais`; o schema v8 adiciona decisões de recorrência, marcações explícitas de essencial/reserva/extraordinário e a meta configurável de cobertura. Fixtures cobrem todos os formatos anteriores e toda mudança de schema deve preservar esses caminhos.
