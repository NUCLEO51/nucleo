-- REMOVE tudo da v2.2, inclusive tabelas. SÓ conclui se as tabelas de evidência estiverem VAZIAS.
-- A ordem importa: primeiro TRAVA (fin_records e as 3 tabelas de evidência, na mesma ordem que a fin_apply usa, sem deadlock),
-- depois CONTA, depois REMOVE, tudo na MESMA transação. Nenhuma operação consegue gravar evidência entre a contagem e a remoção.
-- Se houver qualquer linha de evidência: ABORTA tudo (nada é removido). Use então fin_apply_v2_2_rollback_preservando.sql.
-- Se uma operação estiver em curso, espera até 15s e falha com segurança (pode repetir depois).
begin;
set local lock_timeout = '15s';
lock table public.fin_records, public.fin_records_hist, public.fin_ops_log, public.fin_capture_items in access exclusive mode;
do $$
declare n bigint;
begin
  select (select count(*) from public.fin_records_hist)+(select count(*) from public.fin_ops_log)+(select count(*) from public.fin_capture_items) into n;
  if n>0 then raise exception 'Há % linhas de evidência (histórico/recibos/vínculos). Nada foi removido. Use fin_apply_v2_2_rollback_preservando.sql', n; end if;
end $$;
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
drop table if exists public.fin_capture_items, public.fin_ops_log, public.fin_atores, public.fin_config, public.fin_canal_dono, public.fin_records_hist;
commit;
