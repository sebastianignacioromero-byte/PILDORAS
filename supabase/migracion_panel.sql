-- =====================================================================
-- MIGRACIÓN PANEL DE ADMINISTRACIÓN - Píldoras
-- Ejecutar una vez (se puede repetir). Requiere migracion_carga.sql.
-- Agrega las marcas de revisión, la vista de la lista del panel, la función
-- crear_ficha (fichas nuevas en borrador) y la función guardar_ficha, que guarda una ficha completa en una sola transacción y
-- solo si quien la llama es administrador.
-- =====================================================================

-- ---------- 1. Marcas por ficha ----------
alter table public.medicamentos
  add column if not exists forma_revisada   boolean not null default false,  -- el QF revisó forma y ranura
  add column if not exists editada_en_panel boolean not null default false;  -- la carga del stock no la sobrescribe

-- ---------- 2. Vista de la lista del panel ----------
-- security_invoker: respeta RLS; un administrador ve todas las fichas, también los borradores.
drop view if exists public.v_admin_fichas;
create view public.v_admin_fichas
with (security_invoker = true) as
select
  m.id, m.slug, m.nombre_comercial, m.laboratorio,
  m.forma_farmaceutica, m.liberacion, m.forma_geometrica, m.ranura, m.ranura_orientacion,
  m.veredicto, c.codigo as criterio_codigo, m.nota_veredicto, m.estado,
  m.forma_revisada, m.editada_en_panel, m.revisado_en,
  coalesce(
    jsonb_agg(jsonb_build_object('dci', pa.dci, 'slug', pa.slug, 'cantidad', mp.cantidad, 'unidad', mp.unidad) order by pa.dci)
      filter (where pa.id is not null),
    '[]'::jsonb
  ) as principios,
  -- Texto normalizado para buscar por nombre o principio activo, sin tildes.
  lower(public.f_unaccent(m.nombre_comercial || ' ' || coalesce(string_agg(pa.dci, ' '), ''))) as busqueda
from public.medicamentos m
left join public.criterios_particion c     on c.id = m.criterio_id
left join public.medicamento_principios mp on mp.medicamento_id = m.id
left join public.principios_activos pa     on pa.id = mp.principio_activo_id
group by m.id, c.codigo;

revoke all on public.v_admin_fichas from anon;
grant select on public.v_admin_fichas to authenticated;

-- ---------- 3. Guardar una ficha desde el panel ----------
create or replace function public.guardar_ficha(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id         bigint := (p->>'id')::bigint;
  v_estado     public.estado_ficha := (p->>'estado')::public.estado_ficha;
  v_criterio   public.criterios_particion%rowtype;
  v_principios jsonb := coalesce(p->'principios', '[]'::jsonb);
  v_pa         jsonb;
  v_pa_id      bigint;
  v_cantidad   numeric;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede editar fichas.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.medicamentos where id = v_id) then
    raise exception 'La ficha % no existe.', v_id;
  end if;
  if coalesce(trim(p->>'nombre_comercial'), '') = '' then
    raise exception 'Falta el nombre comercial.';
  end if;
  if coalesce(p->>'criterio', '') <> '' then
    select * into v_criterio from public.criterios_particion where codigo = p->>'criterio';
    if not found then
      raise exception 'El criterio % no existe.', p->>'criterio';
    end if;
  end if;
  if v_estado = 'publicado' and (v_criterio.id is null or jsonb_array_length(v_principios) = 0) then
    raise exception 'Una ficha publicada necesita criterio y al menos un principio activo.';
  end if;

  update public.medicamentos set
    nombre_comercial   = trim(p->>'nombre_comercial'),
    laboratorio        = nullif(trim(p->>'laboratorio'), ''),
    forma_farmaceutica = (p->>'forma_farmaceutica')::public.forma_farmaceutica,
    liberacion         = (p->>'liberacion')::public.tipo_liberacion,
    forma_geometrica   = (p->>'forma_geometrica')::public.forma_geometrica,
    ranura             = (p->>'ranura')::public.tipo_ranura,
    ranura_orientacion = coalesce((p->>'ranura_orientacion')::smallint, 0),
    criterio_id        = v_criterio.id,
    veredicto          = v_criterio.veredicto_asociado,
    nota_veredicto     = nullif(trim(p->>'nota'), ''),
    estado             = v_estado,
    revisado_por       = auth.uid(),
    revisado_en        = now(),
    forma_revisada     = true,
    editada_en_panel   = true
  where id = v_id;

  delete from public.medicamento_principios where medicamento_id = v_id;
  for v_pa in select * from jsonb_array_elements(v_principios) loop
    if coalesce(trim(v_pa->>'dci'), '') = '' then
      raise exception 'Falta el nombre de un principio activo.';
    end if;
    v_cantidad := nullif(v_pa->>'cantidad', '')::numeric;
    if v_cantidad is not null and v_cantidad <= 0 then
      raise exception 'La cantidad de % debe ser mayor que 0.', v_pa->>'dci';
    end if;
    insert into public.principios_activos (dci) values (trim(v_pa->>'dci')) on conflict do nothing;
    select id into v_pa_id from public.principios_activos where slug = public.slugify(trim(v_pa->>'dci'));
    insert into public.medicamento_principios (medicamento_id, principio_activo_id, cantidad, unidad)
    values (v_id, v_pa_id, v_cantidad, coalesce(nullif(v_pa->>'unidad', ''), 'mg'))
    on conflict do nothing;
  end loop;
end;
$$;

revoke execute on function public.guardar_ficha(jsonb) from public, anon;
grant execute on function public.guardar_ficha(jsonb) to authenticated;

-- ---------- 4. Crear una ficha nueva desde el panel ----------
-- Queda en borrador y marcada como editada en el panel (la carga del stock no la toca).
create or replace function public.crear_ficha(p_nombre text, p_laboratorio text)
returns table (id bigint, slug text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede crear fichas.' using errcode = '42501';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre comercial.';
  end if;
  return query
  insert into public.medicamentos (nombre_comercial, laboratorio, forma_farmaceutica, estado, editada_en_panel)
  values (trim(p_nombre), nullif(trim(p_laboratorio), ''), 'comprimido', 'borrador', true)
  returning medicamentos.id, medicamentos.slug;
end;
$$;

revoke execute on function public.crear_ficha(text, text) from public, anon;
grant execute on function public.crear_ficha(text, text) to authenticated;

notify pgrst, 'reload schema';
