-- FINANCEIRO — remove TUDO da fin_apply (funções, triggers, view e tabelas auxiliares). NÃO aplicar sem autorização do Marcelo.
-- NÃO apaga evidências: se houver QUALQUER linha em fin_records_hist, fin_ops_log ou fin_capture_items, ABORTA e nada é removido
-- (use fin_apply_v2_4_rollback_preservando.sql). fin_records (os dados financeiros) nunca é apagada nem alterada por este script.
-- ATÔMICO: trava as tabelas, conta, remove, tudo na mesma transação; qualquer erro (inclusive espera de trava > 15s) desfaz tudo.
-- Rode com:  psql -v ON_ERROR_STOP=1 -f fin_apply_v2_4_rollback_remover_tudo.sql
begin;
set local lock_timeout = '15s';
lock table public.fin_records, public.fin_records_hist, public.fin_ops_log, public.fin_capture_items in access exclusive mode;
do $$
declare n bigint;
begin
  select (select count(*) from public.fin_records_hist)+(select count(*) from public.fin_ops_log)+(select count(*) from public.fin_capture_items) into n;
  if n>0 then raise exception 'Há % linhas de evidência (histórico/recibos/vínculos). Nada foi removido. Use fin_apply_v2_4_rollback_preservando.sql', n; end if;
end $$;
drop trigger fin_escrita_t on public.fin_records;
drop trigger fin_hist_trg on public.fin_records;
drop view public.fin_legado_uso;
drop function public.fin_apply(text,text,jsonb);
drop function public.fin_op_result(text,text,text);
drop function public.fin_ator_registrar(uuid,text,uuid,int,text[]);
drop function public.fin_ator_revogar(uuid);
drop function public.fin_resolve(text);
drop function public.fin_check_refs(uuid,text,jsonb);
drop function public.fin_validate_full(text,jsonb);
drop function public.fin_validate(text,jsonb,boolean);
drop function public.fin_escrita_guard();
drop function public.fin_hist();
drop function public.fin_service_ok();
drop table public.fin_capture_items, public.fin_ops_log, public.fin_atores, public.fin_config, public.fin_canal_dono, public.fin_records_hist;
commit;
