# fin_apply v2.1 — plano, testes e limites (FCLD512, 23/10/2026)

Estado: **NÃO APLICADA em produção**. Evidência existente = ensaio em Postgres 16 local com stubs de auth/roles (não é Supabase).

## Arquivos
- `fin/sql/fin_apply_v2_1.sql` — implantação (usar esta; v1 e v2 NÃO).
- `fin/sql/fin_apply_v2_1_rollback_preservando.sql` — desativa funções/gatilho, mantém histórico, recibos e vínculos.
- `fin/sql/fin_apply_v2_1_rollback_remover_tudo.sql` — remove tudo, mas ABORTA se houver qualquer evidência gravada.
- `fin/sql/fin_apply_v2.sql` e `_rollback.sql` — v2 como entregue (referência histórica).
- `tests/fin_apply/` — `setup.sql`, `run_all.sh`, `run_v2.sh` (26), `run_v2_1.sh` (42), `run_reversao.sh`.

## Identidade do canal (revisão item 3)
O canal é decidido pela CREDENCIAL: `fin_atores(actor=auth.uid() -> canal, owner, ativo, expira)`.
Credencial de canal só usa o próprio canal; login comum só usa `fin`; revogada/expirada é recusada.
**Limite:** a conexão administrativa (sem login) ainda é aceita enquanto `fin_config.admin_canal_legado='sim'` (modo legado, canal NÃO autenticado).
Só será desligado quando GPT e Claude tiverem credenciais próprias. Até lá, quem usa a conexão administrativa pode contornar a função.

## Recibos (item 4)
`fin_op_result` usa a mesma resolução: canal só lê recibos do próprio canal; dono logado lê os dos seus canais; outra conta não lê nada.

## Captura/item (item 5)
Mesmo `capture_id`+`item_id` e mesmo conteúdo → devolve o registro existente (`na_lixeira` se for o caso). Conteúdo diferente → **erro de conflito** (nada gravado). Correção só por `update` com `expected_version`.

## Quatro categorias de teste (item 6)
| Categoria | O que prova | Estado |
|---|---|---|
| Transação desfeita (regras, sem deixar dado) | validação, repetição, conflito, canal, recibo | ENSAIO local: 42 passam. Produção: NÃO rodado |
| Persistido e autorizado | commit real, recuperar recibo após perda da resposta, aparecer no app/iPhone | NÃO rodado (depende de aplicar e de autorização do Marcelo; registros marcados `teste` e depois lixeira) |
| Sessões simultâneas | 1 só aplicação | ENSAIO local: 3 sessões → 1 registro. Supabase real: NÃO rodado |
| Duas contas reais | isolamento no Supabase | NÃO rodado (precisa de 2ª conta de teste real). Ensaio local simulou com 2 uuids |
Teste totalmente desfeito NÃO prova que o lançamento aparece no iPhone.

## Reversão (item 7)
Antes do uso: `remover_tudo` (só roda se as tabelas de evidência estão vazias). Depois do uso: `preservando`. Ambas testadas em ensaio.

## Migrações canceladas (item 2)
Duas chamadas de `apply_migration` (nome `fin_apply_v1_idempotencia_historico`, SQL da v1) devolveram exatamente `{"status":"cancelled"}`, sem texto de erro, sem código e sem nenhum objeto criado (conferido por consulta depois). Causa NÃO determinada: pode ser cancelamento de permissão (aprovação não dada/expirada enquanto o Marcelo dirigia), bloqueio de revisão ou falha técnica. Nada foi contornado.

## Próximo passo (item 9)
1. Revisar estes arquivos e a causa dos cancelamentos. 2. Definir implantação, testes reais e reversão. 3. Só então o Marcelo executa.
Função de borda: ALTERNATIVA a avaliar, não aprovada. A definir: autenticação, expiração/revogação e onde cada componente guarda a credencial (cofre do Supabase; nunca em chat/Drive/GitHub).
