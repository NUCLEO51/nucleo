-- DESATIVA a fin_apply v2.2 SEM destruir evidências: remove gatilho, funções e view; MANTÉM todas as tabelas e linhas
-- (fin_records_hist, fin_ops_log, fin_capture_items, fin_atores, fin_canal_dono, fin_config). Dados de fin_records intocados.
-- Transação única; espera no máximo 15s por travas (se uma operação estiver em curso, falha com segurança e pode ser repetido).
begin;
set local lock_timeout = '15s';
lock table public.fin_records in share row exclusive mode;
drop trigger if exists fin_hist_trg on public.fin_records;
drop view if exists public.fin_legado_uso;
drop function if exists public.fin_apply(text,text,jsonb);
drop function if exists public.fin_op_result(text,text,text);
drop function if exists public.fin_ator_registrar(uuid,text,uuid,int,text[]);
drop function if exists public.fin_ator_revogar(uuid);
drop function if exists public.fin_resolve(text);
drop function if exists public.fin_check_refs(uuid,text,jsonb);
drop function if exists public.fin_validate_full(text,jsonb);
drop function if exists public.fin_validate(text,jsonb,boolean);
drop function if exists public.fin_hist();
commit;
