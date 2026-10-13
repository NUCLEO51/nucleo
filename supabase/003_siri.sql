-- Núcleo: captura por voz (Siri / Atalhos do iPhone).
-- Cria uma função que só sabe fazer uma coisa: colocar um texto na Caixa de entrada.
-- O app transforma esse texto em lembrete sozinho (entende data e hora).
-- Troque SEU_CODIGO_SECRETO por um código longo e secreto antes de rodar (não publique o código).
create table if not exists public.app_secrets (k text primary key, v text not null);
alter table public.app_secrets enable row level security;   -- sem política: ninguém lê pela API

insert into public.app_secrets(k, v) values ('siri_token', 'SEU_CODIGO_SECRETO')
  on conflict (k) do update set v = excluded.v;

create or replace function public.siri_captura(p_token text, p_texto text)
returns text language plpgsql security definer set search_path = public as $$
declare
  t text; uid uuid; nid uuid := gen_random_uuid(); txt text;
begin
  select v into t from public.app_secrets where k = 'siri_token';
  if t is null or p_token is distinct from t then
    raise exception 'codigo invalido' using errcode = '28000';
  end if;
  txt := btrim(coalesce(p_texto, ''));
  if txt = '' or length(txt) > 2000 then
    raise exception 'texto vazio ou grande demais';
  end if;
  select id into uid from auth.users order by created_at limit 1;
  insert into public.items(id, owner, kind, data, updated_by)
  values (nid, uid, 'inbox',
          jsonb_build_object('_id', nid::text, 'text', txt, 'source', 'siri',
                             'createdAt', (extract(epoch from now()) * 1000)::bigint),
          'siri');
  return 'ok';
end $$;

revoke all on function public.siri_captura(text, text) from public;
grant execute on function public.siri_captura(text, text) to anon, authenticated;
