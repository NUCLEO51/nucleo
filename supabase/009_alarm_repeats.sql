-- Núcleo: repetição do aviso do alarme (já aplicado no Supabase em 14/10/2026).
-- Depois do primeiro aviso, a função enviar-alarmes manda de novo a cada minuto (4 vezes) até o app ser aberto.
-- O app, ao abrir, apaga as repetições do próprio dono (por isso só DELETE e SELECT próprios, nunca INSERT).
create table if not exists public.alarm_repeats (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null,
  alarm_id uuid,
  message text not null,
  next_at timestamptz not null,
  sent int not null default 1,
  total int not null default 5,
  created_at timestamptz not null default now()
);
create index if not exists alarm_repeats_next on public.alarm_repeats(next_at);
alter table public.alarm_repeats enable row level security;
revoke all on public.alarm_repeats from anon, authenticated;
grant select, delete on public.alarm_repeats to authenticated;
drop policy if exists alarm_repeats_del on public.alarm_repeats;
create policy alarm_repeats_del on public.alarm_repeats for delete to authenticated using (owner = auth.uid());
drop policy if exists alarm_repeats_sel on public.alarm_repeats;
create policy alarm_repeats_sel on public.alarm_repeats for select to authenticated using (owner = auth.uid());
