-- Vantora 2: tabelas do app (mesmo molde do Casa em Dia e do Financeiro, no banco do Núcleo).
-- Dono por linha, versão, histórico, lixeira (deleted_at), sem DELETE pela API.
-- Nenhum dado de negócio e nenhum segredo neste arquivo.
create table public.van2_records (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('produto','busca','nota')),
  data        jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'app'
);
create index van2_records_owner_kind on public.van2_records(owner, kind) where deleted_at is null;
create index van2_records_lixeira on public.van2_records(owner, deleted_at) where deleted_at is not null;

create table public.van2_records_hist (
  id         bigserial primary key,
  rec_id     uuid not null,
  owner      uuid not null,
  kind       text not null,
  version    integer not null,
  data       jsonb not null,
  deleted_at timestamptz,
  changed_by text,
  changed_at timestamptz not null default now()
);

-- security definer: o histórico é gravado mesmo com RLS ligada e sem permissão de escrita direta no histórico.
create or replace function public.van2_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.version <> old.version then
    raise exception 'conflict: registro % mudou (versao atual %, enviada %)', old.id, old.version, new.version using errcode = 'P0001';
  end if;
  insert into public.van2_records_hist(rec_id, owner, kind, version, data, deleted_at, changed_by)
    values (old.id, old.owner, old.kind, old.version, old.data, old.deleted_at, new.updated_by);
  new.version := old.version + 1;
  new.updated_at := now();
  new.owner := old.owner;
  return new;
end $$;
revoke all on function public.van2_guard() from public, anon, authenticated;
create trigger van2_guard_t before update on public.van2_records
  for each row execute function public.van2_guard();

alter table public.van2_records      enable row level security;
alter table public.van2_records_hist enable row level security;
create policy van2_sel on public.van2_records for select to authenticated using (owner = auth.uid());
create policy van2_ins on public.van2_records for insert to authenticated with check (owner = auth.uid());
create policy van2_upd on public.van2_records for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy van2_hist_sel on public.van2_records_hist for select to authenticated using (owner = auth.uid());

-- Permissões mínimas: o app lê, cria e altera; nunca apaga. Visitante sem login não acessa nada.
revoke all on public.van2_records, public.van2_records_hist from anon, authenticated;
grant select, insert, update on public.van2_records to authenticated;
grant select on public.van2_records_hist to authenticated;
revoke all on sequence public.van2_records_hist_id_seq from anon, authenticated;

-- Lixeira: some de vez o que foi apagado há mais de 30 dias (todo dia, 05:40 UTC).
create or replace function public.van2_limpar_lixeira() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.van2_records where deleted_at is not null and deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.van2_limpar_lixeira() from public, anon, authenticated;
select cron.schedule('van2-limpar-lixeira', '40 5 * * *', 'select public.van2_limpar_lixeira()');
