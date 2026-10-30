#!/usr/bin/env bash
# Verifica que el esquema y la migración se ejecutan en un Postgres 16 local.
# Simula lo mínimo de Supabase (esquemas auth y extensions, roles anon y authenticated).
# Uso: supabase/verificar.sh   (requiere binarios de PostgreSQL 16)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
TMP="$(mktemp -d)"
chmod 777 "$TMP"
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
cleanup() { run "$PGBIN/pg_ctl -D $TMP/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
run "$PGBIN/initdb -D $TMP/data -A trust -U postgres" >/dev/null
run "$PGBIN/pg_ctl -D $TMP/data -o '-k $TMP -p 54329 -c listen_addresses=' -l $TMP/log start -w" >/dev/null
PSQL="psql -h $TMP -p 54329 -U postgres -v ON_ERROR_STOP=1 -q -X"
$PSQL <<'SQL'
create schema extensions;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create role anon; create role authenticated;
SQL
$PSQL -f "$DIR/schema_partibilidad.sql"
$PSQL -f "$DIR/migracion_web_seo.sql"
$PSQL -t -A <<'SQL'
-- Datos mínimos para probar la búsqueda
insert into auth.users values ('00000000-0000-0000-0000-000000000001');
insert into principios_activos (dci) values ('Losartán'), ('Hidroclorotiazida');
insert into medicamentos (nombre_comercial, forma_farmaceutica, veredicto, criterio_id, estado, revisado_por, revisado_en)
  select 'Losarvit 50', 'comprimido', 'se_puede_partir', id, 'publicado', '00000000-0000-0000-0000-000000000001', now()
  from criterios_particion where codigo = 'RANURA-LI';
insert into medicamento_principios select m.id, p.id, 50, 'mg' from medicamentos m, principios_activos p where p.dci = 'Losartán';
select 'criterios=' || count(*) from criterios_particion;
select 'por_veredicto=' || string_agg(veredicto_asociado || ':' || n, ',' order by veredicto_asociado) from (select veredicto_asociado, count(*) n from criterios_particion group by 1) t;
select 'buscar=' || slug || '|' || principios::text || '|' || veredicto from buscar_medicamentos('losartan');
select 'dci=' || slug || '|' || n_se_puede || '|' || n_no_debe || '|' || n_no_puede from v_dci_publicas;
SQL
