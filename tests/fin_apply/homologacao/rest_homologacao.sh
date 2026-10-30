#!/usr/bin/env bash
# HOMOLOGAÇÃO da fin_apply v2.2 num projeto Supabase de TESTE (NÃO produção). STATUS: PREPARADO, NUNCA EXECUTADO.
# Requer: projeto de homologação com fin_records + fin_apply_v2_2.sql aplicado, 2 contas reais de teste (e-mail/senha) criadas em Auth.
# Variáveis (exporte no terminal; NUNCA grave em arquivo do repositório, Drive ou chat):
#   SUPABASE_URL  SUPABASE_ANON_KEY  U1_EMAIL U1_PASS  U2_EMAIL U2_PASS
set -u
PROD_REF="cptvxfzgimeawheqrhvz"
case "${SUPABASE_URL:-}" in *"$PROD_REF"*) echo "RECUSADO: esta URL é a de PRODUÇÃO. Use um projeto de homologação."; exit 2;; "") echo "Defina SUPABASE_URL"; exit 2;; esac
FAIL=0; ok(){ echo "PASS  $1"; }; ko(){ echo "FALHA $1"; FAIL=1; }
H=(-H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json")
login(){ curl -s "${H[@]}" "$SUPABASE_URL/auth/v1/token?grant_type=password" -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))'; }
rpc(){ curl -s "${H[@]}" -H "Authorization: Bearer $1" "$SUPABASE_URL/rest/v1/rpc/$2" -d "$3"; }
T1=$(login "$U1_EMAIL" "$U1_PASS"); T2=$(login "$U2_EMAIL" "$U2_PASS")
[ -n "$T1" ] && [ -n "$T2" ] && ok "H0 autenticação das duas contas reais" || { ko "H0 login falhou"; exit 1; }
RUN=$(date +%s); OPS="[{\"op\":\"create\",\"kind\":\"debt\",\"data\":{\"creditor\":\"HOM-$RUN\",\"balanceC\":100,\"dir\":\"PAGAR\"}}]"
call(){ rpc "$1" fin_apply "{\"p_op_id\":\"$2\",\"p_source\":\"${4:-fin}\",\"p_ops\":$3}"; }
r=$(rpc "$SUPABASE_ANON_KEY" fin_apply "{\"p_op_id\":\"hom-anon-$RUN\",\"p_source\":\"fin\",\"p_ops\":$OPS}"); echo "$r" | grep -qi "permission denied\|not authorized\|42501\|JWT" && ok "H1 visitante anônimo não executa" || ko "H1 $r"
r=$(call "$T1" "hom-c-$RUN" "$OPS"); ID=$(echo "$r" | python3 -c 'import sys,json; print(json.load(sys.stdin)["resultados"][0]["registro"]["id"])' 2>/dev/null); [ -n "$ID" ] && ok "H2 conta 1 grava (persistido, commit real)" || ko "H2 $r"
r=$(call "$T1" "hom-c-$RUN" "$OPS"); echo "$r" | grep -q '"repetida": *true' && ok "H3 mesmo pedido repetido não duplica" || ko "H3 $r"
r=$(call "$T2" "hom-u-$RUN" "[{\"op\":\"update\",\"id\":\"$ID\",\"expected_version\":1,\"data\":{\"balanceC\":1}}]"); echo "$r" | grep -qi "não encontrado" && ok "H4 conta 2 NÃO alcança registro da conta 1" || ko "H4 $r"
r=$(rpc "$T2" fin_op_result "{\"p_op_id\":\"hom-c-$RUN\",\"p_source\":\"fin\"}"); [ "$r" = "null" ] && ok "H5 conta 2 NÃO lê recibo da conta 1 mesmo sabendo o op_id" || ko "H5 $r"
for i in 1 2 3 4 5 6; do call "$T1" "hom-par-$RUN" "$OPS" >/dev/null & done; wait
n=$(curl -s "${H[@]}" -H "Authorization: Bearer $T1" "$SUPABASE_URL/rest/v1/fin_records?select=id&data-%3E%3Ecreditor=eq.HOM-$RUN" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')
[ "$n" = "2" ] && ok "H6 6 chamadas simultâneas com o mesmo op_id = 1 registro (+1 do H2)" || ko "H6 registros=$n (esperado 2)"
r=$(rpc "$T1" fin_op_result "{\"p_op_id\":\"hom-c-$RUN\",\"p_source\":\"fin\"}"); echo "$r" | grep -q "$ID" && ok "H7 recibo recuperável depois (resposta perdida não obriga repetir)" || ko "H7 $r"
r=$(call "$T1" "hom-c-$RUN" '[{"op":"create","kind":"debt","data":{"creditor":"DIFERENTE"}}]'); echo "$r" | grep -qi "conflito" && ok "H8 mesmo op_id com conteúdo diferente = conflito" || ko "H8 $r"
r=$(call "$T1" "hom-g-$RUN" "$OPS" gpt); echo "$r" | grep -qi "login comum" && ok "H9 login comum não se passa por canal gpt" || ko "H9 $r"
echo "LIMPEZA: mova os registros HOM-$RUN para a lixeira (op delete) no projeto de homologação. Nada disto roda em produção."
[ $FAIL = 0 ] && echo HOMOLOGACAO_TODOS_PASSARAM || echo HOMOLOGACAO_COM_FALHAS
