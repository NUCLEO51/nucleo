# Ensaios específicos dos 4 achados do GPT (commit 2e13f79). Chamado por run_v2_4_all.sh (banco t já carregado).
P="psql -h ${PGHOST:-/tmp/pgt} -p ${PGPORT:-5544} -U ${PGUSER:-pgtest} -d t -q -t -A"
PQ="psql -h ${PGHOST:-/tmp/pgt} -p ${PGPORT:-5544} -U ${PGUSER:-pgtest}"
R=$(cd "$(dirname "$0")/../.." && pwd)
A=aaaaaaaa-0000-0000-0000-000000000001
G=99999999-0000-0000-0000-00000000000a; C=99999999-0000-0000-0000-00000000000b
ok(){ echo "PASS  $1"; }; ko(){ echo "FALHA $1"; FAIL=1; }
q(){ $P -c "$1" 2>&1; }
# identidades: serviço comprovado (claim role=service_role) | sem identidade (nenhum claim) | ator/usuário com login
svc(){ $P -c "set request.jwt.claim.role='service_role'; select fin_apply('$1','${3:-gpt}','$2'::jsonb)" 2>&1; }
anon(){ $P -c "select fin_apply('$1','${3:-gpt}','$2'::jsonb)" 2>&1; }
as(){ $P -c "set request.jwt.claim.sub='$1'; set role authenticated; select fin_apply('$2','$3','$4'::jsonb)" 2>&1; }
N=0
cv(){ q "select version from fin_records where id='$1'"; }
# impressão digital de TUDO que uma operação recusada não pode tocar (registros, versões, conteúdo, lixeira, recibos, histórico)
fp(){ q "select (select count(*)||'/'||coalesce(sum(version),0)||'/'||md5(coalesce(string_agg(id::text||data::text||coalesce(deleted_at::text,''),'' order by id),'')) from fin_records)||'/'||(select count(*) from fin_ops_log)||'/'||(select count(*) from fin_records_hist)||'/'||(select count(*) from fin_capture_items)"; }
# t FUNÇÃO OPS PADRÃO DESCRIÇÃO — só é PASS se: saída tem ERROR com o padrão esperado, NÃO tem "ok": true, e NADA mudou no banco
t(){ N=$((N+1)); local a b; a=$(fp); r=$("$1" "op-t$(printf %05d $N)x" "$2" gpt); b=$(fp)
  if echo "$r"|grep -q '"ok": true'; then ko "$4 :: operação foi ACEITA"
  elif ! echo "$r"|grep -q '^ERROR'; then ko "$4 :: sem erro: $(echo "$r"|head -c 150)"
  elif ! echo "$r"|grep '^ERROR'|grep -qi "$3"; then ko "$4 :: erro diferente do esperado: $(echo "$r"|grep '^ERROR'|head -c 200)"
  elif [ "$a" != "$b" ]; then ko "$4 :: recusou mas o banco MUDOU"
  else ok "$4"; fi; }
# tp FUNÇÃO OPS DESCRIÇÃO — controle positivo: precisa ser aceita
tp(){ N=$((N+1)); r=$("$1" "op-t$(printf %05d $N)x" "$2" gpt); echo "$r"|grep -q '"ok": true' && ok "$3" || ko "$3 :: $(echo "$r"|head -c 200)"; }
ta(){ r=$(as $G "$1" gpt "$2"); echo "$r"|grep -qi "$3" && ok "$4" || ko "$4 :: $(echo "$r"|head -c 300)"; }
legado(){ $P -c "update fin_config set valor='$1' where chave='admin_canal_legado'; update fin_config set valor='$2' where chave='admin_canal_legado_ate'" >/dev/null; }
legado sim "$(date -u -d '+1 day' '+%Y-%m-%d %H:%M:%S+00')"
$P -c "insert into fin_atores(actor,canal,owner) values ('$G','gpt','$A'),('$C','claude','$A')" >/dev/null
echo "== modo: ${MODE:-?} =="

echo "--- ACHADO 1: recibo repetido precisa da mesma autorização"
OPS='[{"op":"create","kind":"debt","data":{"creditor":"Recibo","balanceC":500,"dir":"PAGAR"}}]'
r=$(as $G op-rec00001 gpt "$OPS"); echo "$r"|grep -q '"ok": true' && ok "1.0 ator gpt grava" || ko "1.0 $r"
r=$(as $G op-rec00001 gpt "$OPS"); echo "$r"|grep -q '"repetida": true' && ok "1.1 mesmo ator/canal repete e recebe o recibo" || ko "1.1 $r"
r=$(as $C op-rec00001 claude "$OPS"); echo "$r"|grep -q '"repetida": true' && ko "1.2 outro canal recebeu recibo alheio" || ok "1.2 mesmo op_id em OUTRO canal não devolve o recibo do gpt"
n=$(q "select count(*) from fin_records where data->>'creditor'='Recibo'"); [ "$n" = "2" ] && ok "1.2b outro canal executou o próprio pedido (2 registros, um por canal)" || ko "1.2b n=$n"
r=$(as $C op-rec00001 gpt "$OPS"); echo "$r"|grep -qi 'não permitido para esta credencial' && ok "1.3 credencial claude NÃO repete op_id no canal gpt" || ko "1.3 $r"
r=$($P -c "set request.jwt.claim.sub='$C'; set role authenticated; select fin_op_result('op-rec00001','gpt')" 2>&1); echo "$r"|grep -qi 'não permitido' && ok "1.3b fin_op_result: mesma recusa" || ko "1.3b $r"
$P -c "update fin_atores set ops=array['update'] where actor='$G'" >/dev/null
r=$(as $G op-rec00001 gpt "$OPS"); echo "$r"|grep -qi 'operação não permitida' && ok "1.4 ator que perdeu a permissão 'create' NÃO recebe o recibo da criação" || ko "1.4 $(echo "$r"|head -c 200)"
$P -c "update fin_atores set ops=array['create','update','delete','restore'] where actor='$G'" >/dev/null
$P -c "update fin_atores set ativo=false where actor='$G'" >/dev/null
r=$(as $G op-rec00001 gpt "$OPS"); echo "$r"|grep -qi 'revogada' && ok "1.5 credencial revogada não recebe recibo" || ko "1.5 $r"
$P -c "update fin_atores set ativo=true where actor='$G'" >/dev/null
r=$(as $G op-rec00001 gpt '[{"op":"create","kind":"debt","data":{"creditor":"Recibo","balanceC":999,"dir":"PAGAR"}}]'); echo "$r"|grep -qi 'conflito' && ok "1.6 mesmo op_id, conteúdo diferente = conflito" || ko "1.6 $r"

echo "--- ACHADO 2: tipos e registro completo"
OP='[{"op":"create","kind":"debt","data":{"creditor":"X"'
t svc "$OP,\"firstDue\":20261030}}]" "texto" "2.1 data numérica recusada (create)"
t svc "$OP,\"firstDue\":{\"a\":1}}}]" "texto" "2.1b data objeto recusada"
t svc "$OP,\"firstDue\":[\"2026-10-30\"]}}]" "texto" "2.1c data lista recusada"
t svc "$OP,\"firstDue\":true}}]" "texto" "2.1d data booleana recusada"
t svc "$OP,\"firstDue\":\"2026-02-30\"}}]" "inexistente" "2.1e data inexistente recusada"
t svc "$OP,\"firstDue\":\"30/10/2026\"}}]" "AAAA-MM-DD" "2.1f formato de data errado recusado"
t svc "$OP,\"startYm\":202610}}]" "texto" "2.2 mês numérico recusado"
t svc "$OP,\"startYm\":\"2026-13\"}}]" "inválido" "2.2b mês 13 recusado"
t svc "$OP,\"note\":123}}]" "texto" "2.3 campo de texto com número recusado"
t svc "$OP,\"variable\":\"sim\"}}]" "verdadeiro ou falso" "2.4 booleano como texto recusado"
t svc '[{"op":"create","kind":"debt","data":{"creditor":123}}]' "creditor" "2.5 creditor numérico recusado"
t svc '[{"op":"create","kind":"debt","data":{"creditor":"   "}}]' "creditor" "2.5b creditor só com espaços recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"1","d":"2026-10-01","c":"100","k":"INCOME"}]}}]' "entries" "2.6 extrato com valor em texto recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"1","d":20261001,"c":100,"k":"INCOME"}]}}]' "entries" "2.6b extrato com data numérica recusada"
r=$(svc op-ok000001 '[{"op":"create","kind":"debt","data":{"creditor":"Válida","balanceC":null,"firstDue":"2026-10-30","startYm":"2026-10","variable":false}}]'); echo "$r"|grep -q '"ok": true' && ok "2.7 registro válido (data texto, null, booleano) continua aceito" || ko "2.7 $r"
r=$(svc op-ok000002 '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"1","d":"2026-10-01","c":100,"k":"INCOME","t":"Salário","g":null}]}}]'); echo "$r"|grep -q '"ok": true' && ok "2.7b extrato válido aceito" || ko "2.7b $r"
# updates que esvaziam/estragam campos obrigatórios
DID=$(q "select id||'|'||version from fin_records where data->>'creditor'='Válida'"); did=${DID%|*}; dv=${DID#*|}
t svc "[{\"op\":\"update\",\"id\":\"$did\",\"expected_version\":$(cv $did),\"data\":{\"creditor\":null}}]" "creditor" "2.8 update NÃO remove creditor (null)" 
t svc "[{\"op\":\"update\",\"id\":\"$did\",\"expected_version\":$(cv $did),\"data\":{\"creditor\":\"\"}}]" "creditor" "2.8b update NÃO esvazia creditor"
t svc "[{\"op\":\"update\",\"id\":\"$did\",\"expected_version\":$(cv $did),\"data\":{\"creditor\":42}}]" "creditor" "2.8c update NÃO troca creditor por número"
t svc "[{\"op\":\"update\",\"id\":\"$did\",\"expected_version\":$(cv $did),\"data\":{\"firstDue\":20261030}}]" "texto" "2.9 update NÃO grava data numérica"
CARD=$(q "select id from fin_records where kind='card'")
r=$(svc op-chg00001 "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{\"cardId\":\"$CARD\",\"desc\":\"Mercado\",\"totalC\":5000,\"date\":\"2026-10-20\"}}]"); echo "$r"|grep -q '"ok": true' && ok "2.10 compra válida criada" || ko "2.10 $r"
HID=$(q "select id||'|'||version from fin_records where data->>'desc'='Mercado'"); hid=${HID%|*}; hv=${HID#*|}
for f in date totalC desc cardId; do t svc "[{\"op\":\"update\",\"id\":\"$hid\",\"expected_version\":$(cv $hid),\"data\":{\"$f\":null}}]" "charge exige\|exige\|deve ser" "2.11 update NÃO remove '$f' da compra"; done
t svc "[{\"op\":\"update\",\"id\":\"$hid\",\"expected_version\":$(cv $hid),\"data\":{\"totalC\":0}}]" "diferente de zero" "2.11b update NÃO zera totalC"
t svc "[{\"op\":\"update\",\"id\":\"$hid\",\"expected_version\":$(cv $hid),\"data\":{\"date\":20261020}}]" "texto" "2.11c update NÃO troca date da compra por número"
SID=$(q "select id||'|'||version from fin_records where kind='stmt' and data->>'account'='Conta' order by created_at limit 1"); sid=${SID%|*}; sv=${SID#*|}
t svc "[{\"op\":\"update\",\"id\":\"$sid\",\"expected_version\":$(cv $sid),\"data\":{\"entries\":null}}]" "entries" "2.12 update NÃO remove entries do extrato"
t svc "[{\"op\":\"update\",\"id\":\"$sid\",\"expected_version\":$(cv $sid),\"data\":{\"account\":null}}]" "account" "2.12b update NÃO remove account do extrato"
r=$(svc op-upd-ok01 "[{\"op\":\"update\",\"id\":\"$hid\",\"expected_version\":$(cv $hid),\"data\":{\"desc\":\"Mercado 2\",\"totalC\":5100}}]"); echo "$r"|grep -q '"ok": true' && ok "2.13 update válido continua funcionando" || ko "2.13 $r"
# restauração de registro inválido (legado): cria direto, exclui, tenta restaurar
$P -c "set request.jwt.claim.role='service_role'; insert into fin_records(owner,kind,data,deleted_at) values ('$A','debt','{\"balanceC\":10}',now())" >/dev/null 2>&1
BID=$(q "select id||'|'||version from fin_records where kind='debt' and data->>'creditor' is null"); bid=${BID%|*}; bv=${BID#*|}
t svc "[{\"op\":\"restore\",\"id\":\"$bid\",\"expected_version\":$(cv $bid)}]" "creditor" "2.14 restauração de registro sem creditor recusada"
BID2=$(q "select count(*) from fin_records where id='$bid' and deleted_at is not null"); [ "$BID2" = "1" ] && ok "2.14b registro continua na lixeira (nada alterado)" || ko "2.14b"

# configurações do app guardadas como proposal (existem em produção) continuam editáveis
r=$(svc op-cfg00001 '[{"op":"create","kind":"proposal","data":{"cfg":"sortprefs","prefs":{"a":1}}},{"op":"create","kind":"proposal","data":{"cfg":"cats","rules":[],"over":{},"extra":{}}},{"op":"create","kind":"proposal","data":{"cfg":"capacity","capacityC":1000}}]'); echo "$r"|grep -q '"ok": true' && ok "2.15 proposal sortprefs/cats/capacity (como o app grava) aceitos" || ko "2.15 $(echo "$r"|head -c 250)"
PID=$(q "select id from fin_records where data->>'cfg'='sortprefs' limit 1")
r=$(svc op-cfg00002 "[{\"op\":\"update\",\"id\":\"$PID\",\"expected_version\":$(cv $PID),\"data\":{\"prefs\":{\"b\":2}}}]"); echo "$r"|grep -q '"ok": true' && ok "2.15b update de sortprefs funciona" || ko "2.15b $(echo "$r"|head -c 250)"
t svc "[{\"op\":\"update\",\"id\":\"$PID\",\"expected_version\":$(cv $PID),\"data\":{\"prefs\":null}}]" "proposal exige" "2.15c update NÃO esvazia prefs"
t svc '[{"op":"create","kind":"proposal","data":{"cfg":"outra"}}]' "proposal exige" "2.15d proposal vazio/desconhecido recusado"

echo "--- ACHADO 2 (matriz): campo ausente x null explícito x tipo errado x valor inválido"
CD="\"cardId\":\"$CARD\""
tp svc '[{"op":"create","kind":"bill","data":{"name":"Controle","dueDay":10}}]' "2.20 controle: bill mínima válida aceita"
t svc '[{"op":"create","kind":"bill","data":{"name":"Luz"}}]' "dueDay" "2.21a bill SEM dueDay (ausente) recusada"
t svc '[{"op":"create","kind":"bill","data":{"name":"Luz","dueDay":null}}]' "dueDay" "2.21b bill com dueDay null recusada"
t svc '[{"op":"create","kind":"bill","data":{"name":"Luz","dueDay":"10"}}]' "dia 1..31" "2.21c bill com dueDay texto recusada"
t svc '[{"op":"create","kind":"bill","data":{"name":"Luz","dueDay":0}}]' "1..31" "2.21d bill dueDay 0 recusada"
t svc '[{"op":"create","kind":"bill","data":{"name":"Luz","dueDay":32}}]' "1..31" "2.21e bill dueDay 32 recusada"
t svc '[{"op":"create","kind":"bill","data":{"dueDay":10}}]' "bill exige name" "2.22a bill SEM name recusada"
t svc '[{"op":"create","kind":"bill","data":{"name":null,"dueDay":10}}]' "bill exige name" "2.22b bill name null recusada"
t svc '[{"op":"create","kind":"bill","data":{"name":"   ","dueDay":10}}]' "bill exige name" "2.22c bill name só espaços recusada"
t svc '[{"op":"create","kind":"card","data":{}}]' "card exige name" "2.23a card SEM name recusado"
t svc '[{"op":"create","kind":"card","data":{"name":null}}]' "card exige name" "2.23b card name null recusado"
t svc '[{"op":"create","kind":"card","data":{"name":5}}]' "texto" "2.23c card name numérico recusado"
t svc '[{"op":"create","kind":"card","data":{"name":" \t "}}]' "card exige name" "2.23d card name só espaços recusado"
tp svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"Controle\",\"totalC\":100,\"date\":\"2026-10-01\"}}]" "2.24 controle: charge mínima válida aceita"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"Sem data e valor\"}}]" "charge exige" "2.25a charge SEM date e SEM totalC recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"totalC\":100}}]" "charge exige date" "2.25b charge SEM date recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"date\":\"2026-10-01\"}}]" "charge exige totalC" "2.25c charge SEM totalC recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"totalC\":100,\"date\":\"2026-10-01\"}}]" "charge exige desc" "2.25d charge SEM desc recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{\"desc\":\"x\",\"totalC\":100,\"date\":\"2026-10-01\"}}]" "charge exige cardId" "2.25e charge SEM cardId recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"totalC\":null,\"date\":\"2026-10-01\"}}]" "charge exige totalC" "2.25f charge totalC null recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"totalC\":100,\"date\":null}}]" "charge exige date" "2.25g charge date null recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"   \",\"totalC\":100,\"date\":\"2026-10-01\"}}]" "charge exige desc" "2.25h charge desc só espaços recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"totalC\":\"100\",\"date\":\"2026-10-01\"}}]" "inteiro" "2.25i charge totalC texto recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"totalC\":100,\"date\":\"2026-10-01\",\"n\":0}}]" "parcelas\|nInst\|entre 1" "2.25j charge com n=0 recusada"
t svc "[{\"op\":\"create\",\"kind\":\"charge\",\"data\":{$CD,\"desc\":\"x\",\"totalC\":100,\"date\":\"2026-10-01\",\"n\":121}}]" "parcelas\|entre 1" "2.25k charge com n=121 recusada"
t svc "[{\"op\":\"create\",\"kind\":\"invpay\",\"data\":{$CD}}]" "invpay exige" "2.26a invpay SEM ym recusado"
t svc '[{"op":"create","kind":"invpay","data":{"ym":"2026-10"}}]' "invpay exige" "2.26b invpay SEM cardId recusado"
t svc "[{\"op\":\"create\",\"kind\":\"invpay\",\"data\":{$CD,\"ym\":null}}]" "invpay exige" "2.26c invpay ym null recusado"
t svc '[{"op":"create","kind":"billmonth","data":{"ym":"2026-10"}}]' "billmonth exige" "2.27a billmonth SEM billId recusado"
t svc '[{"op":"create","kind":"billmonth","data":{"billId":"00000000-0000-0000-0000-000000000009"}}]' "billmonth exige" "2.27b billmonth SEM ym recusado"
t svc '[{"op":"create","kind":"debt","data":{}}]' "debt exige creditor" "2.28a debt SEM creditor recusada"
t svc '[{"op":"create","kind":"debt","data":{"creditor":null}}]' "debt exige creditor" "2.28b debt creditor null recusada"
t svc '[{"op":"create","kind":"debt","data":{"creditor":"   "}}]' "debt exige creditor" "2.28c debt creditor só espaços recusada"
tp svc '[{"op":"create","kind":"stmt","data":{"account":"Controle","entries":[]}}]' "2.29 controle: extrato com lista vazia aceito"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta"}}]' "stmt exige entries" "2.30a stmt SEM entries recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":null}}]' "entries" "2.30b stmt entries null recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":"x"}}]' "entries" "2.30c stmt entries texto recusado"
t svc '[{"op":"create","kind":"stmt","data":{"entries":[]}}]' "stmt exige account" "2.30d stmt SEM account recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"  ","entries":[]}}]' "stmt exige account" "2.30e stmt account só espaços recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"x"}]}}]' "entries\[1\]" "2.31a item de extrato só com i recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"x","c":100,"k":"INCOME"}]}}]' "entries\[1\]: d" "2.31b item SEM d recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"x","d":"2026-10-01","k":"INCOME"}]}}]' "entries\[1\]: c" "2.31c item SEM c recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"x","d":"2026-10-01","c":100}]}}]' "entries\[1\]: k" "2.31d item SEM k recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"d":"2026-10-01","c":100,"k":"INCOME"}]}}]' "entries\[1\]: i" "2.31e item SEM i recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"  ","d":"2026-10-01","c":100,"k":"INCOME"}]}}]' "entries\[1\]: i" "2.31f item com i só espaços recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"x","d":"2026-10-01","c":100,"k":"OUTRO"}]}}]' "entries\[1\]: k" "2.31g item com k inválido recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"x","d":"2026-10-01","c":10.5,"k":"INCOME"}]}}]' "entries\[1\]: c" "2.31h item com c fracionado recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":["texto"]}}]' "entries\[1\]" "2.31i item que não é objeto recusado"
t svc '[{"op":"create","kind":"stmt","data":{"account":"Conta","entries":[{"i":"a","d":"2026-10-01","c":1,"k":"INCOME"},{"i":"b","d":"2026-10-02","c":2}]}}]' "entries\[2\]: k" "2.31j erro no 2º item é apontado e nada é gravado"
t svc '[{"op":"create","kind":"proposal","data":{}}]' "proposal exige" "2.32a proposal vazia recusada"
t svc '[{"op":"create","kind":"proposal","data":{"text":"   "}}]' "proposal exige" "2.32b proposal com text só espaços recusada"

echo "--- ACHADO 2 (registro completo): registro antigo inválido NÃO é corrigido em silêncio; update e restore devolvem o problema"
LEG="set request.jwt.claim.role='service_role'"
$P -c "$LEG; insert into fin_records(owner,kind,data) values ('$A','debt','{\"creditor\":\"VelhoData\",\"firstDue\":20261030,\"balanceC\":100}')" >/dev/null 2>&1
$P -c "$LEG; insert into fin_records(owner,kind,data) values ('$A','bill','{\"name\":\"VelhaConta\"}')" >/dev/null 2>&1
$P -c "$LEG; insert into fin_records(owner,kind,data,deleted_at) values ('$A','debt','{\"creditor\":\"VelhoLixo\",\"dir\":\"TALVEZ\"}',now())" >/dev/null 2>&1
$P -c "$LEG; insert into fin_records(owner,kind,data,deleted_at) values ('$A','charge','{\"cardId\":\"$CARD\",\"desc\":\"Velha compra\",\"totalC\":100}',now())" >/dev/null 2>&1
V1=$(q "select id from fin_records where data->>'creditor'='VelhoData'"); V2=$(q "select id from fin_records where data->>'name'='VelhaConta'")
V3=$(q "select id from fin_records where data->>'creditor'='VelhoLixo'"); V4=$(q "select id from fin_records where data->>'desc'='Velha compra'")
[ -n "$V1" ] && [ -n "$V2" ] && [ -n "$V3" ] && [ -n "$V4" ] && ok "2.40 base de teste com 4 registros antigos inválidos criada" || ko "2.40 não criou os registros antigos"
t svc "[{\"op\":\"update\",\"id\":\"$V1\",\"expected_version\":$(cv $V1),\"data\":{\"balanceC\":200}}]" "texto" "2.41 update de campo válido em registro com data numérica antiga: recusado (não corrige em silêncio)"
t svc "[{\"op\":\"update\",\"id\":\"$V2\",\"expected_version\":$(cv $V2)}]" "update exige data" "2.42a update sem data recusado"
t svc "[{\"op\":\"update\",\"id\":\"$V2\",\"expected_version\":$(cv $V2),\"data\":{\"name\":\"VelhaConta 2\"}}]" "dueDay" "2.42b update de bill antiga sem dueDay: recusado, problema devolvido"
t svc "[{\"op\":\"restore\",\"id\":\"$V3\",\"expected_version\":$(cv $V3)}]" "PAGAR ou RECEBER" "2.43 restore de dívida antiga com dir inválido: recusado"
t svc "[{\"op\":\"restore\",\"id\":\"$V4\",\"expected_version\":$(cv $V4)}]" "charge exige date" "2.44 restore de compra antiga sem date: recusado"
tp svc "[{\"op\":\"update\",\"id\":\"$V1\",\"expected_version\":$(cv $V1),\"data\":{\"firstDue\":\"2026-10-30\"}}]" "2.45 update que CONSERTA o campo inválido é aceito (o usuário trata o problema)"
echo "--- ACHADO 3: ausência de login não é administrador"
t anon '[{"op":"create","kind":"debt","data":{"creditor":"Anon"}}]' "identidade de serviço" "3.1 fin_apply sem login e sem papel de serviço recusado" 
n=$(q "select count(*) from fin_records where data->>'creditor'='Anon'"); [ "$n" = "0" ] && ok "3.1b nada gravado" || ko "3.1b n=$n"
r=$($P -c "insert into fin_records(owner,kind,data) values ('$A','debt','{\"creditor\":\"Direto\"}')" 2>&1); echo "$r"|grep -qi 'recusad' && ok "3.2 escrita direta sem identidade recusada mesmo com legado ligado" || ko "3.2 $(echo "$r"|head -c 200)"
r=$($P -c "update fin_records set data=data||'{\"x\":1}' where kind='card'" 2>&1); echo "$r"|grep -qi 'recusad' && ok "3.2b update direto sem identidade recusado" || ko "3.2b $(echo "$r"|head -c 200)"
r=$($P -c "delete from fin_records where kind='card'" 2>&1); echo "$r"|grep -qi 'recusad' && ok "3.2c delete direto sem identidade recusado" || ko "3.2c $(echo "$r"|head -c 200)"
r=$($P -c "select fin_op_result('op-rec00001','gpt')" 2>&1); echo "$r"|grep -qi 'identidade de serviço' && ok "3.3 fin_op_result sem identidade recusado" || ko "3.3 $(echo "$r"|head -c 200)"
r=$(svc op-svc00001 '[{"op":"create","kind":"debt","data":{"creditor":"Serviço"}}]'); echo "$r"|grep -q '"ok": true' && ok "3.4 serviço com papel service_role + legado vigente grava" || ko "3.4 $r"
a=$(q "select actor from fin_records_hist where op_id is not null order by hid desc limit 1")
SID2=$(q "select id||'|'||version from fin_records where data->>'creditor'='Serviço'"); s2=${SID2%|*}; v2=${SID2#*|}
svc op-svc00002 "[{\"op\":\"update\",\"id\":\"$s2\",\"expected_version\":$v2,\"data\":{\"balanceC\":1}}]" >/dev/null
a=$(q "select actor from fin_records_hist where id='$s2' order by hid desc limit 1")
echo "$a"|grep -q '^servico:' && ok "3.5 histórico identifica o serviço ($a)" || ko "3.5 ator='$a' (esperado servico:<papel>)"
r=$($P -c "set request.jwt.claim.role='service_role'; insert into fin_records(owner,kind,data) values ('$A','debt','{\"creditor\":\"DiretoSvc\"}')" 2>&1); echo "$r"|grep -qi 'recusad' && ko "3.6 serviço comprovado bloqueado na escrita direta com legado vigente" || ok "3.6 serviço comprovado + legado vigente: escrita direta permitida (compatibilidade)"
legado nao "$(date -u -d '+1 day' '+%Y-%m-%d %H:%M:%S+00')"
t svc '[{"op":"create","kind":"debt","data":{"creditor":"Z"}}]' "não autorizada" "3.7 serviço com legado DESLIGADO recusado"
legado sim "$(date -u -d '-1 hour' '+%Y-%m-%d %H:%M:%S+00')"
t svc '[{"op":"create","kind":"debt","data":{"creditor":"Z"}}]' "não autorizada" "3.8 serviço com prazo do legado VENCIDO recusado"
legado sim ""
t svc '[{"op":"create","kind":"debt","data":{"creditor":"Z"}}]' "não autorizada" "3.9 legado ligado SEM prazo recusado"
r=$($P -c "set request.jwt.claim.role='service_role'; insert into fin_records(owner,kind,data) values ('$A','debt','{\"creditor\":\"Z\"}')" 2>&1); echo "$r"|grep -qi 'recusad' && ok "3.9b escrita direta com legado vencido/sem prazo recusada" || ko "3.9b"
legado nao ""
r=$(as $G op-act00001 gpt '[{"op":"create","kind":"debt","data":{"creditor":"Ator vivo"}}]'); echo "$r"|grep -q '"ok": true' && ok "3.10 credencial do canal funciona com legado desligado" || ko "3.10 $r"
r=$(as $A op-usr00001 fin '[{"op":"create","kind":"debt","data":{"creditor":"Usuário vivo"}}]'); echo "$r"|grep -q '"ok": true' && ok "3.11 login comum funciona com legado desligado" || ko "3.11 $r"
r=$($P -c "set request.jwt.claim.sub='$A'; set request.jwt.claim.role='authenticated'; select fin_apply('op-usr00002','gpt','[]'::jsonb)" 2>&1); echo "$r"|grep -qi 'login comum' && ok "3.12 papel 'authenticated' não vira serviço" || ko "3.12 $r"
legado sim "$(date -u -d '+1 day' '+%Y-%m-%d %H:%M:%S+00')"

echo "--- ACHADO 4: reversões atômicas e sem apagar evidência"
sc(){ $PQ -d "$1" -q -t -A -c "$2" 2>&1; }
clone(){ $PQ -d postgres -q -c "drop database if exists $1" -c "create database $1 template t" >/dev/null 2>&1; }
cnt4(){ sc "$1" "select (select count(*) from fin_records)||'/'||(select count(*) from fin_records_hist)||'/'||(select count(*) from fin_ops_log)||'/'||(select count(*) from fin_capture_items)"; }
if [ "$MODE" = v24 -o "$MODE" = v25 ]; then RBP=$R/fin/sql/fin_apply_v2_4_rollback_preservando.sql; RBT=$R/fin/sql/fin_apply_v2_4_rollback_remover_tudo.sql
else RBP=$R/fin/sql/fin_apply_v2_3_rollback.sql; RBT=""; fi
# 4.1 falha no meio (view dependente de fin_op_result) rodando SEM parar no erro: nada pode ficar pela metade
clone t41; sc t41 "create view zz_dep as select public.fin_op_result('a','gpt','gpt') as r" >/dev/null
antes=$(sc t41 "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace")
tr_antes=$(sc t41 "select count(*) from pg_trigger where tgrelid='public.fin_records'::regclass and not tgisinternal")
$PQ -d t41 -q -f $RBP >/dev/null 2>&1
depois=$(sc t41 "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace")
tr_depois=$(sc t41 "select count(*) from pg_trigger where tgrelid='public.fin_records'::regclass and not tgisinternal")
[ "$antes" = "$depois" ] && [ "$tr_antes" = "$tr_depois" ] && ok "4.1 erro no meio da reversão desfaz TUDO (funções $antes=$depois, triggers $tr_antes=$tr_depois)" || ko "4.1 reversão parcial: funções $antes->$depois, triggers $tr_antes->$tr_depois"
# 4.2 reversão que preserva: evidências e dados intactos, trava e funções removidas
clone t42; e0=$(cnt4 t42)
$PQ -d t42 -q -v ON_ERROR_STOP=1 -f $RBP >/dev/null 2>&1; rc=$?
e1=$(cnt4 t42); fn=$(sc t42 "select count(*) from pg_proc where proname in ('fin_apply','fin_op_result') and pronamespace='public'::regnamespace"); tg=$(sc t42 "select count(*) from pg_trigger where tgname in ('fin_escrita_t','fin_hist_trg')")
[ "$rc" = 0 ] && [ "$e0" = "$e1" ] && [ "$fn" = 0 ] && [ "$tg" = 0 ] && ok "4.2 reversão preservando: dados/evidências idênticos ($e0), funções e triggers removidos" || ko "4.2 rc=$rc antes=$e0 depois=$e1 funções=$fn triggers=$tg"
[ "$(echo "$e0"|cut -d/ -f2)" -gt 0 ] && [ "$(echo "$e0"|cut -d/ -f3)" -gt 0 ] && ok "4.2b a base de teste tinha evidências (hist/recibos: $e0)" || ko "4.2b base sem evidências, teste fraco"
# 4.3 remover tudo com evidência existente: aborta e não remove nada
if [ -n "$RBT" ]; then
  clone t43; f0=$(sc t43 "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace"); e0=$(cnt4 t43)
  out=$($PQ -d t43 -q -v ON_ERROR_STOP=1 -f $RBT 2>&1); rc=$?
  f1=$(sc t43 "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace"); e1=$(cnt4 t43)
  tb=$(sc t43 "select count(*) from pg_tables where tablename in ('fin_ops_log','fin_records_hist','fin_capture_items','fin_atores')")
  [ "$rc" != 0 ] && echo "$out"|grep -q 'linhas de evidência' && [ "$f0" = "$f1" ] && [ "$e0" = "$e1" ] && [ "$tb" = 4 ] && ok "4.3 remover tudo COM evidência: aborta, nada removido (funções $f0=$f1, dados $e0)" || ko "4.3 rc=$rc f=$f0/$f1 e=$e0/$e1 tb=$tb"
  # 4.3b mesmo sem ON_ERROR_STOP (editor SQL que segue após erro): continua atômico
  clone t43b; $PQ -d t43b -q -f $RBT >/dev/null 2>&1
  f2=$(sc t43b "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace"); [ "$f0" = "$f2" ] && ok "4.3b idem sem ON_ERROR_STOP" || ko "4.3b $f0->$f2"
  # 4.4 base limpa (sem evidência): remove tudo, fin_records e seus dados permanecem
  $PQ -d postgres -q -c "drop database if exists t44" -c "create database t44" >/dev/null
  $PQ -d t44 -q -v ON_ERROR_STOP=1 -f $R/tests/fin_apply/setup.sql >/dev/null 2>&1; $PQ -d t44 -q -f $R/tests/fin_apply/stub_auth_role.sql >/dev/null 2>&1
  $PQ -d t44 -q -v ON_ERROR_STOP=1 -f $R/fin/sql/fin_apply_v2_3.sql >/dev/null 2>&1; $PQ -d t44 -q -1 -v ON_ERROR_STOP=1 -f $R/fin/sql/fin_apply_v2_4.sql >/dev/null 2>&1
  r0=$(sc t44 "select count(*) from fin_records")
  $PQ -d t44 -q -v ON_ERROR_STOP=1 -f $RBT >/dev/null 2>&1; rc=$?
  r1=$(sc t44 "select count(*) from fin_records"); f3=$(sc t44 "select count(*) from pg_proc where proname like 'fin_%' and proname<>'fin_guard' and pronamespace='public'::regnamespace"); tb=$(sc t44 "select count(*) from pg_tables where tablename in ('fin_ops_log','fin_records_hist','fin_capture_items','fin_atores','fin_config','fin_canal_dono')")
  [ "$rc" = 0 ] && [ "$r0" = "$r1" ] && [ "$f3" = 0 ] && [ "$tb" = 0 ] && ok "4.4 base sem evidência: remove tudo e preserva fin_records ($r0 linhas)" || ko "4.4 rc=$rc rec=$r0/$r1 fn=$f3 tb=$tb"
fi
# 4.5 trava ocupada por outra sessão: falha em ~15s e não deixa nada pela metade
clone t45; f0=$(sc t45 "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace")
( $PQ -d t45 -q -c "begin; lock table fin_ops_log in access share mode; select pg_sleep(22); commit" >/dev/null 2>&1 ) & sleep 2
ini=$(date +%s); out=$($PQ -d t45 -q -v ON_ERROR_STOP=1 -f $RBP 2>&1); rc=$?; fim=$(date +%s); wait
f1=$(sc t45 "select count(*) from pg_proc where proname like 'fin_%' and pronamespace='public'::regnamespace")
if [ "$MODE" = v24 -o "$MODE" = v25 ]; then
  [ "$rc" != 0 ] && echo "$out"|grep -qi 'lock timeout\|tempo limite\|canceling statement' && [ "$f0" = "$f1" ] && [ $((fim-ini)) -le 20 ] && ok "4.5 trava ocupada: reversão desiste em $((fim-ini))s sem alterar nada" || ko "4.5 rc=$rc t=$((fim-ini))s f=$f0/$f1 :: $(echo "$out"|head -c 200)"
else
  [ "$f0" = "$f1" ] && ok "4.5 (v2.3) funções intactas" || ko "4.5 v2.3 reversão não tem limite de espera nem atomicidade: esperou $((fim-ini))s e funções $f0->$f1"
fi
# 5 (v2.5) conflito de versão NÃO pode usar 40001 (o PostgREST repete essas transações em laço); precisa ser PT409 (HTTP 409)
if [ "$MODE" = v25 ]; then
  echo "--- v2.5: código do conflito de versão"
  RID=$(q "select id from fin_records where owner='$A' and deleted_at is null limit 1"); VV=$(cv $RID)
  sc=$($P -c "set request.jwt.claim.role='service_role'; do \$\$ begin perform fin_apply('op-v25-c1','gpt','[{\"op\":\"update\",\"id\":\"$RID\",\"expected_version\":$((VV+7)),\"data\":{\"balanceC\":1}}]'::jsonb); exception when others then raise notice 'SQLSTATE=%', sqlstate; end \$\$" 2>&1)
  echo "$sc"|grep -q 'SQLSTATE=PT409' && ok "5.1 conflito de versão = PT409 (HTTP 409 no PostgREST, sem repetição)" || ko "5.1 $sc"
  echo "$sc"|grep -q 'SQLSTATE=40001' && ko "5.2 ainda usa 40001" || ok "5.2 não usa 40001"
  [ "$(cv $RID)" = "$VV" ] && ok "5.3 registro inalterado após conflito" || ko "5.3 versão mudou"
fi
echo FIM; [ -z "$FAIL" ] && echo TODOS_PASSARAM
