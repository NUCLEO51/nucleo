# fin_apply v2.2 — correções do NO-GO da AUD512 (FCLD512, 23/10/2026)

**Estado: NÃO APLICADA em produção. NÃO homologada.** Evidência = Postgres 16 de ensaio com stubs de auth/roles (não é Supabase).
Não foi usada nenhuma credencial de produção, nenhum registro financeiro real foi alterado, nada foi publicado na main.

## Arquivos (usar SOMENTE a v2.2)
- `fin/sql/fin_apply_v2_2.sql` · `fin_apply_v2_2_rollback_preservando.sql` · `fin_apply_v2_2_rollback_remover_tudo.sql`
- Testes: `tests/fin_apply/` → `run_v2_2.sh` (41, regressão), `run_auditoria.sh` (29), `run_reversao_concorrente.sh` (5), `run_all.sh`, `setup.sql`
- Homologação preparada (NÃO executada): `tests/fin_apply/homologacao/README.md` e `rest_homologacao.sh` (recusa rodar contra o projeto de produção)
- Históricos (NÃO usar): `fin_apply_v2.sql`, `fin_apply_v2_1*.sql`; a v1 nunca foi commitada

## Os 5 pontos da AUD512
| # | Ponto | Reprodução (v2.1) | Correção (v2.2) |
|---|---|---|---|
| 1 | Isolamento entre canais | Canal B reutilizando o `op_id` do canal A recebia o resultado de A (registro incluso); conflito vazava existência; `capture_id/item_id` de outro canal devolvia o registro; dono logado lia recibo de qualquer canal | Recibo e `op_id` por **(dono, canal, op_id)**; capture/item de outro canal é recusado **sem devolver dados**; `fin_op_result(op, source, canal)`: canal só lê o próprio, dono logado precisa indicar o canal (padrão `fin`); `ops` permitidas por credencial (ex.: só `create`) |
| 2 | Modo legado | Nascia `sim`, sem prazo, sem medição, sem ciclo de vida de credenciais | Nasce **`nao`** (fail-closed). Só vale com `admin_canal_legado='sim'` **e** prazo `admin_canal_legado_ate` futuro; vencido volta a recusar. Uso medido em `fin_legado_uso`. `fin_ator_registrar` (com expiração e ops) e `fin_ator_revogar`, só serviço |
| 3 | Registro completo após update parcial | Aceitava esvaziar `creditor`/`name`/`cardId`, saldo negativo, `status` inválido, `nInst=0`, alterar `capture_id/item_id/src`, restaurar charge com cartão na lixeira | Valida o registro **mesclado** (`fin_validate_full`): obrigatórios, não negativos, status, `nInst>=1`; identidade imutável; restore revalida tudo e as referências |
| 4 | Supabase real | — | Roteiro e script prontos; **não executados** (ver abaixo) |
| 5 | Reversão | A contagem e a remoção não eram atômicas em relação a gravações | `LOCK` de `fin_records` + 3 tabelas de evidência **antes** de contar, na mesma transação; `lock_timeout` 15 s; abortar sem remover nada se houver evidência |

## Resultados verificáveis (ensaio local)
- v2.1 contra `run_auditoria.sh`: **5 PASS, 24 FALHA** (problemas reproduzidos).
- v2.2: regressão **41 PASS**, auditoria **29 PASS**, reversão concorrente **5 PASS**; 0 falhas.
- Correção de relato anterior: "42" da v2.1 era 41 (contagem incluía a linha final).
- Concorrência testada: 3 sessões simultâneas com o mesmo op_id → 1 registro; remover_tudo contra gravação em curso → espera e aborta preservando recibo (R1); gravação concorrente com remoção → falha segura sem registro órfão (R3); trava ocupada → reversão desiste em 15 s (R5).

## Decisões documentadas
- Atualização parcial valida **referências só quando o patch toca a referência** (A8k): editar a descrição de uma compra cujo cartão foi para a lixeira continua possível. `restore` revalida tudo.
- Edição entre canais do mesmo dono continua possível, controlada por `expected_version` e limitada por `ops` da credencial. Se a AUD quiser "cada canal só edita o que criou", é uma regra a mais (não implementada).

## Riscos restantes
1. **A migração não fecha a escrita direta na tabela.** Quem tem a conexão administrativa continua podendo gravar em `fin_records` sem passar pela função. Só se fecha com credencial restrita + revogação de escrita direta (etapa seguinte, ainda sem desenho aprovado; função de borda é só uma alternativa a avaliar).
2. Credenciais por canal exigem criar usuários em Supabase Auth (fora do SQL) e guardar a credencial em cofre. Nada disso foi feito.
3. Dependências reais do modo legado **não medidas**: como a função é nova, hoje nenhum chat a usa; a dependência real é a escrita direta (item 1). Só desligar/religar com base em `fin_legado_uso` e na existência de credencial testada para cada canal.
4. Ensaio ≠ Supabase: semântica real de `auth.uid()`, grants padrão de novas tabelas/funções, `service_role`, PostgREST e RLS precisam ser provados na homologação.
5. Sem conciliação entre fontes (só evidência `data.src`), sem backup fora do banco, sem teste de restauração.
6. Seed de `fin_canal_dono` assume um único dono na tabela no momento de aplicar.

## Recomendação técnica
**Não aplicar em produção.** Próxima etapa: (a) o Marcelo autoriza criar um projeto Supabase de **homologação**; (b) executar `homologacao/README.md` passos 1 a 5 e anexar a saída; (c) AUD512 reaudita com essa evidência; (d) só então definir a janela de produção, com backup prévio e reversão `preservando` pronta. O fechamento da escrita direta (risco 1) deve ser desenhado e aprovado antes de qualquer "integração pronta".
