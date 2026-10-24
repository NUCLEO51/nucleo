-- FINANCEIRO — fin_apply v2.3 (corrige os achados da auditoria independente de 23/10/2026 sobre a v2.2)
-- Substitui v1, v2, v2.1 e v2.2 — NÃO rodar as anteriores. Esta é a única a aplicar.
-- Mudanças sobre a v2.2:
--  1. Conflito de versão NÃO devolve mais o registro financeiro inteiro (só id, versão atual e versão enviada).
--  2. update: as referências (cardId/billId) são validadas no registro COMPLETO após a mesclagem.
--  3. delete de cartão/conta com lançamentos ativos ligados é recusado (envie os lançamentos à lixeira antes).
--  4. fin_op_result: login comum só lê recibos do canal 'fin' (isolamento por canal fail-closed).
--  5. NOVO: gatilho fin_escrita_t em fin_records — escrita DIRETA sem login (conexão administrativa/serviço) é recusada,
--     salvo via fin_apply ou durante a janela do modo legado (fin_config.admin_canal_legado='sim' + prazo vigente).
--     Login comum (o app Financeiro) continua gravando normalmente pelas regras de RLS já existentes.
--     LIMITE: é uma trava contra gravação acidental ou por ferramenta sem login. Um administrador pode ligar a marca
--     fin.via_apply de propósito; só separação de papéis no banco (fora do alcance desta migração) fecha isso de vez.
--  6. Sem DROP: o gatilho de histórico é criado só se não existir (evita o cancelamento de migração com DROP).
-- Aplicação: aditiva. Não altera dados existentes. Reversão: fin_apply_v2_3_rollback.sql (preserva tabelas e evidências).

create table if not exists public.fin_canal_dono(
  canal text primary key, owner uuid not null, criado_em timestamptz not null default now());
alter table public.fin_canal_dono enable row level security;
insert into public.fin_canal_dono(canal, owner)
  select c.canal, d.owner
  from (values ('gpt'),('claude'),('box'),('mobills'),('importador')) c(canal),
       (select distinct owner from public.fin_records) d
  where (select count(distinct owner) from public.fin_records) = 1
  on conflict (canal) do nothing;

-- credenciais por canal: o LOGIN (auth.uid) do ator decide canal e dono; pode ser revogado ou expirar
create table if not exists public.fin_atores(
  actor uuid primary key, canal text not null check (canal in ('gpt','claude','box','mobills','importador')),
  owner uuid not null, ativo boolean not null default true, expira timestamptz,
  ops text[] not null default array['create','update','delete','restore'], criado_em timestamptz not null default now());
alter table public.fin_atores enable row level security;
create table if not exists public.fin_config(chave text primary key, valor text not null);
alter table public.fin_config enable row level security;
-- Modo legado = conexão administrativa SEM login (canal NÃO autenticado). Nasce DESLIGADO (fail-closed).
-- Para ligar temporariamente (ex.: 7 dias, durante a transição para credenciais individuais), como serviço:
--   update public.fin_config set valor='sim' where chave='admin_canal_legado';
--   update public.fin_config set valor=(now()+interval '7 days')::text where chave='admin_canal_legado_ate';
-- Vencido o prazo, volta a ser recusado sozinho. Para desligar: valor='nao'.
insert into public.fin_config(chave,valor) values ('admin_canal_legado','nao'),('admin_canal_legado_ate','') on conflict (chave) do nothing;

create table if not exists public.fin_ops_log(
  owner uuid not null, op_id text not null, source text not null, modo text, actor text, hash text not null, result jsonb,
  created_at timestamptz not null default now(), primary key(owner, source, op_id));
alter table public.fin_ops_log enable row level security;

create table if not exists public.fin_capture_items(
  owner uuid not null, capture_id text not null, item_id text not null, canal text not null, rec_id uuid not null, hash text not null,
  created_at timestamptz not null default now(), primary key(owner, capture_id, item_id));
alter table public.fin_capture_items enable row level security;

create table if not exists public.fin_records_hist(
  hid bigserial primary key, id uuid not null, owner uuid not null, kind text not null, version int not null,
  data jsonb not null, deleted_at timestamptz,
  new_version int, new_data jsonb, new_deleted_at timestamptz,
  canal text, actor text, op_id text, changed_at timestamptz not null default now());
create index if not exists fin_hist_id on public.fin_records_hist(id, hid desc);
alter table public.fin_records_hist enable row level security;

create or replace function public.fin_hist() returns trigger language plpgsql security definer set search_path=public as $f$
begin
  insert into public.fin_records_hist(id,owner,kind,version,data,deleted_at,new_version,new_data,new_deleted_at,canal,actor,op_id)
  values(old.id,old.owner,old.kind,old.version,old.data,old.deleted_at,new.version,new.data,new.deleted_at,
         new.updated_by, coalesce(auth.uid()::text,'servico'), nullif(current_setting('fin.op_id',true),''));
  return null;
end $f$;
do $g$ begin
  if not exists (select 1 from pg_trigger where tgname='fin_hist_trg' and tgrelid='public.fin_records'::regclass) then
    create trigger fin_hist_trg after update on public.fin_records for each row execute function public.fin_hist();
  end if;
end $g$;

create or replace function public.fin_resolve(p_source text, out owner uuid, out canal text, out modo text, out ops text[])
language plpgsql stable security definer set search_path=public as $f$
declare a public.fin_atores; leg text; ate text; v_ate timestamptz;
begin
  ops := array['create','update','delete','restore'];
  if auth.uid() is not null then
    select * into a from public.fin_atores where actor=auth.uid();
    if found then
      if not a.ativo or (a.expira is not null and a.expira<=now()) then raise exception 'credencial revogada ou expirada'; end if;
      if p_source is distinct from a.canal then raise exception 'canal % não permitido para esta credencial (permitido: %)', p_source, a.canal; end if;
      owner:=a.owner; canal:=a.canal; modo:='ator'; ops:=a.ops; return;
    end if;
    if p_source is distinct from 'fin' then raise exception 'canal % não permitido para login comum (só fin)', p_source; end if;
    owner:=auth.uid(); canal:='fin'; modo:='usuario'; return;
  end if;
  select valor into leg from public.fin_config where chave='admin_canal_legado';
  select valor into ate from public.fin_config where chave='admin_canal_legado_ate';
  begin v_ate := nullif(ate,'')::timestamptz; exception when others then v_ate := null; end;
  if coalesce(leg,'nao')<>'sim' or v_ate is null or v_ate<=now() then
    raise exception 'conexão administrativa não autorizada (modo legado desligado ou sem prazo vigente)'; end if;
  select d.owner into owner from public.fin_canal_dono d where d.canal=p_source;
  canal:=p_source; modo:='admin_legado';
end $f$;

create or replace view public.fin_legado_uso as
  select source as canal, count(*) as usos, max(created_at) as ultimo from public.fin_ops_log where modo='admin_legado' group by source;

create or replace function public.fin_ator_registrar(p_actor uuid, p_canal text, p_owner uuid, p_dias int default 30, p_ops text[] default null)
returns void language plpgsql security definer set search_path=public as $f$
begin
  if p_canal not in ('gpt','claude','box','mobills','importador') then raise exception 'canal inválido'; end if;
  if p_dias is null or p_dias not between 1 and 365 then raise exception 'p_dias deve estar entre 1 e 365'; end if;
  if p_actor is null or p_owner is null then raise exception 'actor e owner são obrigatórios'; end if;
  if exists(select 1 from public.fin_records where owner=p_actor) then raise exception 'actor não pode ser um dono de dados'; end if;
  if p_ops is not null and not (p_ops <@ array['create','update','delete','restore']) then raise exception 'ops inválidas'; end if;
  insert into public.fin_atores(actor,canal,owner,ativo,expira,ops)
  values (p_actor,p_canal,p_owner,true,now()+make_interval(days=>p_dias),coalesce(p_ops,array['create','update','delete','restore']))
  on conflict (actor) do update set canal=excluded.canal, owner=excluded.owner, ativo=true, expira=excluded.expira, ops=excluded.ops;
end $f$;

create or replace function public.fin_ator_revogar(p_actor uuid) returns void
language sql security definer set search_path=public as $f$
  update public.fin_atores set ativo=false where actor=p_actor;
$f$;

create or replace function public.fin_validate(p_kind text, p_data jsonb, p_create boolean) returns void
language plpgsql immutable set search_path=public as $f$
declare k text; v jsonb; n numeric; s text; d date;
begin
  if p_kind is null or p_kind not in ('card','charge','invpay','bill','billmonth','debt','proposal','stmt') then
    raise exception 'kind inválido: %', p_kind; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'data deve ser um objeto'; end if;
  if octet_length(p_data::text) > 20000 then raise exception 'data grande demais (máx. 20000 bytes)'; end if;
  for k,v in select key,value from jsonb_each(p_data) loop
    if k ~ '^[A-Za-z]+C$' or k in ('rateBp','nInst') then
      if jsonb_typeof(v) not in ('null','number') then raise exception '% deve ser número inteiro (centavos) ou null', k; end if;
      if jsonb_typeof(v)='number' then n:=(v#>>'{}')::numeric; if n<>trunc(n) then raise exception '% deve ser inteiro (centavos), recebi %', k, n; end if; end if;
    elsif k in ('dueDay','closeDay') then
      if jsonb_typeof(v) not in ('null','number') then raise exception '% deve ser dia 1..31 ou null', k; end if;
      if jsonb_typeof(v)='number' then n:=(v#>>'{}')::numeric; if n<>trunc(n) or n<1 or n>31 then raise exception '% fora de 1..31', k; end if; end if;
    elsif k='dir' then
      if v#>>'{}' is null or (v#>>'{}') not in ('PAGAR','RECEBER') then raise exception 'dir deve ser PAGAR ou RECEBER'; end if;
    elsif k in ('paidYm') then
      if jsonb_typeof(v)<>'array' then raise exception 'paidYm deve ser lista'; end if;
      for s in select jsonb_array_elements_text(v) loop
        if s !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'paidYm: mês inválido %', s; end if; end loop;
    elsif k in ('date','firstDue','paidAt') and jsonb_typeof(v)='string' then
      s := v#>>'{}';
      if s !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '%: data deve ser AAAA-MM-DD', k; end if;
      begin d := s::date; exception when others then raise exception '%: data inexistente (%)', k, s; end;
      if to_char(d,'YYYY-MM-DD')<>s then raise exception '%: data inexistente (%)', k, s; end if;
    end if;
  end loop;
end $f$;

create or replace function public.fin_validate_full(p_kind text, p_data jsonb) returns void
language plpgsql immutable set search_path=public as $f$
declare n numeric;
begin
  if p_kind='debt' and coalesce(p_data->>'creditor','')='' then raise exception 'debt exige creditor'; end if;
  if p_kind in ('bill','card') and coalesce(p_data->>'name','')='' then raise exception '% exige name', p_kind; end if;
  if p_kind='charge' and coalesce(p_data->>'cardId','')='' then raise exception 'charge exige cardId'; end if;
  if p_kind='billmonth' and (coalesce(p_data->>'billId','')='' or coalesce(p_data->>'ym','')='') then raise exception 'billmonth exige billId e ym'; end if;
  if p_kind='debt' then
    if p_data->>'balanceC' is not null and (p_data->>'balanceC')::numeric<0 then raise exception 'balanceC negativo'; end if;
    if p_data->>'installC' is not null and (p_data->>'installC')::numeric<0 then raise exception 'installC negativo'; end if;
    if p_data->>'rateBp' is not null and (p_data->>'rateBp')::numeric<0 then raise exception 'rateBp negativo'; end if;
    if p_data ? 'status' and p_data->>'status' is not null and p_data->>'status' not in ('ATIVA','ATRASADA','PAGA','DESCONHECIDA') then
      raise exception 'status inválido (use ATIVA, ATRASADA, PAGA ou DESCONHECIDA)'; end if;
  end if;
  if p_kind in ('debt','charge') and p_data->>'nInst' is not null and (p_data->>'nInst')::numeric<1 then raise exception 'nInst deve ser >= 1'; end if;
  if p_kind='card' and p_data->>'limitC' is not null and (p_data->>'limitC')::numeric<0 then raise exception 'limitC negativo'; end if;
  if p_kind='bill' and p_data->>'amountC' is not null and (p_data->>'amountC')::numeric<0 then raise exception 'amountC negativo'; end if;
end $f$;

create or replace function public.fin_check_refs(p_owner uuid, p_kind text, p_data jsonb) returns void
language plpgsql stable security definer set search_path=public as $f$
begin
  if p_data ? 'cardId' and p_kind in ('charge','invpay') and p_data->>'cardId' is not null then
    if not exists(select 1 from public.fin_records where owner=p_owner and kind='card' and deleted_at is null and id::text=p_data->>'cardId') then
      raise exception 'cardId % não existe (ou está na lixeira) para este dono', p_data->>'cardId'; end if;
  end if;
  if p_data ? 'billId' and p_kind='billmonth' and p_data->>'billId' is not null then
    if not exists(select 1 from public.fin_records where owner=p_owner and kind='bill' and deleted_at is null and id::text=p_data->>'billId') then
      raise exception 'billId % não existe (ou está na lixeira) para este dono', p_data->>'billId'; end if;
  end if;
end $f$;

create or replace function public.fin_op_result(p_op_id text, p_source text, p_canal text default null) returns jsonb
language plpgsql stable security definer set search_path=public as $f$
declare r record; l public.fin_ops_log; v_alvo text;
begin
  select * into r from public.fin_resolve(p_source);
  if r.owner is null then raise exception 'dono não identificado'; end if;
  if r.modo='usuario' then
    if p_canal is not null and p_canal<>'fin' then raise exception 'canal % não permitido para login comum (só fin)', p_canal; end if;
    v_alvo := 'fin';
  else
    if p_canal is not null and p_canal<>r.canal then raise exception 'canal % não permitido (permitido: %)', p_canal, r.canal; end if;
    v_alvo := r.canal;
  end if;
  select * into l from public.fin_ops_log where owner=r.owner and source=v_alvo and op_id=p_op_id;
  if not found then return null; end if;
  return l.result || jsonb_build_object('repetida',true);
end $f$;

create or replace function public.fin_apply(p_op_id text, p_source text, p_ops jsonb)
returns jsonb language plpgsql security definer set search_path=public as $f$
declare
  v_owner uuid; v_canal text; v_modo text; v_perm text[]; v_merged jsonb;
  v_hash text; v_log public.fin_ops_log; v_op jsonb; v_res jsonb := '[]'::jsonb; v_row public.fin_records;
  v_cid text; v_item text; v_ih text; v_cap public.fin_capture_items;
  v_kind text; v_data jsonb; v_id uuid; v_ev int; v_t text; v_out jsonb; i int := 0;
begin
  if p_source is null or p_source not in ('gpt','claude','box','mobills','fin','importador') then raise exception 'source inválida'; end if;
  select r.owner, r.canal, r.modo, r.ops into v_owner, v_canal, v_modo, v_perm from public.fin_resolve(p_source) r;
  if v_owner is null then raise exception 'dono não identificado para o canal %', p_source; end if;
  if coalesce(length(p_op_id),0) not between 8 and 120 then raise exception 'op_id deve ter de 8 a 120 caracteres'; end if;
  if p_ops is null or jsonb_typeof(p_ops)<>'array' or jsonb_array_length(p_ops) not between 1 and 60 then raise exception 'ops deve ser lista de 1 a 60'; end if;
  v_hash := md5(p_ops::text);
  perform pg_advisory_xact_lock(hashtext(v_owner::text||'|op|'||v_canal||'|'||p_op_id));
  select * into v_log from public.fin_ops_log where owner=v_owner and source=v_canal and op_id=p_op_id;
  if found then
    if v_log.hash=v_hash then return v_log.result || jsonb_build_object('repetida',true); end if;
    raise exception 'conflito: op_id já usado com conteúdo diferente';
  end if;
  perform set_config('fin.op_id', p_op_id, true);
  perform set_config('fin.via_apply', 'on', true);
  for v_op in select * from jsonb_array_elements(p_ops) loop
    i := i+1; v_t := v_op->>'op';
    if v_t is null or not (v_t = any(v_perm)) then raise exception 'op %: operação não permitida para este canal (%)', i, coalesce(v_t,'?'); end if;
    if v_t='create' then
      v_kind := v_op->>'kind'; v_data := coalesce(v_op->'data','{}'::jsonb);
      perform public.fin_validate(v_kind, v_data, true);
      perform public.fin_validate_full(v_kind, v_data);
      perform public.fin_check_refs(v_owner, v_kind, v_data);
      v_cid := coalesce(v_op->>'capture_id', v_data->>'capture_id');
      v_item := coalesce(v_op->>'item_id', v_data->>'item_id', 'unico');
      if v_cid is not null then
        v_ih := md5(v_kind||'|'||(v_data - 'src' - 'capture_id' - 'item_id')::text);
        perform pg_advisory_xact_lock(hashtext(v_owner::text||'|cap|'||v_cid||'|'||v_item));
        select * into v_cap from public.fin_capture_items where owner=v_owner and capture_id=v_cid and item_id=v_item;
        if found then
          if v_cap.canal<>v_canal then raise exception 'op %: capture_id % item_id % já pertence a outro canal; não é possível reutilizar', i, v_cid, v_item; end if;
          select * into v_row from public.fin_records where id=v_cap.rec_id;
          if v_cap.hash<>v_ih then
            raise exception 'op %: conflito: capture_id % item_id % já existe (registro %) com conteúdo diferente; corrija com update e expected_version', i, v_cid, v_item, v_cap.rec_id;
          end if;
          v_res := v_res || jsonb_build_array(jsonb_build_object('i',i,'op','create','reutilizado',true,
            'na_lixeira',(v_row.deleted_at is not null),'registro',to_jsonb(v_row)));
          continue;
        end if;
        v_data := v_data || jsonb_build_object('capture_id', v_cid, 'item_id', v_item);
      end if;
      if not (v_data ? 'src') then
        v_data := v_data || jsonb_build_object('src', jsonb_build_array(jsonb_build_object('fonte',p_source,'op',p_op_id,'em',now())));
      end if;
      insert into public.fin_records(owner,kind,data,updated_by) values (v_owner,v_kind,v_data,p_source) returning * into v_row;
      if v_cid is not null then
        insert into public.fin_capture_items(owner,capture_id,item_id,canal,rec_id,hash) values (v_owner,v_cid,v_item,v_canal,v_row.id,v_ih);
      end if;
      v_res := v_res || jsonb_build_array(jsonb_build_object('i',i,'op','create','reutilizado',false,'registro',to_jsonb(v_row)));
    elsif v_t in ('update','delete','restore') then
      begin v_id := (v_op->>'id')::uuid; exception when others then raise exception 'op %: id inválido', i; end;
      if v_op->>'expected_version' is null then raise exception 'op %: expected_version é obrigatório', i; end if;
      begin v_ev := (v_op->>'expected_version')::int; exception when others then raise exception 'op %: expected_version inválido', i; end;
      select * into v_row from public.fin_records where id=v_id and owner=v_owner for update;
      if not found then raise exception 'op %: registro % não encontrado para este dono', i, v_id; end if;
      if v_row.version<>v_ev then
        raise exception 'op %: conflito de versão (registro %, versão atual %, enviada %). Releia o registro e tente de novo', i, v_row.id, v_row.version, v_ev
          using errcode='40001'; end if;
      if v_t='update' then
        if v_row.deleted_at is not null then raise exception 'op %: registro está na lixeira', i; end if;
        v_data := v_op->'data';
        if v_data is null or jsonb_typeof(v_data)<>'object' or v_data='{}'::jsonb then raise exception 'op %: update exige data', i; end if;
        if v_data ?| array['capture_id','item_id','src'] then raise exception 'op %: capture_id, item_id e src são imutáveis', i; end if;
        perform public.fin_validate(v_row.kind, v_data, false);
        v_merged := v_row.data || v_data;
        perform public.fin_validate_full(v_row.kind, v_merged);
        perform public.fin_check_refs(v_owner, v_row.kind, v_merged);
        update public.fin_records set data=data||v_data, updated_by=p_source where id=v_id returning * into v_row;
      elsif v_t='delete' then
        if v_row.deleted_at is not null then raise exception 'op %: já está na lixeira', i; end if;
        if v_row.kind='card' and exists(select 1 from public.fin_records where owner=v_owner and kind in ('charge','invpay') and deleted_at is null and data->>'cardId'=v_row.id::text) then
          raise exception 'op %: o cartão tem lançamentos ativos; envie-os para a lixeira antes', i; end if;
        if v_row.kind='bill' and exists(select 1 from public.fin_records where owner=v_owner and kind='billmonth' and deleted_at is null and data->>'billId'=v_row.id::text) then
          raise exception 'op %: a conta tem meses ativos; envie-os para a lixeira antes', i; end if;
        update public.fin_records set deleted_at=now(), updated_by=p_source where id=v_id returning * into v_row;
      else
        if v_row.deleted_at is null then raise exception 'op %: não está na lixeira', i; end if;
        perform public.fin_validate_full(v_row.kind, v_row.data);
        perform public.fin_check_refs(v_owner, v_row.kind, v_row.data);
        update public.fin_records set deleted_at=null, updated_by=p_source where id=v_id returning * into v_row;
      end if;
      v_res := v_res || jsonb_build_array(jsonb_build_object('i',i,'op',v_t,'registro',to_jsonb(v_row)));
    else
      raise exception 'op %: operação desconhecida (%)', i, v_t;
    end if;
  end loop;
  v_out := jsonb_build_object('ok',true,'op_id',p_op_id,'repetida',false,'resultados',v_res);
  insert into public.fin_ops_log(owner,op_id,source,modo,actor,hash,result)
    values (v_owner,p_op_id,v_canal,v_modo,coalesce(auth.uid()::text,'servico'),v_hash,v_out);
  perform set_config('fin.via_apply', 'off', true);
  return v_out;
end $f$;


-- escrita direta sem login: só via fin_apply ou na janela do modo legado (com prazo)
create or replace function public.fin_escrita_guard() returns trigger
language plpgsql security definer set search_path=public as $f$
declare leg text; ate text; v_ate timestamptz;
begin
  if auth.uid() is null and coalesce(current_setting('fin.via_apply',true),'')<>'on' then
    select valor into leg from public.fin_config where chave='admin_canal_legado';
    select valor into ate from public.fin_config where chave='admin_canal_legado_ate';
    begin v_ate := nullif(ate,'')::timestamptz; exception when others then v_ate := null; end;
    if coalesce(leg,'nao')<>'sim' or v_ate is null or v_ate<=now() then
      raise exception 'escrita direta sem login recusada em fin_records; use fin_apply (ou habilite o modo legado com prazo)';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $f$;
do $g$ begin
  if not exists (select 1 from pg_trigger where tgname='fin_escrita_t' and tgrelid='public.fin_records'::regclass) then
    create trigger fin_escrita_t before insert or update or delete on public.fin_records for each row execute function public.fin_escrita_guard();
  end if;
end $g$;

-- permissões: tabelas internas só pelo servidor; histórico não pode ser alterado por ninguém
revoke all on public.fin_atores, public.fin_config, public.fin_canal_dono, public.fin_ops_log, public.fin_capture_items, public.fin_records_hist from public, anon, authenticated;
revoke update, delete, truncate on public.fin_records_hist from service_role;
revoke all on function public.fin_apply(text,text,jsonb) from public, anon;
revoke all on function public.fin_op_result(text,text,text) from public, anon;
revoke all on function public.fin_resolve(text) from public, anon, authenticated;
revoke all on function public.fin_validate_full(text,jsonb) from public, anon;
revoke all on function public.fin_ator_registrar(uuid,text,uuid,int,text[]) from public, anon, authenticated;
revoke all on function public.fin_ator_revogar(uuid) from public, anon, authenticated;
revoke all on public.fin_legado_uso from public, anon, authenticated;
grant select on public.fin_legado_uso to service_role;
grant execute on function public.fin_ator_registrar(uuid,text,uuid,int,text[]) to service_role;
grant execute on function public.fin_ator_revogar(uuid) to service_role;
revoke all on function public.fin_validate(text,jsonb,boolean) from public, anon;
revoke all on function public.fin_check_refs(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.fin_hist() from public, anon, authenticated;
revoke all on function public.fin_escrita_guard() from public, anon, authenticated;
grant execute on function public.fin_apply(text,text,jsonb) to authenticated, service_role;
grant execute on function public.fin_op_result(text,text,text) to authenticated, service_role;
