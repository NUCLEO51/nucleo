# fin_apply v2.2 — resultado da homologação parcial (23/10/2026)

Status: **PARCIAL. NÃO HOMOLOGADA. NÃO aplicada em produção.** FALSE_SUCCESS=ZERO.
Autorização: Marcelo autorizou criar um projeto Supabase de teste (23/10/2026). Produção (`cptvxfzgimeawheqrhvz`) não foi tocada por estes testes.

## Ambiente
- Projeto separado `financeiro-homologacao` (plano gratuito, região sa-east-1), sem dados reais.
- Esquema de `fin_records` copiado da produção (colunas, RLS fin_ins/fin_sel/fin_upd, gatilho fin_guard).
- fin_apply v2.2 aplicada em 3 migrações (as mesmas instruções de `fin/sql/fin_apply_v2_2.sql`; ver "Achado sobre o cancelamento").
- 3 usuários de Auth de teste (2 contas + 1 credencial de canal), senhas geradas ao acaso e mantidas só fora do repositório.
- Testes executados no Postgres 17 REAL do Supabase (RLS, grants e `auth.uid()` reais) simulando o login com `set local role authenticated` + `request.jwt.claims`. **Não** passaram pelo caminho REST/JWT: o ambiente do FCLD não alcança a internet desse projeto (proxy bloqueia), então `rest_homologacao.sh` NÃO foi executado.

## Passou (Supabase real, via SQL com papel simulado)
| # | Prova | Resultado |
|---|---|---|
| H1 | visitante anônimo não executa fin_apply | negado (42501) |
| H2 | conta 1 grava; leitura posterior por outra sessão | gravado e persistido |
| H3 | mesmo pedido repetido | `repetida=true`, 1 registro |
| H4 | conta 2 tenta alterar registro da conta 1 | "não encontrado para este dono"; conta 2 vê 0 registros |
| H5 | conta 2 lê recibo da conta 1 sabendo o op_id | null |
| H6 | 6 chamadas com o mesmo op_id | 1 registro (1 criou, 5 repetidas). Ressalva: disparadas em paralelo pela ferramenta, simultaneidade real não garantida |
| H7 | recibo recuperável (resposta perdida) | devolve o id |
| H8 | mesmo op_id, conteúdo diferente | conflito |
| H9 | login comum se passa por canal gpt | negado |
| C1 | credencial de canal grava com dono vindo do cadastro, não do pedido | dono correto |
| C2 | credencial de canal usa outro canal (fin) | negado |
| C3 | operação fora das permitidas (delete) | negado |
| C4 | capture_id/item de outro canal | negado, sem devolver dados |
| C5 | revogação | negado ("revogada ou expirada") |
| C6 | expiração | negado |
| C7 | login comum chama fin_ator_registrar | permission denied |
| C8 | registrar como ator quem já é dono de dados | negado |
| L1 | conexão administrativa sem login, modo legado desligado (padrão) | negado |
| L2 | legado ligado com prazo de 1 h | permitido; contado em `fin_legado_uso` |
| L3 | legado com prazo vencido | negado |
| V1 | update com versão desatualizada | conflito de versão, devolve estado atual |
| V2 | delete (lixeira) → restore | versões 2→3→4 |
| V3 | histórico | 3 linhas com canal, ator, op_id, versão anterior e posterior |
| V4 | saldo negativo em update (registro mesclado) | recusado |
| P1 | logado comum altera `fin_records_hist` | permission denied |
| P2 | logado comum lê `fin_ops_log` | permission denied |
| R1 | guarda do rollback "remover tudo" com evidência (11 linhas) | aborta: "Nada foi removido" |

## NÃO provado
- Caminho REST/JWT e `rest_homologacao.sh` (rede bloqueada).
- Leitura do lançamento pelo aplicativo / iPhone.
- Simultaneidade real entre conexões independentes.
- Trechos com DROP dos dois rollbacks: a ferramenta cancelou a execução (nada removido; conferido). `rollback_preservando` NÃO foi executado.
- Dependências reais do modo legado na produção; escrita direta pela conexão administrativa continua possível (risco principal, não fechado).
- Conciliação entre fontes, backup externo e teste de restauração.

## Achado sobre o cancelamento da ferramenta (causa provável)
As duas tentativas anteriores e mais duas desta sessão retornaram `{"status":"cancelled"}` sem criar nada. Eram exatamente as instruções que continham `DROP ...` (`drop trigger if exists`, rollbacks). A mesma migração sem o `drop trigger if exists` (trigger recém-criado) foi aplicada com sucesso. Hipótese compatível: instruções destrutivas pedem confirmação e a ferramenta cancela. Para produção: o arquivo v2.2 contém `drop trigger if exists fin_hist_trg` e precisa de execução manual pelo Marcelo/AUD ou de confirmação, ou ser dividido (a linha é desnecessária onde o gatilho não existe).

## Recomendação
Reauditoria da AUD512 com esta evidência; executar `rest_homologacao.sh` e o passo do app a partir de uma máquina com acesso ao projeto de teste (ex.: Mac); executar os rollbacks com DROP; só então janela de produção. Fechar a escrita direta antes de declarar a integração pronta.
