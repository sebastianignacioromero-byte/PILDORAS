import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Criterio, DciBase, Ficha, Principio } from '../tipos';
import type { DatosCrudos } from './datos';

const POR_PAGINA = 1000;

/** Supabase entrega como máximo 1000 filas por consulta: se pide por páginas hasta agotar. */
async function todas<T>(
  cliente: SupabaseClient,
  tabla: string,
  columnas: string,
  orden: string,
  filtro?: [string, unknown],
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    // Sin un orden fijo, Postgres puede repetir o saltar filas entre páginas.
    let consulta = cliente.from(tabla).select(columnas).order(orden).range(desde, desde + POR_PAGINA - 1);
    if (filtro) consulta = consulta.eq(filtro[0], filtro[1]);
    const { data, error } = await consulta;
    if (error) throw new Error(`Supabase (${tabla}): ${error.message}`);
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < POR_PAGINA) return filas;
  }
}

/** Lee las vistas públicas de Supabase con la clave anon (protegida por RLS). */
export function crearCargaSupabase(url: string, clave: string, fetchPropio?: typeof fetch): () => Promise<DatosCrudos> {
  return async () => {
    const cliente = createClient(url, clave, {
      auth: { persistSession: false },
      global: fetchPropio ? { fetch: fetchPropio } : {},
    });
    const [fichas, dcis, criterios] = await Promise.all([
      todas<Record<string, any>>(cliente, 'v_fichas_publicas', '*', 'slug'),
      todas<Record<string, any>>(cliente, 'v_dci_publicas', 'slug,dci,sinonimos,resumen,resumen_revisado_en', 'slug'),
      todas<Record<string, any>>(cliente, 'criterios_particion', 'codigo,titulo,fundamento,explicacion,que_hacer,como_reconocer,veredicto_asociado', 'codigo', ['activo', true]),
    ]);
    // Nunca publicar un sitio vacío por error (proyecto equivocado, permisos o datos aún sin cargar).
    if (fichas.length === 0) {
      throw new Error('Supabase no devolvió ninguna ficha publicada. Revise el proyecto, los permisos de anon o cargue fichas antes de usar DATOS_FUENTE=supabase.');
    }
    return {
      fichas: fichas.map(
        (f): Ficha => ({
          id: f.id,
          slug: f.slug,
          nombreComercial: f.nombre_comercial,
          laboratorio: f.laboratorio,
          formaFarmaceutica: f.forma_farmaceutica,
          liberacion: f.liberacion,
          recubrimiento: f.recubrimiento,
          recubrimientoFuncional: f.recubrimiento_funcional,
          formaGeometrica: f.forma_geometrica,
          ranura: f.ranura,
          ranuraOrientacion: f.ranura_orientacion,
          grabado: f.grabado,
          veredicto: f.veredicto,
          notaVeredicto: f.nota_veredicto,
          metaDescripcion: f.meta_descripcion,
          revisadoEn: f.revisado_en,
          criterioCodigo: f.criterio_codigo,
          criterioTitulo: f.criterio_titulo,
          criterioFundamento: f.criterio_fundamento,
          criterioExplicacion: f.criterio_explicacion,
          criterioQueHacer: f.criterio_que_hacer,
          principios: (f.principios as Principio[]).map((p) => ({ ...p, cantidad: Number(p.cantidad) })),
        }),
      ),
      dcis: dcis.map(
        (d): DciBase => ({
          slug: d.slug,
          dci: d.dci,
          sinonimos: d.sinonimos ?? [],
          resumen: d.resumen,
          resumenRevisadoEn: d.resumen_revisado_en,
        }),
      ),
      criterios: criterios.map(
        (c): Criterio => ({
          codigo: c.codigo,
          titulo: c.titulo,
          veredicto: c.veredicto_asociado,
          explicacion: c.explicacion,
          fundamento: c.fundamento,
          queHacer: c.que_hacer,
          comoReconocer: c.como_reconocer,
        }),
      ),
    };
  };
}
