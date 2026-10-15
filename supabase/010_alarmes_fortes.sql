-- Núcleo: alarmes fortes para o Relógio do iPhone, para qualquer data.
-- O Relógio não aceita data, então o iPhone chama esta função duas vezes por dia (automação do Atalhos)
-- e cria no Relógio só os alarmes das próximas horas. Lembretes marcados com strong=true entram.
-- Protegida pelo mesmo código secreto da Siri (guardado na tabela app_secrets, fora do repositório).
-- Retorna uma lista de textos "HH:mm|Título" (o atalho Alarme Núcleo acrescenta o "Núcleo: " no nome do alarme).
create or replace function public.alarmes_fortes(p_token text, p_horas int default 30)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare t text; uid uuid; res jsonb;
begin
  select v into t from public.app_secrets where k = 'siri_token';
  if t is null or p_token is distinct from t then
    raise exception 'codigo invalido' using errcode = '28000';
  end if;
  select id into uid from auth.users order by created_at limit 1;
  select coalesce(jsonb_agg(x.linha order by x.quando), '[]'::jsonb) into res
  from (
    select
      (((i.data->>'date') || ' ' || (i.data->>'time'))::timestamp at time zone 'America/Sao_Paulo')
        - make_interval(mins => coalesce((a.value->>'min')::int, 0)) as quando,
      to_char(((i.data->>'date') || ' ' || (i.data->>'time'))::timestamp
        - make_interval(mins => coalesce((a.value->>'min')::int, 0)), 'HH24:MI')
        || '|' || replace(left(coalesce(i.data->>'title', 'Lembrete'), 60), '|', '/') as linha
    from public.items i
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(i.data->'alarms') = 'array' and jsonb_array_length(i.data->'alarms') > 0
           then i.data->'alarms' else '[{"min":0}]'::jsonb end) a
    where i.kind = 'reminder' and i.owner = uid and i.deleted_at is null
      and not (i.data ? 'deletedAt')
      and coalesce(i.data->>'done', 'false') <> 'true'
      and i.data->>'strong' = 'true'
      and coalesce(i.data->>'date', '') <> '' and coalesce(i.data->>'time', '') <> ''
  ) x
  where x.quando > now() and x.quando <= now() + make_interval(hours => p_horas);
  return res;
end $$;
revoke all on function public.alarmes_fortes(text, int) from public;
grant execute on function public.alarmes_fortes(text, int) to anon, authenticated;
