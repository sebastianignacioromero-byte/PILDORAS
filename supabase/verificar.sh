#!/usr/bin/env bash
# Verifica que el esquema y la migración se ejecutan en un Postgres 16 local.
# Simula lo mínimo de Supabase (esquemas auth y extensions, roles anon y authenticated).
# Uso: supabase/verificar.sh [carga.sql]   (requiere binarios de PostgreSQL 16)
# Con carga.sql, además la ejecuta dos veces como el revisor qf@ejemplo.cl y cuenta las fichas.
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
-- El usuario "conectado" se simula con: set test.uid = '<uuid>';
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
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

# La migración de criterios debe poder aplicarse sobre una base ya instalada, y repetirse.
$PSQL -f "$DIR/migracion_criterios.sql"
$PSQL -f "$DIR/migracion_criterios.sql"
$PSQL -t -A <<'SQL'
select 'criterios_v2=' || count(*) || ' sin_textos=' || count(*) filter (where explicacion = '' or que_hacer = '' or como_reconocer = '') from criterios_particion;
select 'ficha_v2=' || slug || '|' || (criterio_explicacion <> '') || '|' || (criterio_que_hacer <> '') from v_fichas_publicas;
SQL

# Panel de administración: guardar_ficha solo para admin, todo o nada.
$PSQL -f "$DIR/migracion_carga.sql"
$PSQL -f "$DIR/migracion_panel.sql"
$PSQL -f "$DIR/migracion_panel.sql"
$PSQL -t -A <<'SQL'
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into perfiles (id, rol) values ('00000000-0000-0000-0000-00000000000a', 'admin'), ('00000000-0000-0000-0000-00000000000b', 'usuario') on conflict (id) do update set rol = excluded.rol;
set test.uid = '00000000-0000-0000-0000-00000000000a';
select guardar_ficha(jsonb_build_object(
  'id', (select id from medicamentos where slug = 'losarvit-50-1'),
  'nombre_comercial', 'Losarvit 50', 'laboratorio', 'Lab Andino',
  'forma_farmaceutica', 'comprimido', 'liberacion', 'inmediata',
  'forma_geometrica', 'cuadrada', 'ranura', 'doble_cruz', 'ranura_orientacion', 0,
  'criterio', 'RANURA-LI', 'estado', 'publicado', 'nota', 'Parta por la ranura',
  'principios', jsonb_build_array(jsonb_build_object('dci', 'Losartán', 'cantidad', 50, 'unidad', 'mg'),
                                  jsonb_build_object('dci', 'Nuevo principio', 'cantidad', null, 'unidad', 'mg'))));
select 'panel_guardado=' || forma_geometrica || '|' || ranura || '|' || laboratorio || '|' || forma_revisada || '|' || editada_en_panel || '|' || (revisado_por = '00000000-0000-0000-0000-00000000000a')
  from medicamentos where slug = 'losarvit-50-1';
select 'panel_principios=' || string_agg(pa.dci || ':' || coalesce(mp.cantidad::text, '-'), ',' order by pa.dci)
  from medicamento_principios mp join principios_activos pa on pa.id = mp.principio_activo_id
  join medicamentos m on m.id = mp.medicamento_id where m.slug = 'losarvit-50-1';
select 'panel_lista=' || count(*) from v_admin_fichas;
SQL
# Un usuario sin rol admin es rechazado.
$PSQL -t -A -v ON_ERROR_STOP=0 <<'SQL' 2>&1 | grep -o "Solo un administrador puede editar fichas" | sed 's/^/panel_no_admin=/'
set test.uid = '00000000-0000-0000-0000-00000000000b';
select guardar_ficha(jsonb_build_object('id', (select id from medicamentos where slug = 'losarvit-50-1'), 'nombre_comercial', 'X',
  'forma_farmaceutica', 'comprimido', 'liberacion', 'inmediata', 'forma_geometrica', 'redonda', 'ranura', 'sin_ranura', 'estado', 'borrador', 'principios', '[]'::jsonb));
SQL
# Un error de validación no deja nada a medias (la forma sigue cuadrada).
$PSQL -t -A -v ON_ERROR_STOP=0 <<'SQL' 2>&1 | grep -E "panel_|necesita" | sed 's/^.*ERROR: *//'
set test.uid = '00000000-0000-0000-0000-00000000000a';
select guardar_ficha(jsonb_build_object('id', (select id from medicamentos where slug = 'losarvit-50-1'), 'nombre_comercial', 'X',
  'forma_farmaceutica', 'comprimido', 'liberacion', 'inmediata', 'forma_geometrica', 'redonda', 'ranura', 'sin_ranura',
  'criterio', null, 'estado', 'publicado', 'principios', '[]'::jsonb));
select 'panel_sin_cambios=' || forma_geometrica || '|' || nombre_comercial from medicamentos where slug = 'losarvit-50-1';
SQL

# Nueva ficha desde el panel: solo admin, queda en borrador y marcada como editada en el panel.
$PSQL -t -A <<'SQL'
set test.uid = '00000000-0000-0000-0000-00000000000a';
select 'panel_nueva_id=' || (id > 0) || '|' || slug from crear_ficha('Ficha Nueva 10 mg', 'Laboratorio X');
select 'panel_nueva=' || estado || '|' || editada_en_panel || '|' || laboratorio || '|' || forma_revisada from medicamentos where nombre_comercial = 'Ficha Nueva 10 mg';
SQL
$PSQL -t -A -v ON_ERROR_STOP=0 <<'SQL' 2>&1 | grep -o "Solo un administrador puede crear fichas" | sed 's/^/panel_nueva_no_admin=/'
set test.uid = '00000000-0000-0000-0000-00000000000b';
select crear_ficha('Intrusa', '');
SQL

# Una carga del stock posterior no toca la ficha editada en el panel.
$PSQL -t -A -c "alter table auth.users add column if not exists email text" -c "insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'qf@ejemplo.cl') on conflict (id) do update set email = excluded.email" >/dev/null
$PSQL -f "$DIR/prueba-carga-sobre-panel.sql" >/dev/null
$PSQL -t -A -c "select 'panel_tras_carga=' || forma_geometrica || '|' || laboratorio || '|' || (select count(*) from medicamento_principios mp where mp.medicamento_id = m.id) from medicamentos m where slug = 'losarvit-50-1'"

# Reportes: el público (anon) puede crear reportes pero no leerlos.
$PSQL -f "$DIR/migracion_reportes.sql"
$PSQL -f "$DIR/migracion_reportes.sql"
# Como en Supabase con "exponer tablas automáticamente": anon tiene SELECT y solo RLS lo frena.
$PSQL -c "grant usage on schema public to anon; grant select on public.reportes to anon" >/dev/null
$PSQL -t -A <<'SQL'
set role anon;
insert into public.reportes (medicamento_slug, medicamento, mensaje) values ('x-1', 'X', 'Dato incorrecto');
select 'reportes_visibles_para_anon=' || count(*) from public.reportes;
reset role;
select 'reportes_guardados=' || count(*) from public.reportes;
SQL

# Carga masiva opcional: se ejecuta dos veces para comprobar que no duplica.
if [ -n "${1:-}" ]; then
  $PSQL -f "$DIR/migracion_carga.sql"
  $PSQL -f "$1"
  $PSQL -t -A -c "select 'carga1=' || count(*) || ' publicadas=' || count(*) filter (where estado = 'publicado') from medicamentos"
  $PSQL -f "$1"
  $PSQL -t -A -c "select 'carga2=' || count(*) || ' principios=' || (select count(*) from principios_activos) || ' enlaces=' || (select count(*) from medicamento_principios) from medicamentos"
  $PSQL -t -A -c "select 'visibles=' || count(*) from v_fichas_publicas"
fi
