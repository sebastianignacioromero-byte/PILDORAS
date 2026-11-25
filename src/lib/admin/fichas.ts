// Lectura de la lista del panel (vista v_admin_fichas) y armado del pedido a guardar_ficha.
import { normalizar } from '../normalizar';
import type { FichaEditable } from './reglas';

export const POR_PAGINA = 50;

export interface Filtros {
  soloSinRevisar: boolean;
  estado: string;
  criterio: string;
  laboratorio: string;
  busqueda: string;
  pagina: number;
}

export function desdeFila(r: Record<string, any>): FichaEditable {
  return {
    id: r.id,
    slug: r.slug,
    nombreComercial: r.nombre_comercial ?? '',
    laboratorio: r.laboratorio ?? '',
    formaFarmaceutica: r.forma_farmaceutica,
    liberacion: r.liberacion,
    formaGeometrica: r.forma_geometrica,
    ranura: r.ranura,
    ranuraOrientacion: r.ranura_orientacion ?? 0,
    criterio: r.criterio_codigo ?? null,
    estado: r.estado,
    nota: r.nota_veredicto ?? '',
    principios: ((r.principios ?? []) as Record<string, any>[]).map((p) => ({
      dci: p.dci,
      cantidad: p.cantidad === null || p.cantidad === undefined ? null : Number(p.cantidad),
      unidad: p.unidad ?? 'mg',
    })),
    formaRevisada: Boolean(r.forma_revisada),
    editadaEnPanel: Boolean(r.editada_en_panel),
  };
}

/** Cuerpo del parámetro p de guardar_ficha. */
export function aPedido(f: FichaEditable) {
  return {
    id: f.id,
    nombre_comercial: f.nombreComercial.trim(),
    laboratorio: f.laboratorio.trim(),
    forma_farmaceutica: f.formaFarmaceutica,
    liberacion: f.liberacion,
    forma_geometrica: f.formaGeometrica,
    ranura: f.ranura,
    ranura_orientacion: f.ranuraOrientacion,
    criterio: f.criterio,
    estado: f.estado,
    nota: f.nota.trim(),
    principios: f.principios.map((p) => ({ dci: p.dci.trim(), cantidad: p.cantidad, unidad: p.unidad })),
  };
}

/** Consulta mínima que necesita aplicarFiltros (la de supabase-js la cumple). */
interface Consulta<T> {
  eq(columna: string, valor: unknown): T;
  ilike(columna: string, patron: string): T;
  order(columna: string): T;
  range(desde: number, hasta: number): T;
}

export function aplicarFiltros<T extends Consulta<T>>(q: T, f: Filtros): T {
  if (f.soloSinRevisar) q = q.eq('forma_revisada', false);
  if (f.estado) q = q.eq('estado', f.estado);
  if (f.criterio) q = q.eq('criterio_codigo', f.criterio);
  if (f.laboratorio) q = q.eq('laboratorio', f.laboratorio);
  const busqueda = normalizar(f.busqueda);
  if (busqueda.length >= 2) q = q.ilike('busqueda', `%${busqueda}%`);
  return q.order('nombre_comercial').range(f.pagina * POR_PAGINA, (f.pagina + 1) * POR_PAGINA - 1);
}
