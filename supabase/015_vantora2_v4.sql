-- Vantora 2 v4: libera os tipos "pedido" (pedido de caça ao Claude), "regra" (números oficiais da Shopee e do MEI)
-- e "check" (marcações do checklist para começar a vender). Nenhum dado de negócio neste arquivo.
alter table public.van2_records drop constraint van2_records_kind_check;
alter table public.van2_records add constraint van2_records_kind_check
  check (kind in ('produto','busca','nota','nicho','pedido','regra','check'));
