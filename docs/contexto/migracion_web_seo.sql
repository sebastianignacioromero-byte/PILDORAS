-- =====================================================================
-- MIGRACIÓN WEB / SEO - App de partibilidad de comprimidos
-- Ejecutar DESPUÉS de schema_partibilidad.sql
-- Agrega: slugs, textos editoriales, vistas públicas para páginas
-- de principio activo (DCI) y soporte para sitemap.
-- =====================================================================

-- ---------- 1. Función slugify ----------
create or replace function public.slugify(txt text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(public.f_unaccent(coalesce(txt, ''))), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g')
  );
$$;

-- ---------- 2. Columnas nuevas ----------
alter table public.principios_activos
  add column if not exists slug text,
  add column if not exists resumen text,            -- texto editorial del QF (intro de la página DCI)
  add column if not exists resumen_revisado_en timestamptz;

alter table public.medicamentos
  add column if not exists slug text,
  add column if not exists meta_descripcion text;   -- opcional; si es null la web la genera

-- ---------- 3. Triggers de slug ----------
create or replace function public.set_slug_principio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.dci);
  end if;
  return new;
end;
$$;

drop trigger if exists principios_set_slug on public.principios_activos;
create trigger principios_set_slug
  before insert or update on public.principios_activos
  for each row execute function public.set_slug_principio();

create or replace function public.set_slug_medicamento()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is null or new.slug = '' then
    -- El id (identity) ya está asignado en BEFORE INSERT: garantiza unicidad
    new.slug := public.slugify(new.nombre_comercial) || '-' || new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists medicamentos_set_slug on public.medicamentos;
create trigger medicamentos_set_slug
  before insert or update on public.medicamentos
  for each row execute function public.set_slug_medicamento();

-- ---------- 4. Backfill de filas existentes ----------
update public.principios_activos
   set slug = public.slugify(dci)
 where slug is null or slug = '';

update public.medicamentos
   set slug = public.slugify(nombre_comercial) || '-' || id::text
 where slug is null or slug = '';

-- ---------- 5. Restricciones e índices ----------
alter table public.principios_activos
  alter column slug set not null;
alter table public.medicamentos
  alter column slug set not null;

create unique index if not exists principios_activos_slug_key on public.principios_activos (slug);
create unique index if not exists medicamentos_slug_key       on public.medicamentos (slug);

-- ---------- 6. Vista pública: principios activos con presentaciones publicadas ----------
-- security_invoker: respeta RLS del usuario que consulta (anon solo ve publicados)
create or replace view public.v_dci_publicas
with (security_invoker = true) as
select
  pa.id,
  pa.slug,
  pa.dci,
  pa.sinonimos,
  pa.resumen,
  pa.resumen_revisado_en,
  count(distinct m.id)                                              as n_presentaciones,
  count(distinct m.id) filter (where m.veredicto = 'partible')      as n_partibles,
  count(distinct m.id) filter (where m.veredicto = 'condicional')   as n_condicionales,
  count(distinct m.id) filter (where m.veredicto = 'no_partible')   as n_no_partibles,
  max(m.revisado_en)                                                as ultima_revision
from public.principios_activos pa
join public.medicamento_principios mp on mp.principio_activo_id = pa.id
join public.medicamentos m            on m.id = mp.medicamento_id
where m.estado = 'publicado'
group by pa.id;

-- ---------- 7. Vista pública: fichas completas (para páginas de medicamento) ----------
create or replace view public.v_fichas_publicas
with (security_invoker = true) as
select
  m.id,
  m.slug,
  m.nombre_comercial,
  m.laboratorio,
  m.forma_farmaceutica,
  m.liberacion,
  m.recubrimiento,
  m.recubrimiento_funcional,
  m.forma_geometrica,
  m.color_hex,
  m.color_hex_secundario,
  m.largo_mm,
  m.ancho_mm,
  m.espesor_mm,
  m.ranura,
  m.ranura_orientacion,
  m.grabado,
  m.veredicto,
  m.nota_veredicto,
  m.meta_descripcion,
  m.revisado_en,
  m.actualizado_en,
  c.codigo      as criterio_codigo,
  c.titulo      as criterio_titulo,
  c.fundamento  as criterio_fundamento,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'dci',     pa.dci,
        'slug',    pa.slug,
        'cantidad', mp.cantidad,
        'unidad',  mp.unidad
      ) order by pa.dci
    ) filter (where pa.id is not null),
    '[]'::jsonb
  ) as principios
from public.medicamentos m
left join public.criterios_particion c        on c.id = m.criterio_id
left join public.medicamento_principios mp    on mp.medicamento_id = m.id
left join public.principios_activos pa        on pa.id = mp.principio_activo_id
where m.estado = 'publicado'
group by m.id, c.id;

-- ---------- 8. Listado liviano para sitemap ----------
create or replace view public.v_sitemap
with (security_invoker = true) as
select 'medicamento' as tipo, slug, coalesce(revisado_en, actualizado_en) as lastmod
  from public.medicamentos
 where estado = 'publicado'
union all
select 'dci' as tipo, slug, ultima_revision as lastmod
  from public.v_dci_publicas
union all
select 'criterio' as tipo, lower(codigo) as slug, actualizado_en as lastmod
  from public.criterios_particion
 where activo;

-- ---------- 9. Permisos de lectura pública ----------
grant select on public.v_dci_publicas   to anon, authenticated;
grant select on public.v_fichas_publicas to anon, authenticated;
grant select on public.v_sitemap         to anon, authenticated;
