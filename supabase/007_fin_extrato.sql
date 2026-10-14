-- FIN: aceita o tipo "stmt" (extrato importado do Mobills). Rodar UMA vez no SQL Editor do Supabase.
alter table public.fin_records drop constraint if exists fin_records_kind_check;
alter table public.fin_records add constraint fin_records_kind_check
  check (kind in ('card','charge','invpay','bill','billmonth','debt','proposal','stmt'));
