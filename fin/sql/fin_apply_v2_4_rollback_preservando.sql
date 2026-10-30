-- FINANCEIRO — reversão da fin_apply v2.4/v2.3 que PRESERVA dados e evidências. NÃO aplicar sem autorização do Marcelo.
-- Remove só triggers, view e funções. Tabelas (fin_records, fin_records_hist, fin_ops_log, fin_capture_items, fin_atores,
-- fin_config, fin_canal_dono) ficam intactas. ATÔMICO: uma transação; qualquer erro (inclusive trava ocupada por mais de 15s)
-- desfaz TUDO — nada fica pela metade. No fim confere que nenhuma linha de evidência mudou; se mudou, aborta e desfaz.
-- Rode com:  psql -v ON_ERROR_STOP=1 -f fin_apply_v2_4_rollback_preservando.sql   (ou cole inteiro no editor SQL: ele já é uma transação)
-- Para voltar só da v2.4 para a v2.3: reaplicar fin_apply_v2_3.sql (create or replace) e depois: drop function public.fin_service_ok();
begin;
set local lock_timeout = '15s';
lock table public.fin_records, public.fin_records_hist, public.fin_ops_log, public.fin_capture_items in access exclusive mode;
create temp table _fin_rb_antes on commit drop as
  select (select count(*) from public.fin_records) rec, (select count(*) from public.fin_records_hist) hist,
         (select count(*) from public.fin_ops_log) ops, (select count(*) from public.fin_capture_items) cap,
         (select count(*) from public.fin_atores) atores;
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
do $$
declare a record; d record;
begin
  select * into a from _fin_rb_antes;
  select (select count(*) from public.fin_records) rec, (select count(*) from public.fin_records_hist) hist,
         (select count(*) from public.fin_ops_log) ops, (select count(*) from public.fin_capture_items) cap,
         (select count(*) from public.fin_atores) atores into d;
  if a.rec<>d.rec or a.hist<>d.hist or a.ops<>d.ops or a.cap<>d.cap or a.atores<>d.atores then
    raise exception 'reversão abortada: contagem de dados/evidências mudou (antes % depois %). Nada foi alterado.', a, d; end if;
end $$;
commit;
