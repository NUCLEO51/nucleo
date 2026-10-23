-- REMOVE tudo da v2.1, inclusive tabelas. SÓ roda se as tabelas de evidência estiverem VAZIAS (antes do primeiro uso).
-- Se houver qualquer histórico, recibo ou vínculo, ABORTA e manda usar o rollback_preservando.
do $$
declare n bigint;
begin
  select (select count(*) from public.fin_records_hist)+(select count(*) from public.fin_ops_log)+(select count(*) from public.fin_capture_items) into n;
  if n>0 then raise exception 'Há % linhas de evidência (histórico/recibos/vínculos). Use fin_apply_v2_1_rollback_preservando.sql', n; end if;
end $$;
drop trigger if exists fin_hist_trg on public.fin_records;
drop function if exists public.fin_apply(text,text,jsonb);
drop function if exists public.fin_op_result(text,text);
drop function if exists public.fin_resolve(text);
drop function if exists public.fin_check_refs(uuid,text,jsonb);
drop function if exists public.fin_validate(text,jsonb,boolean);
drop function if exists public.fin_hist();
drop table if exists public.fin_capture_items, public.fin_ops_log, public.fin_atores, public.fin_config, public.fin_canal_dono, public.fin_records_hist;
