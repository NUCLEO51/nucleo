-- Casa em Dia: tabelas do app da casa (já aplicadas no Núcleo em 31/10/2026).
-- Mesmo molde do Núcleo: dono por linha, versão, histórico, lixeira (deleted_at), sem DELETE pela API.
-- Nenhum segredo neste arquivo: o código da Siri é gerado no banco e fica só em public.app_secrets.
create table public.casa_records (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('lugar','tarefa','feita','nota')),
  data        jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'app'
);
create index casa_records_owner_kind on public.casa_records(owner, kind) where deleted_at is null;
create index casa_records_lixeira on public.casa_records(owner, deleted_at) where deleted_at is not null;

create table public.casa_records_hist (
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

create or replace function public.casa_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if new.version <> old.version then
    raise exception 'conflict: registro % mudou (versao atual %, enviada %)', old.id, old.version, new.version using errcode = 'P0001';
  end if;
  insert into public.casa_records_hist(rec_id, owner, kind, version, data, deleted_at, changed_by)
    values (old.id, old.owner, old.kind, old.version, old.data, old.deleted_at, new.updated_by);
  new.version := old.version + 1;
  new.updated_at := now();
  new.owner := old.owner;
  return new;
end $$;
create trigger casa_guard_t before update on public.casa_records
  for each row execute function public.casa_guard();

alter table public.casa_records      enable row level security;
alter table public.casa_records_hist enable row level security;
create policy casa_sel on public.casa_records for select to authenticated using (owner = auth.uid());
create policy casa_ins on public.casa_records for insert to authenticated with check (owner = auth.uid());
create policy casa_upd on public.casa_records for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy casa_hist_sel on public.casa_records_hist for select to authenticated using (owner = auth.uid());

-- Lixeira: some de vez o que foi apagado há mais de 30 dias (todo dia, 05:30 UTC).
create or replace function public.casa_limpar_lixeira() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.casa_records where deleted_at is not null and deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.casa_limpar_lixeira() from public, anon, authenticated;
select cron.schedule('casa-limpar-lixeira', '30 5 * * *', 'select public.casa_limpar_lixeira()');

-- Siri: coloca um texto na Caixa de voz da casa (atalho "Anotar na casa").
insert into public.app_secrets(k, v) values ('siri_casa_token', encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (k) do nothing;
create or replace function public.siri_casa(p_token text, p_texto text)
returns text language plpgsql security definer set search_path = public as $$
declare t text; uid uuid; txt text;
begin
  select v into t from public.app_secrets where k = 'siri_casa_token';
  if t is null or p_token is distinct from t then
    raise exception 'codigo invalido' using errcode = '28000';
  end if;
  txt := btrim(coalesce(p_texto, ''));
  if txt = '' or length(txt) > 2000 then
    raise exception 'texto vazio ou grande demais';
  end if;
  select id into uid from auth.users order by created_at limit 1;
  insert into public.casa_records(owner, kind, data, updated_by)
  values (uid, 'nota',
          jsonb_build_object('text', txt, 'source', 'siri',
                             'at', to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')),
          'siri');
  return 'ok';
end $$;
revoke all on function public.siri_casa(text, text) from public;
grant execute on function public.siri_casa(text, text) to anon, authenticated;
