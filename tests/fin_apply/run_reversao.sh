#!/usr/bin/env bash
# Testa as duas reversões (rode DEPOIS de run_all.sh, com o banco t populado). Postgres de ensaio.
export PGHOST=${PGHOST:-/tmp/pgt} PGPORT=${PGPORT:-5544} PGUSER=${PGUSER:-pgtest}; Q="psql -q -d t -t -A"; D=$(dirname "$0")/../../fin/sql
echo "1) remover_tudo COM evidências deve ABORTAR:"; $Q -v ON_ERROR_STOP=1 -f $D/fin_apply_v2_1_rollback_remover_tudo.sql 2>&1 | grep -E "ERROR|Há"
echo "2) preservando: funções somem, tabelas e linhas ficam:"; $Q -f $D/fin_apply_v2_1_rollback_preservando.sql 2>&1 | grep -v NOTICE
$Q -c "select 'hist='||(select count(*) from fin_records_hist)||' recibos='||(select count(*) from fin_ops_log)||' vinculos='||(select count(*) from fin_capture_items)||' registros='||(select count(*) from fin_records)||' funcoes='||(select count(*) from pg_proc where proname in ('fin_apply','fin_op_result','fin_resolve','fin_validate','fin_check_refs','fin_hist'))"
