-- Vantora 2: libera o tipo "nicho" (lista de nichos, com um ativo por vez).
-- Só muda a regra de tipos aceitos; nenhum dado de negócio neste arquivo.
alter table public.van2_records drop constraint van2_records_kind_check;
alter table public.van2_records add constraint van2_records_kind_check
  check (kind in ('produto','busca','nota','nicho'));
