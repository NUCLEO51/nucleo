#!/usr/bin/env bash
# Uso: bash tests/fin_apply/run_v2_4_all.sh baseline   -> v2.3 (esperado: falhas nos achados 1-3)
#      bash tests/fin_apply/run_v2_4_all.sh v25       -> v2.3 + v2.5 (esperado: tudo passa + conflito = PT409)
#      bash tests/fin_apply/run_v2_4_all.sh v24        -> v2.3 + v2.4 (esperado: tudo passa)
# PostgreSQL 16 local de ENSAIO (stubs de auth/roles). NÃO é o Supabase real.
set -e
D=$(dirname "$0"); R=$D/../..
export PGHOST=${PGHOST:-/tmp/pgt} PGPORT=${PGPORT:-5544} PGUSER=${PGUSER:-pgtest} PGDB=t
P="psql -q -v ON_ERROR_STOP=1"
$P -d postgres -c "drop database if exists t" -c "create database t"
$P -d t -f $D/setup.sql; $P -d t -f $D/stub_auth_role.sql; $P -d t -f $R/fin/sql/fin_apply_v2_3.sql
[ "$1" = v24 ] && $P -d t -1 -f $R/fin/sql/fin_apply_v2_4.sql
[ "$1" = v25 ] && $P -d t -1 -f $R/fin/sql/fin_apply_v2_5.sql
MODE=$1 bash $D/run_v2_4.sh
