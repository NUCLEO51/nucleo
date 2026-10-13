-- Núcleo: alarmes com o app fechado (avisos no iPhone).
-- 1) prepara a tabela de alarmes  2) liga o relógio do servidor, que chama a função "enviar-alarmes" a cada minuto.
-- Troque SEU_CODIGO_DO_RELOGIO pelo código do guia antes de rodar (não publique o código).
alter table public.alarms add column if not exists key text;
alter table public.alarms alter column item_id drop not null;
create unique index if not exists alarms_key_u on public.alarms(key);
create index if not exists alarms_owner_open on public.alarms(owner) where fired_at is null;

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'nucleo-alarmes',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://cptvxfzgimeawheqrhvz.supabase.co/functions/v1/enviar-alarmes',
       headers := '{"Content-Type":"application/json","x-cron-secret":"SEU_CODIGO_DO_RELOGIO"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
