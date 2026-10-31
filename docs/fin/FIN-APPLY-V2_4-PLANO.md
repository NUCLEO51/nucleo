# fin_apply v2.4 — resposta à revisão do GPT (commit 2e13f79)

Estado: **PROPOSTA EM BRANCH. NÃO aplicada em produção. Nenhum SQL foi pedido ao Marcelo. Nenhum dado foi alterado.**
Branch: `fcld512/fin-apply-v2-4-20261030`. Arquivos: `fin/sql/fin_apply_v2_4.sql`, `fin_apply_v2_4_rollback_preservando.sql`, `fin_apply_v2_4_rollback_remover_tudo.sql`, `tests/fin_apply/run_v2_4_all.sh`, `run_v2_4.sh`, `stub_auth_role.sql`.

## Conferência dos 4 achados
O commit 2e13f79 é a v2.1. Em produção está a v2.3. Cada achado foi conferido contra a v2.1 e contra a v2.3.

| # | Achado | Na v2.1 | Na v2.3 (produção) | v2.4 |
|---|--------|---------|--------------------|------|
| 1 | Recibo repetido sem verificar o canal | Procedente (busca por dono+op_id) | Parcial: a busca já usa dono+canal, mas não confere permissões nem a linha lida; ator que perdeu a permissão ainda recebia o recibo | Dono e canal conferidos de forma explícita (igual ao fin_op_result), operações do pedido reavaliadas contra as permissões atuais; fin_op_result confere a linha lida |
| 2 | Tipos de data incorretos e remoção de obrigatórios por update | Procedente | Procedente: data numérica/objeto/lista/booleano aceita; mês 13 aceito; texto com número aceito; update esvaziava date/totalC/desc da compra e entries/account do extrato | Validação de tipo para todos os campos conhecidos + obrigatórios por tipo sobre o registro completo (create, update já mesclado, restore) |
| 3 | Ausência de login = administrador | Procedente | Procedente: qualquer conexão sem login e sem papel era admin dentro da janela legada, inclusive escrita direta | `fin_service_ok()` exige papel `service_role` ou conexão `postgres`/`supabase_admin`; vale em fin_resolve, fin_op_result e na trava de escrita direta; ator do histórico vira `servico:<papel>` |
| 4 | Reversão não atômica/sem proteger evidência | Procedente | Procedente: script sem transação, sem limite de espera, deixava o estado pela metade se um passo falhasse | Duas reversões em uma transação, lock_timeout 15s, conferência final de contagens; "remover tudo" aborta se existir qualquer evidência |

## Revisão do GPT sobre eb5d449 — o que mudou (rodada 2)
1. **Campo ausente passava**: `jsonb_typeof(chave ausente)` devolve NULL e o `IF ... <> 'x'` não recusava. Todas as checagens passaram a `IS DISTINCT FROM` (ausente, null, tipo errado e valor inválido são casos distintos e testados).
2. **Update/restore**: agora rodam `fin_validate` (tipos) E `fin_validate_full` (obrigatórios) sobre o registro COMPLETO mesclado/restaurado. Registro antigo inválido não é corrigido em silêncio: a operação é recusada com o motivo; um update que conserta o campo é aceito.
3. **Testes**: o auxiliar `t()` agora só dá PASS se (a) a saída tem `ERROR` com o padrão esperado, (b) NÃO contém `"ok": true`, (c) a impressão digital do banco (registros, versões, conteúdo, lixeira, recibos, histórico, vínculos) é idêntica antes e depois. Texto obrigatório só com espaços/tab/quebra de linha é recusado (trim). O falso PASS do 2.5b foi reproduzido (na v2.3 vira FALHA) e a regra corrigida.

## Resultados dos ensaios (PostgreSQL 16 local de ensaio, NÃO é o Supabase real; resultado relatado pelo FCLD, não validação independente)
- `bash tests/fin_apply/run_v2_4_all.sh baseline` (só v2.3): 51 PASS / 72 FALHA — achados 1–4 reproduzidos, inclusive ausência de dueDay/date/totalC/entries, itens de extrato incompletos e creditor só com espaços.
- `bash tests/fin_apply/run_v2_4_all.sh v24` (v2.3 + v2.4): **126 PASS / 0 FALHA**.
- Teste de mutação: trocando `IS DISTINCT FROM` de volta por `<>` na v2.4, 13 testes passam a FALHAR (2.21a, 2.25a–c, 2.26a, 2.27b, 2.31a–d, 2.31j, 2.42b...), ou seja, os testes pegam exatamente o defeito apontado.
- Suítes antigas (`run_v2_2.sh`, `run_auditoria.sh`): as mesmas 3 falhas (T19c, A1f, A8k) com v2.3 e com v2.3+v2.4 (expectativas defasadas, sem regressão).

## Dados existentes (somente leitura em produção, sem alterar nada)
Duas consultas de leitura em `fin_records` (obrigatórios por tipo e tipos de todas as chaves conhecidas, inclusive itens de extrato): zero violações, exceto 1 proposal de configuração (`cfg=sortprefs`), já coberta pela regra (teste 2.15). Logo, update e restore de registros existentes não seriam bloqueados pela v2.4.

## Estado de produção
**v2.4 NÃO aplicada.** Produção está na v2.3 (aplicada antes); não foi alterada nesta rodada. Não há testes de autenticação real: `auth.role()`/JWT são simulados no ensaio; isso só se resolve na homologação do projeto de teste.

## Riscos e limites declarados
- Ensaio em Postgres local com stubs; `auth.role()` foi simulado por `request.jwt.claim.role`. No Supabase real isso precisa ser homologado no projeto de teste (`qpatefninytydnsmkfjp`) antes de qualquer produção.
- Não foi testada a conexão real como `postgres`/`supabase_admin` nem a chave de serviço do Supabase; se algum canal legado hoje usa outro papel, a v2.4 o bloqueará (comportamento desejado, mas precisa ser inventariado antes).
- `fin_service_ok` aceita `session_user in (postgres, supabase_admin)` para que o editor SQL/migrações continuem funcionando.
- Reversões foram testadas com erro no meio, sem ON_ERROR_STOP, com evidência presente e ausente, e com trava ocupada por outra sessão.

## Próximo passo (depende de autorização do Marcelo e reauditoria)
Homologar no projeto de teste, auditar (AUD512), e só então decidir a aplicação em produção.

## Homologação v2.4 (commit 472ec1b) — projeto de TESTE do Supabase (qpatefninytydnsmkfjp)
Autorizada por Marcelo exclusivamente no projeto de teste. **Produção: v2.4 NÃO aplicada. Nada foi alterado em produção nesta etapa** (só leituras).
Método: Supabase real (Postgres 17, PostgREST, GoTrue), contas reais de teste, chamadas HTTP reais por um executor temporário (edge function, já desativado); cada resposta gravada em `hml_ev` e os registros conferidos no banco após cada lote. Resultado = **registrado por FCLD512; não é validação independente**.

| Lote | Área | Resultado |
|---|---|---|
| b1_auth | autenticação real, token forjado, anon | OK (forjado e anon recusados) |
| b2_canais | isolamento entre duas contas, permissão por canal | OK |
| b3/b4/b5 | serviço com legado desligado / ligado / vencido | OK (service_role só passa com legado ligado e no prazo) |
| b6 | repetição com permissão reduzida | OK (recusada) |
| b7 | revogação | OK |
| b8 | expiração | OK |
| b9 | simultaneidade: mesma op_id, mesma captura, ops distintas (40 chamadas) | OK (1 gravação por op_id/captura) |
| b10 | 12 updates simultâneos, mesma versão | **PARCIAL — ver achado** |

### Achado novo (b10): conflito de versão vira laço de repetição via PostgREST
- Das 12 chamadas, só 1 gravou (correto: versão 2, 1 histórico, 1 recibo). Integridade confirmada: nenhuma gravação parcial.
- As outras 11 receberam "conflito de versão" (errcode 40001) e foram **repetidas automaticamente a cada ~1 s, por mais de 5 min**, sem terminar; só parou ao desativar o executor e encerrar as conexões do PostgREST. O pg_net desistiu por timeout de 120 s.
- Causa provável (NÃO comprovada): PostgREST 14 repete transações com SQLSTATE 40001. Ainda não testado com outro código.
- Proposta (v2.5, não feita): conflito de versão deve usar um código que NÃO é repetido e retorna HTTP 409 (ex.: errcode 'PT409'), com teste real. Até lá, não usar edição concorrente com mesma versão via REST. Em produção a fin_apply ainda não é usada por nenhuma integração.

### Não executado / limites
- **Reversão no projeto hospedado NÃO executada**: a confirmação da operação destrutiva (drop de tabelas/funções) foi cancelada automaticamente pelo cliente; não contornei. Reversão só provada no ensaio local (testes 4.1–4.5).
- Caminho negativo "sessão não-postgres sem claim" não reproduzível no Supabase hospedado; só no ensaio local.
- Persistência fina (strings `servico:<usuário>`, `updated_by` por canal) conferida nos lotes, sem relatório separado.
- Limpeza: executor `hml-runner` substituído por stub 410 (sem token); config de legado do TESTE voltou a 'nao'. Permanecem no teste: usuários/atores de teste, schema `hml`, `hml_ev`, pg_net.

### Dependência do acesso legado (produção, somente leitura)
- Vence em 2026-10-31 02:57 UTC (≈23:57 BRT de 30/10). **Não estendi.**
- Só o canal `claude` (MCP como postgres) grava sem login. Nenhuma integração usa fin_apply/credenciais ainda; helena sem mapeamento.
- Se vencer: o MCP continua (session_user postgres, aceito pela v2.4); qualquer outra conexão sem login para de gravar.

## v2.5 — correção do laço de repetição no conflito de versão (somente branch + projeto de TESTE)
**v2.5 NÃO aplicada em produção.** Única diferença para a v2.4 (`diff` de 1 linha): `fin_apply` levanta o conflito de versão com `errcode='PT409'` em vez de `40001`. Arquivo: `fin/sql/fin_apply_v2_5.sql`.
- Ensaio local (Postgres 16 com stubs): `bash tests/fin_apply/run_v2_4_all.sh v25` → 129 PASS / 0 FALHA (126 anteriores + 5.1 conflito=PT409, 5.2 não usa 40001, 5.3 registro inalterado). Controle negativo: a mesma suíte carregando a v2.4 FALHA em 5.1 e 5.2.
- Projeto de teste (API real): `fin_apply` atualizada por migração (hash do corpo da função idêntico ao do ensaio local: md5 38af4eb1…, grants preservados). Lote b11: 12 updates simultâneos, mesma versão → 1×200 e 11×409 (corpo `code: PT409`), tempo máximo 1,7 s, 0 sessões ativas depois, 1 recibo e 1 histórico, registro na versão 3. **O laço da v2.4 (40001) não ocorreu.** Causa (PostgREST repete 40001) agora é consistente com a evidência, mas segue sem confirmação na documentação do PostgREST.
- Resultado registrado por FCLD512; não é validação independente.
- Executor `hml-runner` voltou a stub 410. Reversão no projeto hospedado continua NÃO executada (confirmação do SQL destrutivo cancelada automaticamente).
