#!/usr/bin/env bash
# Uso: bash tests/fin_apply/run_all.sh fin/sql/fin_apply_v2_1.sql tests/fin_apply/run_v2_1.sh
# Requer PostgreSQL 16 local de ENSAIO (stubs de auth/roles). NÃO é o Supabase real.
set -e
export PGHOST=${PGHOST:-/tmp/pgt} PGPORT=${PGPORT:-5544} PGUSER=${PGUSER:-pgtest} PGDB=t
P="psql -q -v ON_ERROR_STOP=1"
$P -d postgres -c "drop database if exists t" -c "create database t"
$P -d t -f "$(dirname "$0")/setup.sql"; $P -d t -f "$1"
bash "$2"
