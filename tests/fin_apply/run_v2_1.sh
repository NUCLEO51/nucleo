P="psql -h ${PGHOST:-/tmp/pgt} -p ${PGPORT:-5544} -U ${PGUSER:-pgtest} -d ${PGDB:-t} -q -t -A"
A=aaaaaaaa-0000-0000-0000-000000000001
ok(){ echo "PASS  $1"; }; ko(){ echo "FALHA $1"; FAIL=1; }
q(){ $P -c "$1" 2>&1; }
cnt(){ q "select count(*) from fin_records where deleted_at is null and kind<>'card'"; }
apply(){ q "select fin_apply('$1','${3:-gpt}','$2'::jsonb)"; }

r=$(apply op-0000001 '[{"op":"create","kind":"debt","data":{"creditor":"João","balanceC":20000,"dir":"RECEBER"}}]'); echo "$r"|grep -q '"reutilizado": false' && ok "T1 cria dívida a receber" || ko "T1 $r"
n1=$(cnt)
r=$(apply op-0000001 '[{"op":"create","kind":"debt","data":{"creditor":"João","balanceC":20000,"dir":"RECEBER"}}]'); echo "$r"|grep -q '"repetida": true' && [ "$(cnt)" = "$n1" ] && ok "T2 mesmo pedido repetido não duplica" || ko "T2 $r"
r=$(apply op-0000001 '[{"op":"create","kind":"debt","data":{"creditor":"João","balanceC":99999,"dir":"RECEBER"}}]'); echo "$r"|grep -qi 'conflito' && ok "T3 mesmo op_id com conteúdo diferente = conflito" || ko "T3 $r"

# T4 concorrência
( apply op-concorr1 '[{"op":"create","kind":"debt","data":{"creditor":"Conc","balanceC":100,"dir":"PAGAR"},"capture_id":"capC","item_id":"x"}]' >/tmp/pgt/c1 ) &
( apply op-concorr1 '[{"op":"create","kind":"debt","data":{"creditor":"Conc","balanceC":100,"dir":"PAGAR"},"capture_id":"capC","item_id":"x"}]' >/tmp/pgt/c2 ) &
( apply op-concorr2 '[{"op":"create","kind":"debt","data":{"creditor":"Conc","balanceC":100,"dir":"PAGAR"},"capture_id":"capC","item_id":"x"}]' >/tmp/pgt/c3 ) &
wait
[ "$(q "select count(*) from fin_records where data->>'creditor'='Conc'")" = "1" ] && ok "T4 três chamadas simultâneas = 1 registro" || ko "T4 $(cat c1 c2 c3|head -c 600)"

# T5 captura com vários itens
apply op-multi001 '[{"op":"create","kind":"bill","capture_id":"cap1","item_id":"luz","data":{"name":"Luz","dueDay":10}},{"op":"create","kind":"charge","capture_id":"cap1","item_id":"c1","data":{"cardId":"CARD","desc":"Mercado","totalC":5000}}]' >/dev/null 2>&1
CARD=$(q "select id from fin_records where kind='card'")
r=$(apply op-multi001 "[{\"op\":\"create\",\"kind\":\"bill\",\"capture_id\":\"cap1\",\"item_id\":\"luz\",\"data\":{\"name\":\"Luz\",\"dueDay\":10}},{\"op\":\"create\",\"kind\":\"charge\",\"capture_id\":\"cap1\",\"item_id\":\"c1\",\"data\":{\"cardId\":\"$CARD\",\"desc\":\"Mercado\",\"totalC\":5000}}]")
[ "$(q "select count(*) from fin_records where data->>'capture_id'='cap1'")" = "2" ] && ok "T5 uma captura com 2 itens gera 2 registros" || ko "T5 $r"
r=$(apply op-multi002 "[{\"op\":\"create\",\"kind\":\"bill\",\"capture_id\":\"cap1\",\"item_id\":\"luz\",\"data\":{\"name\":\"Luz\",\"dueDay\":10}}]")
echo "$r"|grep -q '"reutilizado": true' && [ "$(q "select count(*) from fin_records where data->>'capture_id'='cap1'")" = "2" ] && ok "T5b reenvio da captura com outro op_id não duplica" || ko "T5b $r"

# T6 lixeira não recria
LID=$(q "select id||'|'||version from fin_records where data->>'item_id'='luz'"); id=${LID%|*}; v=${LID#*|}
apply op-delete01 "[{\"op\":\"delete\",\"id\":\"$id\",\"expected_version\":$v}]" >/dev/null
r=$(apply op-multi003 "[{\"op\":\"create\",\"kind\":\"bill\",\"capture_id\":\"cap1\",\"item_id\":\"luz\",\"data\":{\"name\":\"Luz\",\"dueDay\":10}}]")
echo "$r"|grep -q '"na_lixeira": true' && [ "$(q "select count(*) from fin_records where data->>'item_id'='luz'")" = "1" ] && ok "T6 item excluído não reaparece por reenvio" || ko "T6 $r"

# T7 duas compras iguais legítimas
for k in a b; do apply op-igual-$k "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{\"cardId\":\"$CARD\",\"desc\":\"Padaria\",\"totalC\":6000,\"date\":\"2026-10-22\"}}]" >/dev/null; done
[ "$(q "select count(*) from fin_records where data->>'desc'='Padaria'")" = "2" ] && ok "T7 duas compras iguais (mesmo dia e valor) preservadas" || ko "T7"

# T8 conflito de versão
JID=$(q "select id||'|'||version from fin_records where data->>'creditor'='João'"); jid=${JID%|*}; jv=${JID#*|}
apply op-upd00001 "[{\"op\":\"update\",\"id\":\"$jid\",\"expected_version\":$jv,\"data\":{\"balanceC\":25000}}]" >/dev/null
r=$(apply op-upd00002 "[{\"op\":\"update\",\"id\":\"$jid\",\"expected_version\":$jv,\"data\":{\"balanceC\":1}}]")
echo "$r"|grep -qi 'conflito de versão' && [ "$(q "select data->>'balanceC' from fin_records where id='$jid'")" = "25000" ] && ok "T8 versão desatualizada não sobrescreve" || ko "T8 $r"

# T9/T10 validações
t(){ r=$(apply "$1" "$2"); echo "$r"|grep -qi "$3" && ok "$4" || ko "$4 :: $r"; }
t op-val00001 '[{"op":"create","kind":"debt","data":{"creditor":"X","balanceC":10.5}}]' 'inteiro' "T9a centavos fracionados recusados"
t op-val00002 '[{"op":"create","kind":"debt","data":{"creditor":"X","balanceC":"100"}}]' 'número inteiro' "T9b texto no lugar de número recusado"
t op-val00003 '[{"op":"create","kind":"debt","data":{"creditor":"X","dir":"TALVEZ"}}]' 'PAGAR ou RECEBER' "T9c dir inválido recusado"
t op-val00004 '[{"op":"create","kind":"debt","data":{"creditor":"X","firstDue":"2026-02-30"}}]' 'inexistente' "T10 data inexistente recusada"
t op-val00005 '[{"op":"create","kind":"debt","data":{"creditor":"X","dueDay":40}}]' '1..31' "T10b dia 40 recusado"
t op-val00006 '[{"op":"create","kind":"foo","data":{}}]' 'kind inválido' "T10c tipo desconhecido recusado"
t op-val00007 '[{"op":"create","kind":"charge","data":{"cardId":"00000000-0000-0000-0000-000000000009","desc":"x"}}]' 'não existe' "T11 cartão inexistente recusado"
r=$(apply op-val00008 '[{"op":"create","kind":"debt","data":{"creditor":"Sem valor","balanceC":null,"dir":"PAGAR"}}]'); echo "$r"|grep -q '"balanceC": null' && ok "T9d null aceito e continua null (não vira 0)" || ko "T9d $r"

# T12 isolamento
B=bbbbbbbb-0000-0000-0000-000000000002
r=$($P -c "set request.jwt.claim.sub='$B'; select fin_apply('op-iso00001','fin','[{\"op\":\"update\",\"id\":\"$jid\",\"expected_version\":9,\"data\":{\"balanceC\":1}}]'::jsonb)" 2>&1)
echo "$r"|grep -qi 'não encontrado para este dono' && ok "T12 outro usuário não alcança registro alheio" || ko "T12 $r"
r=$(apply op-iso00002 '[{"op":"create","kind":"debt","data":{"creditor":"Z"}}]' fin); echo "$r"|grep -qi 'dono não identificado' && ok "T12b sem login e sem canal cadastrado = recusado" || ko "T12b $r"
r=$(apply op-iso00003 '[{"op":"create","kind":"debt","data":{"creditor":"Z"}}]' hacker); echo "$r"|grep -qi 'source inválida' && ok "T12c canal desconhecido recusado" || ko "T12c $r"

# T13 histórico
h=$(q "select canal||'|'||coalesce(op_id,'')||'|'||version||'>'||new_version from fin_records_hist where id='$jid' order by hid desc limit 1")
echo "$h"|grep -q 'gpt|op-upd00001|' && ok "T13 histórico guarda canal, op_id e versões ($h)" || ko "T13 $h"
r=$($P -c "set role service_role; update fin_records_hist set canal='x'" 2>&1); echo "$r"|grep -qi 'permission denied' && ok "T13b histórico não pode ser alterado" || ko "T13b $r"
r=$($P -c "set role anon; select fin_apply('op-anon0001','gpt','[]'::jsonb)" 2>&1); echo "$r"|grep -qi 'permission denied' && ok "T13c visitante anônimo não executa fin_apply" || ko "T13c $r"
r=$($P -c "set role authenticated; select * from fin_canal_dono" 2>&1); echo "$r"|grep -qi 'permission denied' && ok "T13d logado comum não lê tabelas internas" || ko "T13d $r"

# T14 atômico
n=$(q "select count(*) from fin_records"); r=$(apply op-atom0001 '[{"op":"create","kind":"debt","data":{"creditor":"Bom"}},{"op":"create","kind":"debt","data":{"creditor":"Ruim","balanceC":1.5}}]')
[ "$(q "select count(*) from fin_records")" = "$n" ] && [ "$(q "select count(*) from fin_ops_log where op_id='op-atom0001'")" = "0" ] && ok "T14 lote com erro = nada gravado, nem recibo (nova tentativa segura)" || ko "T14"

# T15 recibo
r=$(q "select fin_op_result('op-upd00001','gpt')"); echo "$r"|grep -q '"repetida": true' && ok "T15 recibo recuperável sem repetir" || ko "T15 $r"

# ===== v2.1: credencial decide canal e dono =====
G=99999999-0000-0000-0000-00000000000a; C=99999999-0000-0000-0000-00000000000b; RV=99999999-0000-0000-0000-00000000000c; EX=99999999-0000-0000-0000-00000000000d
$P -c "insert into fin_atores(actor,canal,owner) values ('$G','gpt','$A'),('$C','claude','$A'); insert into fin_atores(actor,canal,owner,ativo) values ('$RV','gpt','$A',false); insert into fin_atores(actor,canal,owner,expira) values ('$EX','gpt','$A',now()-interval '1 hour')" >/dev/null
as(){ $P -c "set request.jwt.claim.sub='$1'; set role authenticated; select fin_apply('$2','$3','$4'::jsonb)" 2>&1; }
res(){ $P -c "set request.jwt.claim.sub='$1'; set role authenticated; select fin_op_result('$2','$3')" 2>&1; }
OPS='[{"op":"create","kind":"debt","data":{"creditor":"Via ator","balanceC":500,"dir":"PAGAR"}}]'
r=$(as $G op-ator0001 gpt "$OPS"); echo "$r"|grep -q '"ok": true' && ok "T16 credencial do canal gpt grava como gpt" || ko "T16 $r"
r=$(as $G op-ator0002 claude "$OPS"); echo "$r"|grep -qi 'não permitido para esta credencial' && ok "T16b credencial gpt NÃO pode usar canal claude (canal alheio)" || ko "T16b $r"
r=$(as $C op-ator0003 gpt "$OPS"); echo "$r"|grep -qi 'não permitido para esta credencial' && ok "T16c credencial claude NÃO pode usar canal gpt" || ko "T16c $r"
r=$(as $RV op-ator0004 gpt "$OPS"); echo "$r"|grep -qi 'revogada' && ok "T17 credencial revogada recusada" || ko "T17 $r"
r=$(as $EX op-ator0005 gpt "$OPS"); echo "$r"|grep -qi 'expirada' && ok "T17b credencial expirada recusada" || ko "T17b $r"
r=$(as $A op-ator0006 gpt "$OPS"); echo "$r"|grep -qi 'login comum' && ok "T18 login comum não pode se passar por canal gpt" || ko "T18 $r"
r=$(as $A op-ator0007 fin "$OPS"); echo "$r"|grep -q '"ok": true' && ok "T18b login comum grava como fin" || ko "T18b $r"
r=$(res $G op-ator0001 gpt); echo "$r"|grep -q '"repetida": true' && ok "T19 canal lê o próprio recibo" || ko "T19 $r"
r=$(res $C op-ator0001 claude); [ -z "$(echo "$r"|grep -q '"ok"' && echo x)" ] && ok "T19b outro canal (mesmo dono) NÃO lê recibo alheio" || ko "T19b $r"
r=$(res $A op-ator0001 fin); echo "$r"|grep -q '"ok": true' && ok "T19c dono logado lê recibos dos seus canais" || ko "T19c $r"
r=$(res $B op-ator0001 fin); [ -z "$(echo "$r"|grep -q '"ok"' && echo x)" ] && ok "T19d outro usuário (conta B) NÃO lê recibo mesmo sabendo o op_id" || ko "T19d $r"
VID=$(q "select id||'|'||version from fin_records where data->>'creditor'='Via ator' and updated_by='gpt' limit 1"); vid=${VID%|*}; vv=${VID#*|}
as $G op-ator0009 gpt "[{\"op\":\"update\",\"id\":\"$vid\",\"expected_version\":$vv,\"data\":{\"balanceC\":777}}]" >/dev/null
a=$(q "select actor from fin_records_hist where id='$vid' order by hid desc limit 1"); [ "$a" = "$G" ] && ok "T22 histórico registra o ATOR autenticado ($a)" || ko "T22 $a"
r=$(apply op-cap-conf1 '[{"op":"create","kind":"bill","capture_id":"cap1","item_id":"luz","data":{"name":"Luz","dueDay":11}}]'); echo "$r"|grep -qi 'conflito' && ok "T5c mesmo capture/item com conteúdo diferente = CONFLITO" || ko "T5c $r"
$P -c "update fin_config set valor='nao' where chave='admin_canal_legado'" >/dev/null
r=$(apply op-leg00001 "$OPS"); echo "$r"|grep -qi 'não autorizada' && ok "T20 modo legado desligado: conexão admin sem login recusada" || ko "T20 $r"
r=$(as $G op-ator0008 gpt "$OPS"); echo "$r"|grep -q '"ok": true' && ok "T20b com legado desligado, a credencial do canal continua funcionando" || ko "T20b $r"
$P -c "update fin_config set valor='sim' where chave='admin_canal_legado'" >/dev/null
echo FIM; [ -z "$FAIL" ] && echo TODOS_PASSARAM
