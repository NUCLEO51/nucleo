#!/usr/bin/env bash
# Reversão sob concorrência (Postgres de ENSAIO). Prova: a verificação "tabelas vazias" e a remoção não têm corrida com gravações.
export PGHOST=${PGHOST:-/tmp/pgt} PGPORT=${PGPORT:-5544} PGUSER=${PGUSER:-pgtest}
R=$(cd "$(dirname "$0")/../.." && pwd); S=$R/fin/sql; T=$R/tests/fin_apply; FAIL=0
ok(){ echo "PASS  $1"; }; ko(){ echo "FALHA $1"; FAIL=1; }
novo(){ psql -q -d postgres -c "drop database if exists $1" -c "create database $1" >/dev/null; psql -q -d $1 -f $T/setup.sql >/dev/null 2>&1; psql -q -d $1 -f $S/fin_apply_v2_2.sql >/dev/null 2>&1
  psql -q -d $1 -c "update fin_config set valor='sim' where chave='admin_canal_legado'; update fin_config set valor=(now()+interval '1 day')::text where chave='admin_canal_legado_ate'" >/dev/null; }
tem(){ psql -q -t -A -d $1 -c "select to_regclass('public.fin_ops_log') is not null"; }
n(){ psql -q -t -A -d $1 -c "select count(*) from fin_ops_log"; }
OPS='[{"op":"create","kind":"debt","data":{"creditor":"Corrida","balanceC":1}}]'

# C1: gravação em curso (transação aberta) enquanto o remover_tudo é disparado -> deve esperar, ver a evidência e ABORTAR
novo rc1
( psql -q -d rc1 -c "begin; select fin_apply('op-corrida-1','gpt','$OPS'::jsonb); select pg_sleep(4); commit;" >/dev/null 2>&1 ) &
sleep 1
out=$(psql -q -d rc1 -v ON_ERROR_STOP=1 -f $S/fin_apply_v2_2_rollback_remover_tudo.sql 2>&1); wait
echo "$out" | grep -q "Nada foi removido" && [ "$(tem rc1)" = "t" ] && [ "$(n rc1)" = "1" ] && ok "R1 gravação em curso: remover_tudo espera, vê a evidência e ABORTA (tabelas e recibo preservados)" || ko "R1 $(echo $out|head -c 300) tem=$(tem rc1) n=$(n rc1)"
# C2: banco virgem, sem corrida -> remove
novo rc2; psql -q -d rc2 -v ON_ERROR_STOP=1 -f $S/fin_apply_v2_2_rollback_remover_tudo.sql >/dev/null 2>&1
[ "$(psql -q -t -A -d rc2 -c "select to_regclass('public.fin_ops_log') is null")" = "t" ] && ok "R2 sem evidências: remover_tudo remove tudo" || ko "R2"
# C3: remover_tudo em curso (segurando travas) enquanto chega uma gravação -> a gravação espera e depois falha com segurança, sem registro órfão
novo rc3
( psql -q -d rc3 -v ON_ERROR_STOP=1 -c "begin; lock table public.fin_records, public.fin_records_hist, public.fin_ops_log, public.fin_capture_items in access exclusive mode; select pg_sleep(3); drop trigger fin_hist_trg on public.fin_records; drop view fin_legado_uso; drop function fin_apply(text,text,jsonb); drop table fin_capture_items, fin_ops_log, fin_atores, fin_config, fin_canal_dono, fin_records_hist; commit;" >/dev/null 2>&1 ) &
sleep 1
w=$(psql -q -d rc3 -c "select fin_apply('op-corrida-3','gpt','$OPS'::jsonb)" 2>&1); wait
echo "$w" | grep -q "ERROR" && ! echo "$w" | grep -q '"ok": true' && [ "$(psql -q -t -A -d rc3 -c "select count(*) from fin_records where data->>'creditor'='Corrida'")" = "0" ] && ok "R3 remoção em curso: gravação concorrente falha com segurança e não deixa registro órfão" || ko "R3 $(echo $w|head -c 300)"
# C4: preservando com evidências -> mantém tabelas e linhas
novo rc4; psql -q -d rc4 -c "select fin_apply('op-corrida-4','gpt','$OPS'::jsonb)" >/dev/null 2>&1
psql -q -d rc4 -v ON_ERROR_STOP=1 -f $S/fin_apply_v2_2_rollback_preservando.sql >/dev/null 2>&1
[ "$(n rc4)" = "1" ] && [ "$(psql -q -t -A -d rc4 -c "select count(*) from pg_proc where proname in ('fin_apply','fin_hist')")" = "0" ] && ok "R4 preservando: funções saem, recibos e histórico ficam" || ko "R4"
# C5: timeout de trava: se há transação segurando fin_records, a reversão falha (não trava a produção) e nada é removido
novo rc5
( psql -q -d rc5 -c "begin; update fin_records set data=data where kind='card'; select pg_sleep(20); rollback;" >/dev/null 2>&1 ) &
sleep 1; t0=$(date +%s)
out=$(psql -q -d rc5 -v ON_ERROR_STOP=1 -f $S/fin_apply_v2_2_rollback_remover_tudo.sql 2>&1); t1=$(date +%s)
echo "$out" | grep -qi "lock timeout\|tempo limite\|canceling statement" && [ "$(tem rc5)" = "t" ] && ok "R5 trava ocupada: reversão desiste após ~15s ($((t1-t0))s) sem remover nada" || ko "R5 $(echo $out|head -c 200)"
kill %1 2>/dev/null; wait 2>/dev/null
[ $FAIL = 0 ] && echo REVERSAO_TODOS_PASSARAM || echo REVERSAO_COM_FALHAS
