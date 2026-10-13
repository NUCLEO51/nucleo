-- Núcleo: tabelas e regras de acesso (RLS). Rodar no SQL Editor do Supabase.
-- Princípio: cada linha pertence a um dono (owner). Só o dono lê e altera.
create extension if not exists pgcrypto;

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('reminder','note','event','inbox','folder','list')),
  data        jsonb not null default '{}'::jsonb,   -- campos do item (título, data, alarmes...)
  version     integer not null default 1,           -- controle de conflito
  deleted_at  timestamptz,                          -- lixeira (exclusão definitiva só pelo dono)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'app'           -- app | claude | helena | siri
);
create index items_owner_kind on public.items(owner, kind) where deleted_at is null;

-- Histórico: guarda o conteúdo anterior a cada alteração.
create table public.item_history (
  id         bigserial primary key,
  item_id    uuid not null,
  owner      uuid not null,
  version    integer not null,
  data       jsonb not null,
  changed_by text,
  changed_at timestamptz not null default now()
);

-- Alarmes: lidos pelo serviço que envia notificações.
create table public.alarms (
  id        uuid primary key default gen_random_uuid(),
  owner     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id   uuid not null references public.items(id) on delete cascade,
  fire_at   timestamptz not null,
  message   text,
  fired_at  timestamptz
);
create index alarms_due on public.alarms(fire_at) where fired_at is null;

create table public.push_subscriptions (
  id        uuid primary key default gen_random_uuid(),
  owner     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint  text not null unique,
  keys      jsonb not null,
  created_at timestamptz not null default now()
);

-- Conflito: só grava se a versão enviada for a versão atual; senão rejeita.
create or replace function public.items_guard() returns trigger language plpgsql as $$
begin
  if new.version <> old.version then
    raise exception 'conflict: item % mudou (versão atual %, enviada %)', old.id, old.version, new.version
      using errcode = 'P0001';
  end if;
  insert into public.item_history(item_id, owner, version, data, changed_by)
    values (old.id, old.owner, old.version, old.data, new.updated_by);
  new.version := old.version + 1;
  new.updated_at := now();
  new.owner := old.owner;               -- dono nunca muda
  return new;
end $$;
create trigger items_guard_t before update on public.items
  for each row execute function public.items_guard();

-- RLS: ligado em tudo. Sem login, nada é lido nem gravado.
alter table public.items              enable row level security;
alter table public.item_history       enable row level security;
alter table public.alarms             enable row level security;
alter table public.push_subscriptions enable row level security;

create policy items_select on public.items for select to authenticated using (owner = auth.uid());
create policy items_insert on public.items for insert to authenticated with check (owner = auth.uid());
create policy items_update on public.items for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
-- Sem política de DELETE: ninguém apaga de vez pela API. Apagar = preencher deleted_at.

create policy hist_select on public.item_history for select to authenticated using (owner = auth.uid());
create policy alarms_all  on public.alarms for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy push_all    on public.push_subscriptions for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Fotos: bucket privado, cada um só vê a própria pasta.
insert into storage.buckets(id, name, public) values ('anexos','anexos', false) on conflict do nothing;
create policy anexos_rw on storage.objects for all to authenticated
  using (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text);
