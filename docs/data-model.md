# Modelo de dados — schema v9

O estado persistido é um documento JSON local. `schemaVersion: 9` e `__centsVersion: 1` identificam o contrato atual. A partir da v9, investimentos podem declarar explicitamente `aporteReservaEmergencia`; registros antigos permanecem `false`.

| Coleção | Responsabilidade |
| --- | --- |
| `contas` | saldo inicial e data-base por conta |
| `categorias` | classificação e orçamento mensal |
| `lancamentos` | receitas, despesas, investimentos, transferências e liquidações |
| `cartoes`, `dividas`, `metas` | cadastros financeiros auxiliares |
| `ativosInvestimento` | saldo atual manual por ativo/instituição; operações são apenas histórico |
| `despesasAnuais` | estimativas anuais usadas pela agenda e reserva mensal sugerida |
| `pagamentosCartao`, `pagamentosDividas` | histórico de liquidações |
| `operacoes` | envelope atômico e referências de movimentos compostos |
| `planejamentos` | receita, investimento e orçamentos por `AAAA-MM` |
| `fechamentos` | snapshots mensais imutáveis |
| `historico`, `lixeira`, `quarentena` | auditoria, recuperação e isolamento |
| `recurrenceDecisions` | decisões explícitas sobre candidatos a recorrência; detecções permanecem derivadas |

IDs são estáveis e referências ausentes são falhas de integridade. Datas civis usam `AAAA-MM-DD`; instantes de auditoria usam ISO-8601. Campos monetários persistidos são inteiros em centavos. Coleções ausentes são normalizadas para listas/objetos vazios, nunca compartilhados.
