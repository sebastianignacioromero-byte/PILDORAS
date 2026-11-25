-- Prueba de supabase/verificar.sh: una carga del stock sobre una ficha editada en el panel.
-- Carga de fichas Píldoras desde el stock de Curie (2026-11-25).
-- 1 fichas. Ejecutar completo en el SQL Editor de Supabase.
-- Requiere supabase/migracion_carga.sql y migracion_panel.sql. Si algo falla, no se guarda nada.
-- Las fichas editadas en el panel de administración no se modifican.
begin;

-- 1. Revisor
do $$
begin
  if not exists (select 1 from auth.users where email = 'qf@ejemplo.cl') then
    raise exception 'No existe el usuario qf@ejemplo.cl en Supabase. Créelo en Authentication → Add user y vuelva a ejecutar.';
  end if;
end $$;
insert into public.perfiles (id) select id from auth.users where email = 'qf@ejemplo.cl' on conflict do nothing;

-- 2. Principios activos (los existentes no se tocan)
insert into public.principios_activos (dci, slug) values
  ('Losartan', 'losartan')
on conflict do nothing;

-- 3. Fichas. Una ficha ya publicada no vuelve a borrador.
with datos (slug, nombre, laboratorio, ean, forma, liberacion, recubrimiento, funcional, geometrica, ranura, criterio, nota, estado) as (values
  ('losarvit-50-1', 'Losarvit 50', null, '1', 'comprimido', 'inmediata', false, false, 'redonda', 'sin_ranura', 'SIN-RANURA-LI', null, 'publicado')
)
insert into public.medicamentos
  (slug, nombre_comercial, laboratorio, ean, forma_farmaceutica, liberacion, recubrimiento, recubrimiento_funcional,
   forma_geometrica, ranura, veredicto, criterio_id, nota_veredicto, estado, revisado_por, revisado_en)
select d.slug, d.nombre, d.laboratorio, d.ean, d.forma::public.forma_farmaceutica, d.liberacion::public.tipo_liberacion,
       d.recubrimiento, d.funcional, d.geometrica::public.forma_geometrica, d.ranura::public.tipo_ranura,
       c.veredicto_asociado, c.id, d.nota, d.estado::public.estado_ficha,
       (select id from auth.users where email = 'qf@ejemplo.cl'), '2026-11-25'::timestamptz
from datos d
left join public.criterios_particion c on c.codigo = d.criterio
on conflict (slug) do update set
  nombre_comercial = excluded.nombre_comercial,
  laboratorio = excluded.laboratorio,
  ean = excluded.ean,
  forma_farmaceutica = excluded.forma_farmaceutica,
  liberacion = excluded.liberacion,
  recubrimiento = excluded.recubrimiento,
  recubrimiento_funcional = excluded.recubrimiento_funcional,
  forma_geometrica = excluded.forma_geometrica,
  ranura = excluded.ranura,
  veredicto = excluded.veredicto,
  criterio_id = excluded.criterio_id,
  nota_veredicto = excluded.nota_veredicto,
  estado = case when public.medicamentos.estado = 'publicado' then 'publicado' else excluded.estado end,
  revisado_por = excluded.revisado_por,
  revisado_en = excluded.revisado_en
where not public.medicamentos.editada_en_panel;

-- 4. Principios de cada ficha (se reemplazan)
delete from public.medicamento_principios
where medicamento_id in (select id from public.medicamentos where not editada_en_panel and slug in ('losarvit-50-1'));

with datos (ficha, principio, cantidad, unidad) as (values
  ('losarvit-50-1', 'losartan', 50, 'mg')
)
insert into public.medicamento_principios (medicamento_id, principio_activo_id, cantidad, unidad)
select m.id, pa.id, d.cantidad::numeric, d.unidad
from datos d
join public.medicamentos m on m.slug = d.ficha and not m.editada_en_panel
join public.principios_activos pa on pa.slug = d.principio
on conflict do nothing;

commit;
