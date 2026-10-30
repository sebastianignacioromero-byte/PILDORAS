// Valida la planilla revisada y genera el SQL que el QF ejecuta en el SQL Editor de Supabase.
import criterios from '../../src/datos/ejemplo/criterios.json';
import { normalizar } from '../../src/lib/normalizar';
import { VALORES_FORMA, VALORES_GEOMETRICA, VALORES_LIBERACION, VALORES_RANURA } from '../../src/tipos';
import type { FichaCarga } from './agrupar';
import type { FilaRevision } from './planilla';

const CODIGOS = new Set(criterios.map((c) => c.codigo));
const ESTADOS = new Set(['publicado', 'borrador']);

/** Revisa toda la planilla y lanza un único error con cada problema y su fila. */
export function validarRevision(filas: FilaRevision[]): void {
  const errores: string[] = [];
  const claves = new Set<string>();
  for (const { fila, ficha: f } of filas) {
    const error = (m: string) => errores.push(`Fila ${fila} (${f.slug}): ${m}`);
    if (claves.has(f.slug)) error('clave repetida');
    claves.add(f.slug);
    if (f.criterio && !CODIGOS.has(f.criterio)) error(`el criterio ${f.criterio} no existe`);
    if (!ESTADOS.has(f.estado)) error(`estado "${f.estado}" no válido (publicado o borrador)`);
    if (!(VALORES_FORMA as readonly string[]).includes(f.formaFarmaceutica)) error(`forma farmacéutica "${f.formaFarmaceutica}" no válida`);
    if (!(VALORES_LIBERACION as readonly string[]).includes(f.liberacion)) error(`liberación "${f.liberacion}" no válida`);
    if (!(VALORES_GEOMETRICA as readonly string[]).includes(f.formaGeometrica)) error(`forma geométrica "${f.formaGeometrica}" no válida`);
    if (!(VALORES_RANURA as readonly string[]).includes(f.ranura)) error(`ranura "${f.ranura}" no válida`);
    if (!f.nombreComercial) error('falta el nombre comercial');
    for (const p of f.principios) {
      if (p.cantidad !== null && !(Number.isFinite(p.cantidad) && p.cantidad > 0)) error(`la cantidad de ${p.dci} no es un número mayor que 0`);
    }
    if (f.estado === 'publicado' && !f.criterio) error('una ficha publicada necesita criterio');
    if (f.estado === 'publicado' && f.principios.length === 0) error('una ficha publicada necesita al menos un principio activo');
  }
  if (errores.length) throw new Error(`La planilla tiene ${errores.length} problema(s):\n${errores.join('\n')}`);
}

const q = (t: string | null | undefined) => (t === null || t === undefined || t === '' ? 'null' : `'${t.replace(/'/g, "''")}'`);
const slugify = (t: string) => normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const RECUBIERTAS = new Set(['comprimido_recubierto', 'gragea']);
const FUNCIONALES = new Set(['gastrorresistente', 'prolongada', 'osmotica']);

export function generarSql(fichas: FichaCarga[], laboratorios: Map<string, string>, correoRevisor: string, fecha: string): string {
  // Un principio activo por slug: "Fenitoína sódica" y "Fenitoina sodica" son el mismo.
  const dcis = new Map<string, string>();
  for (const f of fichas) for (const p of f.principios) if (!dcis.has(slugify(p.dci))) dcis.set(slugify(p.dci), p.dci);

  const filasMed = fichas.map((f) =>
    `  (${[
      q(f.slug), q(f.nombreComercial), q(laboratorios.get(f.laboratorio) || null), q(f.ean || null),
      q(f.formaFarmaceutica), q(f.liberacion), RECUBIERTAS.has(f.formaFarmaceutica), FUNCIONALES.has(f.liberacion),
      q(f.formaGeometrica), q(f.ranura), q(f.criterio), q(f.nota || null), q(f.estado),
    ].join(', ')})`,
  );
  if (fichas.length === 0) throw new Error('No hay fichas para cargar.');
  const filasPa = fichas.flatMap((f) =>
    f.principios.map((p) => `  (${q(f.slug)}, ${q(slugify(p.dci))}, ${p.cantidad ?? 'null'}, ${q(p.unidad || 'mg')})`),
  );

  return `-- Carga de fichas Píldoras desde el stock de Curie (${fecha}).
-- ${fichas.length} fichas. Ejecutar completo en el SQL Editor de Supabase.
-- Requiere supabase/migracion_carga.sql. Si algo falla, no se guarda nada.
begin;

-- 1. Revisor
do $$
begin
  if not exists (select 1 from auth.users where email = ${q(correoRevisor)}) then
    raise exception 'No existe el usuario ${correoRevisor.replace(/'/g, "''")} en Supabase. Créelo en Authentication → Add user y vuelva a ejecutar.';
  end if;
end $$;
insert into public.perfiles (id) select id from auth.users where email = ${q(correoRevisor)} on conflict do nothing;

-- 2. Principios activos (los existentes no se tocan)
insert into public.principios_activos (dci, slug) values
${[...dcis.entries()].map(([slug, dci]) => `  (${q(dci)}, ${q(slug)})`).join(',\n')}
on conflict do nothing;

-- 3. Fichas. Una ficha ya publicada no vuelve a borrador.
with datos (slug, nombre, laboratorio, ean, forma, liberacion, recubrimiento, funcional, geometrica, ranura, criterio, nota, estado) as (values
${filasMed.join(',\n')}
)
insert into public.medicamentos
  (slug, nombre_comercial, laboratorio, ean, forma_farmaceutica, liberacion, recubrimiento, recubrimiento_funcional,
   forma_geometrica, ranura, veredicto, criterio_id, nota_veredicto, estado, revisado_por, revisado_en)
select d.slug, d.nombre, d.laboratorio, d.ean, d.forma::public.forma_farmaceutica, d.liberacion::public.tipo_liberacion,
       d.recubrimiento, d.funcional, d.geometrica::public.forma_geometrica, d.ranura::public.tipo_ranura,
       c.veredicto_asociado, c.id, d.nota, d.estado::public.estado_ficha,
       (select id from auth.users where email = ${q(correoRevisor)}), ${q(fecha)}::timestamptz
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
  revisado_en = excluded.revisado_en;

-- 4. Principios de cada ficha (se reemplazan)
delete from public.medicamento_principios
where medicamento_id in (select id from public.medicamentos where slug in (${fichas.map((f) => q(f.slug)).join(', ')}));
${filasPa.length === 0 ? '' : `
with datos (ficha, principio, cantidad, unidad) as (values
${filasPa.join(',\n')}
)
insert into public.medicamento_principios (medicamento_id, principio_activo_id, cantidad, unidad)
select m.id, pa.id, d.cantidad::numeric, d.unidad
from datos d
join public.medicamentos m on m.slug = d.ficha
join public.principios_activos pa on pa.slug = d.principio
on conflict do nothing;
`}
commit;
`;
}
