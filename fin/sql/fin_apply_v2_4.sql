-- FINANCEIRO — fin_apply v2.4 (ATUALIZAÇÃO da v2.3). NÃO aplicada em produção; depende de autorização do Marcelo e de reauditoria.
-- Resposta aos 4 achados do GPT sobre a v2.1 (commit 2e13f79), conferidos contra a v2.3 que está em produção:
--   1. recibo repetido: dono e canal conferidos de forma explícita (mesma regra do fin_op_result) + operações precisam continuar permitidas a quem repete;
--      fin_op_result confere dono e canal também sobre a linha lida.
--   2. validação: tipo de texto, data, booleano, mês e lista de extrato; campos obrigatórios por tipo checados no registro COMPLETO
--      resultante de cada update/restauração (não dá para esvaziar um campo obrigatório).
--   3. "sem login" deixou de significar administrador: o serviço precisa provar identidade (papel service_role ou conexão
--      postgres/supabase_admin) — em fin_resolve e na trava de escrita direta. O ator do histórico passa a ser servico:<papel>.
--   4. reversões atômicas (uma transação; qualquer erro desfaz tudo), com tempo limite de trava e conferência de que nenhuma
--      evidência foi apagada — ver fin_apply_v2_4_rollback_preservando.sql e fin_apply_v2_4_rollback_remover_tudo.sql.
-- Só cria/substitui FUNÇÕES. Não altera tabelas nem dados. Rode em UMA transação (psql -1, ou o migrador).
-- Pré-requisito: v2.3 instalada.

create or replace function public.fin_service_ok() returns boolean
language sql stable security definer set search_path=public as $f$
  select coalesce(auth.role(),'')='service_role' or session_user in ('postgres','supabase_admin')
$f$;
revoke all on function public.fin_service_ok() from public, anon, authenticated;

create or replace function public.fin_hist() returns trigger language plpgsql security definer set search_path=public as $f$
begin
  insert into public.fin_records_hist(id,owner,kind,version,data,deleted_at,new_version,new_data,new_deleted_at,canal,actor,op_id)
  values(old.id,old.owner,old.kind,old.version,old.data,old.deleted_at,new.version,new.data,new.deleted_at,
         new.updated_by, coalesce(auth.uid()::text,'servico:'||session_user), nullif(current_setting('fin.op_id',true),''));
  return null;
end $f$;

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
  /* sem login: só serviço com identidade comprovada e só com o modo legado ligado e dentro do prazo */
  if not public.fin_service_ok() then raise exception 'identidade de serviço não comprovada (sem login e sem papel de serviço)'; end if;
  select valor into leg from public.fin_config where chave='admin_canal_legado';
  select valor into ate from public.fin_config where chave='admin_canal_legado_ate';
  begin v_ate := nullif(ate,'')::timestamptz; exception when others then v_ate := null; end;
  if coalesce(leg,'nao')<>'sim' or v_ate is null or v_ate<=now() then
    raise exception 'conexão administrativa não autorizada (modo legado desligado ou sem prazo vigente)'; end if;
  select d.owner into owner from public.fin_canal_dono d where d.canal=p_source;
  canal:=p_source; modo:='admin_legado';
end $f$;

create or replace function public.fin_validate(p_kind text, p_data jsonb, p_create boolean) returns void
language plpgsql immutable set search_path=public as $f$
declare k text; v jsonb; n numeric; s text; d date; e jsonb; idx int := 0;
begin
  if p_kind is null or p_kind not in ('card','charge','invpay','bill','billmonth','debt','proposal','stmt') then
    raise exception 'kind inválido: %', p_kind; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'data deve ser um objeto'; end if;
  if octet_length(p_data::text) > (case when p_kind='stmt' then 400000 else 20000 end) then
    raise exception 'data grande demais (máx. % bytes)', (case when p_kind='stmt' then 400000 else 20000 end); end if;
  for k,v in select key,value from jsonb_each(p_data) loop
    if k ~ '^[A-Za-z]+C$' or k in ('rateBp','nInst','n') then
      if jsonb_typeof(v) not in ('null','number') then raise exception '% deve ser número inteiro (centavos) ou null', k; end if;
      if jsonb_typeof(v)='number' then n:=(v#>>'{}')::numeric; if n<>trunc(n) then raise exception '% deve ser inteiro (centavos), recebi %', k, n; end if; end if;
    elsif k in ('dueDay','closeDay') then
      if jsonb_typeof(v) not in ('null','number') then raise exception '% deve ser dia 1..31 ou null', k; end if;
      if jsonb_typeof(v)='number' then n:=(v#>>'{}')::numeric; if n<>trunc(n) or n<1 or n>31 then raise exception '% fora de 1..31', k; end if; end if;
    elsif k='dir' then
      if jsonb_typeof(v)<>'string' or (v#>>'{}') not in ('PAGAR','RECEBER') then raise exception 'dir deve ser PAGAR ou RECEBER'; end if;
    elsif k='paidYm' then
      if jsonb_typeof(v)<>'array' then raise exception 'paidYm deve ser lista'; end if;
      for e in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(e)<>'string' or (e#>>'{}') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'paidYm: mês inválido %', e; end if; end loop;
    elsif k in ('date','firstDue','paidAt') then
      if jsonb_typeof(v) not in ('string','null') then raise exception '%: data deve ser texto AAAA-MM-DD', k; end if;
      if jsonb_typeof(v)='string' then
        s := v#>>'{}';
        if s !~ '^\d{4}-\d{2}-\d{2}$' then raise exception '%: data deve ser AAAA-MM-DD', k; end if;
        begin d := s::date; exception when others then raise exception '%: data inexistente (%)', k, s; end;
        if to_char(d,'YYYY-MM-DD')<>s then raise exception '%: data inexistente (%)', k, s; end if;
      end if;
    elsif k in ('ym','startYm') then
      if jsonb_typeof(v) not in ('string','null') then raise exception '%: mês deve ser texto AAAA-MM', k; end if;
      if jsonb_typeof(v)='string' and (v#>>'{}') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception '%: mês inválido (%)', k, v#>>'{}'; end if;
    elsif k in ('name','creditor','desc','account','kindD','note','status','cardId','billId','by','last4','text','source','cfg') then
      if jsonb_typeof(v) not in ('string','null') then raise exception '% deve ser texto', k; end if;
    elsif k in ('variable','recurring','demo') then
      if jsonb_typeof(v) not in ('boolean','null') then raise exception '% deve ser verdadeiro ou falso', k; end if;
    elsif k='entries' then
      if p_kind<>'stmt' or jsonb_typeof(v)<>'array' then raise exception 'entries deve ser uma lista (só no extrato)'; end if;
      for e in select * from jsonb_array_elements(v) loop
        idx := idx+1;
        if jsonb_typeof(e)<>'object' then raise exception 'entries[%]: deve ser objeto', idx; end if;
        if jsonb_typeof(e->'i')<>'string' or coalesce(e->>'i','')='' then raise exception 'entries[%]: i (identificador) deve ser texto', idx; end if;
        if jsonb_typeof(e->'d')<>'string' or (e->>'d') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'entries[%]: d deve ser data AAAA-MM-DD', idx; end if;
        begin d := (e->>'d')::date; exception when others then raise exception 'entries[%]: data inexistente', idx; end;
        if to_char(d,'YYYY-MM-DD')<>(e->>'d') then raise exception 'entries[%]: data inexistente', idx; end if;
        if jsonb_typeof(e->'c')<>'number' or ((e->>'c')::numeric)<>trunc((e->>'c')::numeric) then raise exception 'entries[%]: c deve ser inteiro (centavos)', idx; end if;
        if jsonb_typeof(e->'k')<>'string' or (e->>'k') not in ('INCOME','EXPENSE','TRANSFER','CARD_SETTLEMENT','LOAN_DISBURSEMENT') then raise exception 'entries[%]: k inválido', idx; end if;
        if jsonb_typeof(e->'t') not in ('string','null') or jsonb_typeof(coalesce(e->'g','null'::jsonb)) not in ('string','null') then raise exception 'entries[%]: t e g devem ser texto', idx; end if;
      end loop;
    end if;
  end loop;
end $f$;

create or replace function public.fin_validate_full(p_kind text, p_data jsonb) returns void
language plpgsql immutable set search_path=public as $f$
declare n numeric;
begin
  /* campos obrigatórios por tipo, sempre sobre o registro COMPLETO (criação, update já mesclado e restauração) */
  if p_kind='card' and (jsonb_typeof(p_data->'name')<>'string' or coalesce(p_data->>'name','')='') then raise exception 'card exige name'; end if;
  if p_kind='bill' then
    if jsonb_typeof(p_data->'name')<>'string' or coalesce(p_data->>'name','')='' then raise exception 'bill exige name'; end if;
    if jsonb_typeof(p_data->'dueDay')<>'number' then raise exception 'bill exige dueDay (1..31)'; end if;
  end if;
  if p_kind='charge' then
    if jsonb_typeof(p_data->'cardId')<>'string' or coalesce(p_data->>'cardId','')='' then raise exception 'charge exige cardId'; end if;
    if jsonb_typeof(p_data->'date')<>'string' then raise exception 'charge exige date (AAAA-MM-DD)'; end if;
    if jsonb_typeof(p_data->'desc')<>'string' or coalesce(p_data->>'desc','')='' then raise exception 'charge exige desc'; end if;
    if jsonb_typeof(p_data->'totalC')<>'number' or (p_data->>'totalC')::numeric=0 then raise exception 'charge exige totalC (centavos, diferente de zero)'; end if;
    if p_data ? 'n' and jsonb_typeof(p_data->'n')='number' and ((p_data->>'n')::numeric<1 or (p_data->>'n')::numeric>120) then raise exception 'charge: n (parcelas) deve estar entre 1 e 120'; end if;
  end if;
  if p_kind='invpay' and (coalesce(p_data->>'cardId','')='' or jsonb_typeof(p_data->'cardId')<>'string' or jsonb_typeof(p_data->'ym')<>'string') then raise exception 'invpay exige cardId e ym'; end if;
  if p_kind='billmonth' and (jsonb_typeof(p_data->'billId')<>'string' or coalesce(p_data->>'billId','')='' or jsonb_typeof(p_data->'ym')<>'string') then raise exception 'billmonth exige billId e ym'; end if;
  if p_kind='debt' then
    if jsonb_typeof(p_data->'creditor')<>'string' or coalesce(p_data->>'creditor','')='' then raise exception 'debt exige creditor'; end if;
    if p_data->>'balanceC' is not null and (p_data->>'balanceC')::numeric<0 then raise exception 'balanceC negativo'; end if;
    if p_data->>'installC' is not null and (p_data->>'installC')::numeric<0 then raise exception 'installC negativo'; end if;
    if p_data->>'rateBp' is not null and (p_data->>'rateBp')::numeric<0 then raise exception 'rateBp negativo'; end if;
    if p_data ? 'status' and p_data->>'status' is not null and p_data->>'status' not in ('ATIVA','ATRASADA','PAGA','DESCONHECIDA') then
      raise exception 'status inválido (use ATIVA, ATRASADA, PAGA ou DESCONHECIDA)'; end if;
  end if;
  if p_kind='debt' and p_data->>'nInst' is not null and (p_data->>'nInst')::numeric<1 then raise exception 'nInst deve ser >= 1'; end if;
  if p_kind='card' and p_data->>'limitC' is not null and (p_data->>'limitC')::numeric<0 then raise exception 'limitC negativo'; end if;
  if p_kind='bill' and p_data->>'amountC' is not null and (p_data->>'amountC')::numeric<0 then raise exception 'amountC negativo'; end if;
  if p_kind='stmt' then
    if jsonb_typeof(p_data->'account')<>'string' or coalesce(p_data->>'account','')='' then raise exception 'stmt exige account'; end if;
    if jsonb_typeof(p_data->'entries')<>'array' then raise exception 'stmt exige entries (lista)'; end if;
  end if;
  if p_kind='proposal' and not ( (jsonb_typeof(p_data->'text')='string' and coalesce(p_data->>'text','')<>'')
        or (p_data->>'cfg'='capacity' and jsonb_typeof(p_data->'capacityC')='number')
        or (p_data->>'cfg'='sortprefs' and jsonb_typeof(p_data->'prefs')='object')
        or (p_data->>'cfg'='cats' and jsonb_typeof(p_data->'rules')='array') ) then
    raise exception 'proposal exige text, ou cfg=capacity com capacityC, ou cfg=sortprefs com prefs, ou cfg=cats com rules'; end if;
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
  if not found or l.owner is distinct from r.owner or l.source is distinct from v_alvo then return null; end if;
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
    /* repetição: mesma autorização do fin_op_result (dono, canal e modalidade conferidos) e as operações ainda precisam ser permitidas a quem repete */
    if v_log.owner is distinct from v_owner or v_log.source is distinct from v_canal then raise exception 'recibo pertence a outro canal'; end if;
    for v_op in select * from jsonb_array_elements(p_ops) loop
      if (v_op->>'op') is null or not ((v_op->>'op') = any(v_perm)) then raise exception 'operação não permitida para este canal (%)', coalesce(v_op->>'op','?'); end if;
    end loop;
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
    values (v_owner,p_op_id,v_canal,v_modo,coalesce(auth.uid()::text,'servico:'||session_user),v_hash,v_out);
  perform set_config('fin.via_apply', 'off', true);
  return v_out;
end $f$;


-- escrita direta sem login: só via fin_apply ou na janela do modo legado (com prazo)
create or replace function public.fin_escrita_guard() returns trigger
language plpgsql security definer set search_path=public as $f$
declare leg text; ate text; v_ate timestamptz;
begin
  if auth.uid() is null and coalesce(current_setting('fin.via_apply',true),'')<>'on' then
    if not public.fin_service_ok() then
      raise exception 'escrita direta recusada em fin_records: identidade de serviço não comprovada';
    end if;
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

revoke all on function public.fin_apply(text,text,jsonb) from public, anon;
revoke all on function public.fin_op_result(text,text,text) from public, anon;
revoke all on function public.fin_resolve(text) from public, anon, authenticated;
revoke all on function public.fin_validate_full(text,jsonb) from public, anon;
revoke all on function public.fin_validate(text,jsonb,boolean) from public, anon;
revoke all on function public.fin_hist() from public, anon, authenticated;
revoke all on function public.fin_escrita_guard() from public, anon, authenticated;
grant execute on function public.fin_apply(text,text,jsonb) to authenticated, service_role;
grant execute on function public.fin_op_result(text,text,text) to authenticated, service_role;
