import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Criterio, DciBase, Ficha, Principio } from '../tipos';
import type { DatosCrudos } from './datos';

const POR_PAGINA = 1000;

/** Supabase entrega como máximo 1000 filas por consulta: se pide por páginas hasta agotar. */
async function todas<T>(cliente: SupabaseClient, tabla: string, columnas: string, filtro?: [string, unknown]): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    let consulta = cliente.from(tabla).select(columnas).range(desde, desde + POR_PAGINA - 1);
    if (filtro) consulta = consulta.eq(filtro[0], filtro[1]);
    const { data, error } = await consulta;
    if (error) throw new Error(`Supabase (${tabla}): ${error.message}`);
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < POR_PAGINA) return filas;
  }
}

/** Lee las vistas públicas de Supabase con la clave anon (protegida por RLS). */
export function crearCargaSupabase(url: string, clave: string): () => Promise<DatosCrudos> {
  return async () => {
    const cliente = createClient(url, clave, { auth: { persistSession: false } });
    const [fichas, dcis, criterios] = await Promise.all([
      todas<Record<string, any>>(cliente, 'v_fichas_publicas', '*'),
      todas<Record<string, any>>(cliente, 'v_dci_publicas', 'slug,dci,sinonimos,resumen,resumen_revisado_en'),
      todas<Record<string, any>>(cliente, 'criterios_particion', 'codigo,titulo,fundamento,veredicto_asociado', ['activo', true]),
    ]);
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
        (c): Criterio => ({ codigo: c.codigo, titulo: c.titulo, fundamento: c.fundamento, veredicto: c.veredicto_asociado }),
      ),
    };
  };
}
