-- APLICADO em 18/10/2026 (com os dados do FIN incluídos). Backup automático diário às 03:00 de Brasília.
-- 011: backup automático diário dos dados do Núcleo + limpeza de avisos (push) duplicados.
-- O arquivo do backup tem o mesmo formato do botão "Exportar backup", então o "Importar backup" do app lê direto.

create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null,
  taken_at timestamptz not null default now(),
  n_items int not null default 0,
  max_upd timestamptz,
  motivo text not null default 'diario',
  data jsonb not null
);
alter table public.backups enable row level security;
drop policy if exists backups_sel on public.backups;
drop policy if exists backups_del on public.backups;
create policy backups_sel on public.backups for select using (owner = auth.uid());
create policy backups_del on public.backups for delete using (owner = auth.uid());
create index if not exists backups_owner_taken on public.backups(owner, taken_at desc);

-- monta o JSON de um dono no formato do app
create or replace function public._backup_json(p_owner uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exportadoEm', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'lembretes',      coalesce((select jsonb_agg(jsonb_set(data,'{id}',to_jsonb(id::text))) from items where owner=p_owner and kind='reminder' and deleted_at is null),'[]'::jsonb),
    'listas',         coalesce((select jsonb_agg(jsonb_set(data,'{id}',to_jsonb(id::text))) from items where owner=p_owner and kind='list' and deleted_at is null),'[]'::jsonb),
    'notas',          coalesce((select jsonb_agg(jsonb_set(data,'{id}',to_jsonb(id::text))) from items where owner=p_owner and kind='note' and deleted_at is null),'[]'::jsonb),
    'pastas',         coalesce((select jsonb_agg(jsonb_set(data,'{id}',to_jsonb(id::text))) from items where owner=p_owner and kind='folder' and deleted_at is null),'[]'::jsonb),
    'compromissos',   coalesce((select jsonb_agg(jsonb_set(data,'{id}',to_jsonb(id::text))) from items where owner=p_owner and kind='event' and deleted_at is null),'[]'::jsonb),
    'caixaDeEntrada', coalesce((select jsonb_agg(jsonb_set(data,'{id}',to_jsonb(id::text))) from items where owner=p_owner and kind='inbox' and deleted_at is null),'[]'::jsonb),
    'fin',            coalesce((select jsonb_agg(jsonb_build_object('id',id::text,'kind',kind,'data',data)) from fin_records where owner=p_owner and deleted_at is null),'[]'::jsonb)
  );
$$;
revoke all on function public._backup_json(uuid) from public, anon, authenticated;

-- backup diário de todos os donos (só grava se mudou algo desde o último); guarda os 14 mais recentes + 1 por mês
create or replace function public.fazer_backup() returns int
language plpgsql security definer set search_path = public as $$
declare o record; n int := 0; mu timestamptz; last_mu timestamptz;
begin
  for o in select owner from items union select owner from fin_records loop
    select greatest((select max(updated_at) from items where owner = o.owner),(select max(updated_at) from fin_records where owner = o.owner)) into mu;
    select max_upd into last_mu from backups where owner = o.owner order by taken_at desc limit 1;
    if last_mu is null or mu is distinct from last_mu then
      insert into backups(owner, n_items, max_upd, data)
      select o.owner, (select count(*) from items where owner=o.owner and deleted_at is null)+(select count(*) from fin_records where owner=o.owner and deleted_at is null), mu, public._backup_json(o.owner);
      n := n + 1;
    end if;
    delete from backups b where b.owner = o.owner
      and b.id not in (select id from backups where owner = o.owner order by taken_at desc limit 14)
      and b.taken_at < now() - interval '14 days'
      and b.id not in (select distinct on (date_trunc('month', taken_at)) id from backups where owner = o.owner order by date_trunc('month', taken_at), taken_at desc);
  end loop;
  return n;
end $$;
revoke all on function public.fazer_backup() from public, anon, authenticated;

-- botão "Fazer backup agora" do app (só do próprio usuário)
create or replace function public.backup_agora() returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); i uuid;
begin
  if u is null then raise exception 'login'; end if;
  insert into backups(owner, n_items, max_upd, motivo, data)
  values (u, (select count(*) from items where owner=u and deleted_at is null)+(select count(*) from fin_records where owner=u and deleted_at is null), (select greatest((select max(updated_at) from items where owner=u),(select max(updated_at) from fin_records where owner=u))), 'manual', public._backup_json(u))
  returning id into i;
  delete from backups where owner = u and motivo = 'manual' and id not in (select id from backups where owner = u and motivo = 'manual' order by taken_at desc limit 10);
  return i;
end $$;
revoke all on function public.backup_agora() from public, anon;
grant execute on function public.backup_agora() to authenticated;

-- todo dia às 03:00 no horário de Brasília (06:00 UTC)
select cron.unschedule('nucleo-backup') where exists (select 1 from cron.job where jobname='nucleo-backup');
select cron.schedule('nucleo-backup', '0 6 * * *', $$select public.fazer_backup()$$);

-- limpeza de avisos: mantém só a inscrição mais nova de cada aparelho (mesmo "serviço de push" repetido)
-- (no app, cada vez que as chaves mudam o iPhone cria um endereço novo e o antigo fica parado)
create or replace function public.limpar_avisos_antigos() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with ranked as (
    select id, row_number() over (partition by owner order by created_at desc) rn from push_subscriptions
  ) delete from push_subscriptions p using ranked r where p.id = r.id and r.rn > 3;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.limpar_avisos_antigos() from public, anon, authenticated;
