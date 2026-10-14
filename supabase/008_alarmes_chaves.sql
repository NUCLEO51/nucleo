-- Núcleo: alarmes com o app fechado (versão final; substitui o relógio do 004).
-- Já aplicado no Supabase em 14/10/2026. As chaves NÃO ficam aqui: ficam na tabela push_config (sem acesso público)
-- e a função enviar-alarmes cria o par de chaves sozinha na primeira execução.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  vapid_subject text not null,
  vapid_public text,
  vapid_private text,
  cron_secret text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (id, vapid_subject) values (1, 'https://nucleo51.github.io/nucleo/') on conflict (id) do nothing;

create or replace function public.chamar_alarmes() returns bigint
language plpgsql security definer set search_path = public, extensions, net as $$
declare s text; rid bigint;
begin
  select cron_secret into s from public.push_config where id = 1;
  select net.http_post(
    url := 'https://cptvxfzgimeawheqrhvz.supabase.co/functions/v1/enviar-alarmes',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', s),
    body := '{}'::jsonb
  ) into rid;
  return rid;
end $$;
revoke all on function public.chamar_alarmes() from public, anon, authenticated;

-- relógio: chama a função todo minuto
select cron.schedule('nucleo-alarmes', '* * * * *', 'select public.chamar_alarmes()');
