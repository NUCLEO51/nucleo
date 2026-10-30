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
