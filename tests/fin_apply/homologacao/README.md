# Homologação da fin_apply v2.2 (Supabase de teste) — STATUS: NÃO EXECUTADA

Testes locais em Postgres de ensaio (stubs) **não substituem** isto. Nada aqui roda em produção; credenciais de produção NÃO são usadas.

## Pré-requisitos (decisão do Marcelo: criar o ambiente)
1. Um projeto Supabase **separado** (homologação) com a tabela `fin_records` no mesmo formato (cópia do esquema, sem dados reais).
2. Aplicar `fin/sql/fin_apply_v2_2.sql` nesse projeto.
3. Duas contas reais de teste em Authentication (e-mail/senha), ex.: `teste1@…`, `teste2@…`.
4. As chaves ficam em variáveis do terminal. Nunca em arquivo do repositório, Drive, chat ou log.

## Ordem e critério
| Passo | Comando | Prova |
|---|---|---|
| 1 | `bash tests/fin_apply/homologacao/rest_homologacao.sh` | autenticação, isolamento entre 2 contas, concorrência, persistência, recibo, conflito, canal |
| 2 | Abrir o app apontado para a homologação e conferir que o lançamento H2 aparece | leitura pelo aplicativo |
| 3 | Credenciais de canal: criar usuário de Auth para o canal e chamar `select fin_ator_registrar('<uuid>','gpt','<uuid dono>',7)` como serviço; testar canal alheio, revogação e expiração | autenticação por canal |
| 4 | `fin_legado_uso`: confirmar zero uso antes de qualquer decisão sobre o modo legado | transição segura |
| 5 | Reversão: `rollback_remover_tudo` COM evidências deve abortar; `rollback_preservando` mantém dados | reversão |

O script recusa rodar se `SUPABASE_URL` contiver o identificador do projeto de produção.

## O que continua sem prova até executar
Execução em Supabase real; dupla conta real; leitura no app; modo legado: dependências reais ainda não medidas (a função é nova: hoje nenhum chat a usa; o que ainda contorna as regras é a escrita DIRETA na tabela pela conexão administrativa, que esta migração NÃO fecha).
