# fin_apply v2.2 — plano de implantação em produção (PREPARADO, NÃO EXECUTADO)

Status: **NÃO APLICADA. NÃO homologada.** Aguarda reauditoria da AUD512 e janela decidida por Marcelo. FALSE_SUCCESS=ZERO.

## Pré-condições (todas)
1. AUD512 reaudita com `FIN-APPLY-V2_2-HOMOLOGACAO-RESULTADO.md` (REST 10 PASS no Mac; 190 ok do app) e dá GO.
2. Marcelo autoriza a janela por escrito no chat.
3. Backup imediato antes: `select public.fazer_backup();` e exportação dos dados (não apenas o backup no mesmo banco).
4. Rollback à mão: `fin_apply_v2_2_rollback_preservando.sql` (mantém evidências).

## Arquivo a usar
`fin/sql/fin_apply_v2_2_producao_sem_drop.sql` = idêntico ao `fin_apply_v2_2.sql` menos a linha `drop trigger if exists fin_hist_trg` (o gatilho não existe em produção; se existisse, o `create trigger` falha e nada é aplicado, o que é seguro). Motivo: instruções com DROP são canceladas pela ferramenta MCP (observado no projeto de teste).

## Passos
1. Conferir o estado: nenhuma tabela/função `fin_*` além de `fin_guard`; contar `fin_records`.
2. Aplicar o arquivo (uma transação). Verificar objetos criados e que `fin_records` não mudou de contagem.
3. Credenciais de canal (`fin_ator_registrar`) só depois de criar usuários de Auth por canal. O modo legado nasce desligado: nenhum chat que hoje grava pela conexão administrativa continuará gravando via `fin_apply` até haver credencial ou até Marcelo ligar o legado com prazo.
4. Prova pós-implantação com dados marcados como teste e movidos para a lixeira; leitura no app.
5. Escrita direta na tabela pela conexão administrativa continua possível (risco principal, não fechado por esta migração).

## O que NÃO muda
`fin_records` (dados, RLS, gatilho fin_guard). Novo: gatilho AFTER UPDATE `fin_hist_trg` grava histórico.
