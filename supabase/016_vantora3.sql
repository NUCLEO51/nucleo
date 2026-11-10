-- Vantora 3: tabela do app (mesmo molde da Vantora 2, no banco do Núcleo).
-- kinds: produto (esteira 1 e 2), tarefa (quem faz: claude/chatgpt/marcelo), msg (espelho do Correio Claude-GPT do Drive), config (nicho ativo).
-- Dono por linha, versão, histórico, lixeira (deleted_at), sem DELETE pela API. Nenhum segredo neste arquivo.
create table public.van3_records (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('produto','tarefa','msg','config')),
  data        jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'app'
);
create index van3_records_owner_kind on public.van3_records(owner, kind) where deleted_at is null;
create index van3_records_lixeira on public.van3_records(owner, deleted_at) where deleted_at is not null;

create table public.van3_records_hist (
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

create or replace function public.van3_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.version <> old.version then
    raise exception 'conflict: registro % mudou (versao atual %, enviada %)', old.id, old.version, new.version using errcode = 'P0001';
  end if;
  insert into public.van3_records_hist(rec_id, owner, kind, version, data, deleted_at, changed_by)
    values (old.id, old.owner, old.kind, old.version, old.data, old.deleted_at, new.updated_by);
  new.version := old.version + 1;
  new.updated_at := now();
  new.owner := old.owner;
  return new;
end $$;
revoke all on function public.van3_guard() from public, anon, authenticated;
create trigger van3_guard_t before update on public.van3_records
  for each row execute function public.van3_guard();

alter table public.van3_records      enable row level security;
alter table public.van3_records_hist enable row level security;
create policy van3_sel on public.van3_records for select to authenticated using (owner = auth.uid());
create policy van3_ins on public.van3_records for insert to authenticated with check (owner = auth.uid());
create policy van3_upd on public.van3_records for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy van3_hist_sel on public.van3_records_hist for select to authenticated using (owner = auth.uid());

revoke all on public.van3_records, public.van3_records_hist from anon, authenticated;
grant select, insert, update on public.van3_records to authenticated;
grant select on public.van3_records_hist to authenticated;
revoke all on sequence public.van3_records_hist_id_seq from anon, authenticated;

create or replace function public.van3_limpar_lixeira() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.van3_records where deleted_at is not null and deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.van3_limpar_lixeira() from public, anon, authenticated;
select cron.schedule('van3-limpar-lixeira', '45 5 * * *', 'select public.van3_limpar_lixeira()');
