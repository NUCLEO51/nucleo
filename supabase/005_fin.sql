-- FIN: tabela própria, separada do Núcleo. Rodar UMA vez no SQL Editor do Supabase.
-- Cada linha pertence a um dono (owner). Só o dono lê e altera. Valores em centavos (inteiros).
create table if not exists public.fin_records (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('card','charge','invpay','bill','billmonth','debt','proposal')),
  data        jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'fin'
);
create index if not exists fin_records_owner_kind on public.fin_records(owner, kind) where deleted_at is null;

create or replace function public.fin_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  new.owner := old.owner;
  return new;
end $$;
drop trigger if exists fin_guard_t on public.fin_records;
create trigger fin_guard_t before update on public.fin_records for each row execute function public.fin_guard();

alter table public.fin_records enable row level security;
drop policy if exists fin_sel on public.fin_records;
drop policy if exists fin_ins on public.fin_records;
drop policy if exists fin_upd on public.fin_records;
create policy fin_sel on public.fin_records for select using (owner = auth.uid());
create policy fin_ins on public.fin_records for insert with check (owner = auth.uid());
create policy fin_upd on public.fin_records for update using (owner = auth.uid()) with check (owner = auth.uid());
-- Sem política de DELETE: nada é apagado de verdade, só vai para a lixeira (deleted_at).
