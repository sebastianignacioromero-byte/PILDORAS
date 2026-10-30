-- =====================================================================
-- MIGRACIÓN REPORTES DE ERRORES - Píldoras
-- Ejecutar una vez. Crea la tabla donde llegan los reportes del botón
-- "Reportar un error" de cada ficha. El público solo puede crear reportes;
-- leerlos y marcarlos como revisados es solo para administradores.
-- Para verlos: select * from public.reportes order by creado_en desc;
-- =====================================================================
create table if not exists public.reportes (
  id               bigint generated always as identity primary key,
  medicamento_slug text not null check (char_length(medicamento_slug) between 1 and 200),
  medicamento      text not null check (char_length(medicamento) between 1 and 200),
  mensaje          text not null check (char_length(mensaje) between 5 and 1000),
  contacto         text check (contacto is null or char_length(contacto) <= 200),
  estado           text not null default 'nuevo' check (estado in ('nuevo', 'revisado')),
  creado_en        timestamptz not null default now()
);

create index if not exists reportes_estado_idx on public.reportes (estado, creado_en desc);

alter table public.reportes enable row level security;

drop policy if exists reportes_insert_publico on public.reportes;
create policy reportes_insert_publico on public.reportes
  for insert to anon, authenticated
  with check (estado = 'nuevo');

drop policy if exists reportes_admin_all on public.reportes;
create policy reportes_admin_all on public.reportes
  for all using (public.es_admin()) with check (public.es_admin());

grant insert on public.reportes to anon, authenticated;
grant select, update, delete on public.reportes to authenticated;
