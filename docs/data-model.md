# Modelo de dados — schema v6

O estado persistido é um documento JSON local. `schemaVersion: 6` e `__centsVersion: 1` identificam o contrato atual.

| Coleção | Responsabilidade |
| --- | --- |
| `contas` | saldo inicial e data-base por conta |
| `categorias` | classificação e orçamento mensal |
| `lancamentos` | receitas, despesas, investimentos, transferências e liquidações |
| `cartoes`, `dividas`, `metas` | cadastros financeiros auxiliares |
| `pagamentosCartao`, `pagamentosDividas` | histórico de liquidações |
| `operacoes` | envelope atômico e referências de movimentos compostos |
| `planejamentos` | receita, investimento e orçamentos por `AAAA-MM` |
| `fechamentos` | snapshots mensais imutáveis |
| `historico`, `lixeira`, `quarentena` | auditoria, recuperação e isolamento |

IDs são estáveis e referências ausentes são falhas de integridade. Datas civis usam `AAAA-MM-DD`; instantes de auditoria usam ISO-8601. Campos monetários persistidos são inteiros em centavos. Coleções ausentes são normalizadas para listas/objetos vazios, nunca compartilhados.
