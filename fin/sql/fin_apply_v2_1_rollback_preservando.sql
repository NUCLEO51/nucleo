-- DESATIVA a fin_apply v2.1 SEM destruir evidências: remove gatilho e funções; MANTÉM tabelas e linhas
-- (fin_records_hist, fin_ops_log, fin_capture_items, fin_atores, fin_canal_dono, fin_config).
-- Use esta depois que houver operações, histórico e recibos. Os dados de fin_records não são tocados.
drop trigger if exists fin_hist_trg on public.fin_records;
drop function if exists public.fin_apply(text,text,jsonb);
drop function if exists public.fin_op_result(text,text);
drop function if exists public.fin_resolve(text);
drop function if exists public.fin_check_refs(uuid,text,jsonb);
drop function if exists public.fin_validate(text,jsonb,boolean);
drop function if exists public.fin_hist();
