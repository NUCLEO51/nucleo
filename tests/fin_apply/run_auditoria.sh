#!/usr/bin/env bash
# Testes das correções da AUD512 (23/10/2026) à fin_apply. Devem FALHAR na v2.1 (reproduzem os problemas) e PASSAR na v2.2.
# Postgres de ENSAIO com stubs (não é Supabase). Uso: bash run_all.sh <sql> tests/fin_apply/run_auditoria.sh
P="psql -h ${PGHOST:-/tmp/pgt} -p ${PGPORT:-5544} -U ${PGUSER:-pgtest} -d ${PGDB:-t} -q -t -A"
A=aaaaaaaa-0000-0000-0000-000000000001; B=bbbbbbbb-0000-0000-0000-000000000002
G=99999999-0000-0000-0000-00000000000a; C=99999999-0000-0000-0000-00000000000b; D=99999999-0000-0000-0000-00000000000e
FAIL=0; ok(){ echo "PASS  $1"; }; ko(){ echo "FALHA $1"; FAIL=1; }
q(){ $P -c "$1" 2>&1; }
admin(){ q "select fin_apply('$1','${3:-gpt}','$2'::jsonb)"; }
as(){ $P -c "set request.jwt.claim.sub='$1'; set role authenticated; select fin_apply('$2','$3','$4'::jsonb)" 2>&1; }
res(){ $P -c "set request.jwt.claim.sub='$1'; set role authenticated; select ${4:+fin_op_result('$2','$3','$4')}${4:-fin_op_result('$2','$3')}" 2>&1; }
has(){ echo "$1"|grep -qi -- "$2"; }
rej(){ has "$1" "ERROR" && ! has "$1" '"ok": true' && has "$1" "$2"; }   # rejeitada de verdade: erro + sem "ok": true + mensagem esperada
id_of(){ echo "$1" | python3 -c 'import sys,json; t=sys.stdin.read(); d=json.loads(t[t.index("{"):]); print(d["resultados"][0]["registro"]["id"])' 2>/dev/null; }
ver_of(){ q "select version from fin_records where id='$1'"; }

# atores de teste (como superusuário de ensaio)
$P -c "insert into fin_atores(actor,canal,owner) values ('$G','gpt','$A'),('$C','claude','$A') on conflict do nothing" >/dev/null
CARD=$(q "select id from fin_records where kind='card' limit 1")

echo "== 5/2: modo legado nasce DESLIGADO (fail-closed) e tem prazo =="
r=$(admin op-aud-leg01 '[{"op":"create","kind":"debt","data":{"creditor":"L1"}}]'); rej "$r" 'não autorizada' && ok "A5a conexão administrativa recusada por padrão (legado desligado ao instalar)" || ko "A5a $r"
$P -c "insert into fin_config(chave,valor) values('admin_canal_legado','sim') on conflict(chave) do update set valor='sim'" >/dev/null
r=$(admin op-aud-leg02 '[{"op":"create","kind":"debt","data":{"creditor":"L2"}}]'); rej "$r" 'não autorizada' && ok "A5b 'sim' sem prazo (admin_canal_legado_ate) continua recusado" || ko "A5b $r"
$P -c "insert into fin_config(chave,valor) values('admin_canal_legado_ate',(now()+interval '1 day')::text) on conflict(chave) do update set valor=excluded.valor" >/dev/null
r=$(admin op-aud-leg03 '[{"op":"create","kind":"debt","data":{"creditor":"L3"}}]'); has "$r" '"ok": true' && ok "A5c legado ligado COM prazo futuro funciona" || ko "A5c $r"
$P -c "update fin_config set valor=(now()-interval '1 minute')::text where chave='admin_canal_legado_ate'" >/dev/null
r=$(admin op-aud-leg04 '[{"op":"create","kind":"debt","data":{"creditor":"L4"}}]'); rej "$r" 'não autorizada' && ok "A5d legado com prazo VENCIDO volta a ser recusado" || ko "A5d $r"
$P -c "update fin_config set valor=(now()+interval '1 day')::text where chave='admin_canal_legado_ate'" >/dev/null
u=$(q "select count(*) from fin_legado_uso where canal='gpt'"); [ "$u" -ge 1 ] 2>/dev/null && ok "A5e uso do modo legado é medido (fin_legado_uso)" || ko "A5e $u"

echo "== 2: ciclo de vida das credenciais =="
r=$($P -c "set request.jwt.claim.sub='$A'; set role authenticated; select fin_ator_registrar('$D','box','$A',30)" 2>&1); has "$r" 'permission denied' && ok "A6a usuário comum NÃO registra credencial" || ko "A6a $r"
$P -c "select fin_ator_registrar('$D','box','$A',30)" >/dev/null 2>&1; n=$(q "select count(*) from fin_atores where actor='$D' and ativo and expira>now()"); [ "$n" = "1" ] && ok "A6b serviço registra credencial com expiração" || ko "A6b $n"
r=$(as $D op-aud-box01 box '[{"op":"create","kind":"debt","data":{"creditor":"Box1"}}]'); has "$r" '"ok": true' && ok "A6c credencial registrada funciona no seu canal" || ko "A6c $r"
$P -c "select fin_ator_revogar('$D')" >/dev/null 2>&1
r=$(as $D op-aud-box02 box '[{"op":"create","kind":"debt","data":{"creditor":"Box2"}}]'); rej "$r" 'revogada' && ok "A6d revogação vale imediatamente" || ko "A6d $r"

echo "== 1: isolamento de op_id e de capture entre canais (mesmo dono) =="
OPS='[{"op":"create","kind":"debt","data":{"creditor":"Isolamento","balanceC":1000,"dir":"PAGAR"}}]'
r1=$(as $G op-aud-iso01 gpt "$OPS"); gid=$(id_of "$r1")
r2=$(as $C op-aud-iso01 claude "$OPS"); cid=$(id_of "$r2")
{ has "$r2" '"repetida": false' && [ -n "$cid" ] && [ "$cid" != "$gid" ]; } && ok "A1a mesmo op_id em OUTRO canal não devolve o resultado do primeiro" || ko "A1a (recebeu: $(echo $r2|head -c 200))"
as $G op-aud-iso09 gpt "$OPS" >/dev/null
r3=$(as $C op-aud-iso09 claude '[{"op":"create","kind":"debt","data":{"creditor":"Outro conteudo"}}]'); has "$r3" 'conflito' && ko "A1b op_id de outro canal vaza 'conflito' (revela que existe)" || ok "A1b sem vazamento de existência do op_id alheio"
as $G op-aud-cap01 gpt '[{"op":"create","kind":"debt","capture_id":"capX","item_id":"1","data":{"creditor":"Capt G"}}]' >/dev/null
r=$(as $C op-aud-cap02 claude '[{"op":"create","kind":"debt","capture_id":"capX","item_id":"1","data":{"creditor":"Capt G"}}]')
{ has "$r" 'outro canal' && ! has "$r" 'Capt G' && ! has "$r" '"registro"'; } && ok "A1c capture/item de outro canal: recusado SEM devolver o registro" || ko "A1c $(echo $r|head -c 200)"
r=$(res $C op-aud-iso01 claude); has "$r" "$gid" && ko "A1d fin_op_result vazou resultado alheio" || ok "A1d fin_op_result do canal não lê recibo de outro"
r=$(res $A op-aud-iso01 fin); has "$r" "$gid" && ko "A1e dono vê recibo de canal sem pedir o canal" || ok "A1e dono logado, sem indicar canal, só lê o canal 'fin'"
r=$(res $A op-aud-iso01 fin gpt); has "$r" "$gid" && ok "A1f dono logado lê o recibo do canal indicado" || ko "A1f $r"
r=$(res $G op-aud-iso01 gpt claude); rej "$r" 'não permitido' && ok "A1g credencial de canal não consegue pedir recibo de outro canal" || ko "A1g $r"
$P -c "insert into fin_atores(actor,canal,owner,ops) values ('99999999-0000-0000-0000-0000000000f1','mobills','$A',array['create'])" >/dev/null 2>&1
M=99999999-0000-0000-0000-0000000000f1
rm=$(as $M op-aud-mob01 mobills '[{"op":"create","kind":"debt","data":{"creditor":"Mob","balanceC":5}}]'); mid=$(id_of "$rm")
r=$(as $M op-aud-mob02 mobills "[{\"op\":\"delete\",\"id\":\"$mid\",\"expected_version\":1}]"); rej "$r" 'operação não permitida' && ok "A1h canal com permissão só de 'create' não consegue apagar" || ko "A1h $r"

echo "== 3: registro COMPLETO após atualização parcial =="
rd=$(as $G op-aud-v001 gpt '[{"op":"create","kind":"debt","data":{"creditor":"Val","balanceC":5000,"installC":500,"status":"ATIVA","dir":"PAGAR"}}]'); did=$(id_of "$rd")
upd(){ as $G "$1" gpt "[{\"op\":\"update\",\"id\":\"$2\",\"expected_version\":$(ver_of $2),\"data\":$3}]"; }
r=$(upd op-aud-v002 $did '{"creditor":""}'); rej "$r" 'creditor' && ok "A8a não deixa esvaziar campo obrigatório (creditor)" || ko "A8a $(echo $r|head -c 150)"
r=$(upd op-aud-v003 $did '{"balanceC":-100}'); rej "$r" 'negativ' && ok "A8b saldo negativo recusado" || ko "A8b $(echo $r|head -c 150)"
r=$(upd op-aud-v004 $did '{"status":"XYZ"}'); rej "$r" 'status' && ok "A8c status fora da lista recusado" || ko "A8c $(echo $r|head -c 150)"
r=$(upd op-aud-v005 $did '{"capture_id":"forjado"}'); rej "$r" 'imut' && ok "A8d capture_id/item_id/src não podem ser alterados" || ko "A8d $(echo $r|head -c 150)"
r=$(upd op-aud-v006 $did '{"nInst":0}'); rej "$r" 'nInst' && ok "A8e nInst zero recusado" || ko "A8e $(echo $r|head -c 150)"
r=$(upd op-aud-v007 $did '{"status":"PAGA"}'); has "$r" '"ok": true' && ok "A8f atualização válida continua funcionando" || ko "A8f $(echo $r|head -c 150)"
r=$(as $G op-aud-v008 gpt '[{"op":"create","kind":"debt","data":{"creditor":"Ruim","status":"XYZ"}}]'); rej "$r" 'status' && ok "A8g criar com status inválido recusado" || ko "A8g $(echo $r|head -c 150)"
rc=$(as $G op-aud-c001 gpt "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{\"cardId\":\"$CARD\",\"desc\":\"Compra\",\"totalC\":3000,\"date\":\"2026-10-20\"}}]"); chid=$(id_of "$rc")
r=$(upd op-aud-c002 $chid '{"cardId":null}'); rej "$r" 'cardId' && ok "A8h charge sem cardId após update parcial recusado" || ko "A8h $(echo $r|head -c 150)"
r=$(upd op-aud-c003 $chid '{"totalC":-5000}'); has "$r" '"ok": true' && ok "A8i estorno (totalC negativo) em charge continua permitido" || ko "A8i $(echo $r|head -c 150)"
rb=$(as $G op-aud-b001 gpt '[{"op":"create","kind":"bill","data":{"name":"Luz AUD","dueDay":10}}]'); bid=$(id_of "$rb")
r=$(upd op-aud-b002 $bid '{"name":""}'); rej "$r" 'name' && ok "A8j bill sem name após update parcial recusado" || ko "A8j $(echo $r|head -c 150)"
$P -c "update fin_records set deleted_at=now() where id='$CARD'" >/dev/null
r=$(upd op-aud-c004 $chid '{"desc":"Compra renomeada"}'); has "$r" '"ok": true' && ok "A8k campo sem relação com a referência pode ser editado mesmo com cartão na lixeira (decisão documentada)" || ko "A8k $(echo $r|head -c 150)"
r=$(as $G op-aud-c005 gpt "[{\"op\":\"delete\",\"id\":\"$chid\",\"expected_version\":$(ver_of $chid)}]"); chv=$(ver_of $chid)
r=$(as $G op-aud-c006 gpt "[{\"op\":\"restore\",\"id\":\"$chid\",\"expected_version\":$chv}]"); rej "$r" 'cardId' && ok "A8l restaurar charge cujo cartão está na lixeira é recusado" || ko "A8l $(echo $r|head -c 150)"
$P -c "update fin_records set deleted_at=null where id='$CARD'" >/dev/null

echo; [ $FAIL = 0 ] && echo AUDITORIA_TODOS_PASSARAM || echo AUDITORIA_COM_FALHAS
