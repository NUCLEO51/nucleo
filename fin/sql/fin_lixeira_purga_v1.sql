-- fin_lixeira_purga_v1 — RASCUNHO. NÃO APLICADO. NÃO RODE sem a autorização de Marcelo.
-- Objetivo: a Lixeira do Financeiro guarda 30 dias; depois disso o item é apagado de vez.
-- Hoje (2026-10-31) o app já mostra a tela Lixeira e restaura, mas NADA apaga de vez: esta limpeza não está ligada.
--
-- ANTES DE APLICAR (pontos para decidir/conferir):
--  1. Apagar de vez é irreversível em fin_records. O backup das 03h NÃO guarda itens da lixeira (só ativos);
--     o botão "Baixar cópia dos dados" guarda. Faça uma cópia antes da primeira limpeza.
--  2. fin_records_hist (histórico) é imutável e guarda cópias das versões antigas, inclusive dos itens apagados.
--     Esta limpeza NÃO mexe no histórico. Decidir se isso é aceitável ("apagado de vez" ainda deixa rastro no histórico).
--  3. Verificar se alguma tabela aponta para fin_records (fin_capture_items, fin_ops_log) e se a limpeza pode quebrar essas ligações.
--  4. A limpeza usa fin.via_apply='on' porque o gatilho fin_escrita_t recusa DELETE sem login.
--  5. Primeiro rode só a PRÉVIA (fin_lixeira_previa) e confira os números.
--  6. Tabela "items" do Núcleo (lembretes, notas) tem lixeira própria e NÃO entra aqui.
--
-- Hoje: 113 itens na lixeira do Financeiro, o mais antigo apagado em 2026-10-16; nenhum passou de 30 dias.
-- A primeira limpeza real, se ligada, só teria o que apagar a partir de 2026-11-15.

-- PRÉVIA: só conta (não apaga nada). Retorna quantos itens estão na lixeira e quantos já passaram do prazo.
create or replace function public.fin_lixeira_previa(p_dias int default 30)
returns table(kind text, na_lixeira bigint, passou_do_prazo bigint, mais_antigo timestamptz)
language sql stable security definer set search_path=public as $$
  select r.kind, count(*), count(*) filter (where r.deleted_at < now() - make_interval(days=>p_dias)), min(r.deleted_at)
  from public.fin_records r where r.deleted_at is not null group by r.kind order by 2 desc;
$$;
revoke all on function public.fin_lixeira_previa(int) from public, anon, authenticated;
grant execute on function public.fin_lixeira_previa(int) to service_role;

-- LIMPEZA: apaga de vez o que está na lixeira há mais de p_dias (mínimo 30). Devolve quantos apagou.
create or replace function public.fin_lixeira_limpar(p_dias int default 30)
returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if p_dias is null or p_dias < 30 then raise exception 'prazo mínimo da lixeira: 30 dias'; end if;
  perform set_config('fin.via_apply','on',true);
  delete from public.fin_records where deleted_at is not null and deleted_at < now() - make_interval(days=>p_dias);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.fin_lixeira_limpar(int) from public, anon, authenticated;

-- AGENDAMENTO (todo dia 06:30 UTC = 03:30 de Brasília, depois do backup das 03:00). DEIXE COMENTADO até a autorização.
-- select cron.schedule('fin-lixeira-limpar','30 6 * * *',$$select public.fin_lixeira_limpar(30)$$);

-- REVERSÃO (desliga e remove; não recupera o que já foi apagado de vez):
-- select cron.unschedule('fin-lixeira-limpar') where exists (select 1 from cron.job where jobname='fin-lixeira-limpar');
-- drop function if exists public.fin_lixeira_limpar(int);
-- drop function if exists public.fin_lixeira_previa(int);
