create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create table public.fin_records(
 id uuid primary key default gen_random_uuid(), owner uuid not null default auth.uid(), kind text not null,
 data jsonb not null default '{}', version int not null default 1, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by text not null default 'fin');
alter table public.fin_records enable row level security;
create function public.fin_guard() returns trigger language plpgsql as $f$ begin new.version:=old.version+1; new.updated_at:=now(); new.owner:=old.owner; return new; end $f$;
create trigger fin_guard_t before update on public.fin_records for each row execute function public.fin_guard();
grant all on all tables in schema public to service_role; grant usage on schema public, auth to anon,authenticated,service_role;
insert into public.fin_records(owner,kind,data) values ('aaaaaaaa-0000-0000-0000-000000000001','card','{"name":"Nubank"}');
