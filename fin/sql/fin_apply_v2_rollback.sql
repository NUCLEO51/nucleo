-- Desfaz a fin_apply v2. Os dados em fin_records NÃO são tocados.
-- Atenção: apaga também o histórico e o recibo de operações criados pela v2.
drop trigger if exists fin_hist_trg on public.fin_records;
drop function if exists public.fin_apply(text,text,jsonb);
drop function if exists public.fin_op_result(text,text);
drop function if exists public.fin_owner_for(text);
drop function if exists public.fin_check_refs(uuid,text,jsonb);
drop function if exists public.fin_validate(text,jsonb,boolean);
drop function if exists public.fin_hist();
drop table if exists public.fin_capture_items;
drop table if exists public.fin_ops_log;
drop table if exists public.fin_canal_dono;
drop table if exists public.fin_records_hist;
