-- FIN: acesso do chat financeiro (ler tudo e editar). Rodar UMA vez no SQL Editor.
-- Troque SEU_CODIGO_SECRETO_DO_CHAT por um código longo e secreto ANTES de rodar. Não publique o código.
-- Para revogar o acesso: rode de novo com outro código (o antigo para de funcionar na hora).
create table if not exists public.app_secrets (k text primary key, v text not null);
alter table public.app_secrets enable row level security;

insert into public.app_secrets(k, v) values ('fin_chat_token', 'SEU_CODIGO_SECRETO_DO_CHAT')
  on conflict (k) do update set v = excluded.v;

-- Uma função só. p_cmd é JSON:
--   {"read":true}                                  -> devolve todos os registros (não apagados)
--   {"ops":[{"op":"create","kind":"debt","data":{}},
--           {"op":"update","id":"uuid","data":{}},   (data é mesclado nos campos existentes)
--           {"op":"delete","id":"uuid"}]}            (vai para a lixeira, não some de verdade)
-- Tudo ou nada: se uma mudança falhar, nenhuma é aplicada. Edições ficam marcadas updated_by='chat'.
create or replace function public.fin_chat(p_token text, p_cmd jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t text; uid uuid; o jsonb; n int := 0; r public.fin_records; res jsonb;
begin
  select v into t from public.app_secrets where k = 'fin_chat_token';
  if t is null or p_token is distinct from t then
    raise exception 'codigo invalido' using errcode = '28000';
  end if;
  select id into uid from auth.users order by created_at limit 1;

  if p_cmd ? 'ops' then
    if jsonb_typeof(p_cmd->'ops') <> 'array' or jsonb_array_length(p_cmd->'ops') > 60 then
      raise exception 'ops invalido (maximo 60)';
    end if;
    for o in select * from jsonb_array_elements(p_cmd->'ops') loop
      if o->>'op' = 'create' then
        insert into public.fin_records(owner, kind, data, updated_by)
        values (uid, o->>'kind', coalesce(o->'data','{}'::jsonb), 'chat');
      elsif o->>'op' = 'update' then
        update public.fin_records
           set data = data || coalesce(o->'data','{}'::jsonb), updated_by = 'chat'
         where id = (o->>'id')::uuid and owner = uid and deleted_at is null;
        if not found then raise exception 'item nao encontrado: %', o->>'id'; end if;
      elsif o->>'op' = 'delete' then
        update public.fin_records set deleted_at = now(), updated_by = 'chat'
         where id = (o->>'id')::uuid and owner = uid and deleted_at is null;
        if not found then raise exception 'item nao encontrado: %', o->>'id'; end if;
      else
        raise exception 'operacao desconhecida';
      end if;
      n := n + 1;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'version', version,
           'updated_by', updated_by, 'data', data) order by created_at), '[]'::jsonb)
    into res from public.fin_records where owner = uid and deleted_at is null;
  return jsonb_build_object('ok', true, 'aplicadas', n, 'registros', res);
end $$;

revoke all on function public.fin_chat(text, jsonb) from public;
grant execute on function public.fin_chat(text, jsonb) to anon, authenticated;
