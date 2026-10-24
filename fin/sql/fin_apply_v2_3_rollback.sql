-- FINANCEIRO — reversão da fin_apply v2.3 (PRESERVA tabelas, recibos e histórico; só remove a trava e as funções)
-- Uso de emergência: se a trava impedir uma escrita legítima e não for possível usar fin_apply nem o modo legado.
-- Passo mínimo (libera escrita direta imediatamente):
--   drop trigger if exists fin_escrita_t on public.fin_records;
-- Passo completo (remove também as funções; as tabelas fin_* e o histórico permanecem):
drop trigger if exists fin_escrita_t on public.fin_records;
drop trigger if exists fin_hist_trg on public.fin_records;
drop function if exists public.fin_apply(text,text,jsonb);
drop function if exists public.fin_op_result(text,text,text);
drop function if exists public.fin_escrita_guard();
drop function if exists public.fin_hist();
-- Não remove: fin_atores, fin_config, fin_canal_dono, fin_ops_log, fin_capture_items, fin_records_hist (evidências).
