import type { Ficha, FormaFarmaceutica, FormaGeometrica, Principio, TipoRanura, Veredicto } from '../tipos';
import { normalizar } from './normalizar';

export interface ResultadoBusqueda {
  slug: string;
  nombreComercial: string;
  laboratorio: string | null;
  principios: Principio[];
  formaGeometrica: FormaGeometrica;
  ranura: TipoRanura;
  formaFarmaceutica: FormaFarmaceutica;
  veredicto: Veredicto;
}

export interface Buscador {
  buscar(q: string): Promise<ResultadoBusqueda[]>;
}

export class ErrorBusqueda extends Error {}

export const MIN_CARACTERES = 2;

export function debeBuscar(q: string): boolean {
  return normalizar(q).length >= MIN_CARACTERES;
}

export function aResultado(f: Ficha): ResultadoBusqueda {
  return {
    slug: f.slug,
    nombreComercial: f.nombreComercial,
    laboratorio: f.laboratorio,
    principios: f.principios,
    formaGeometrica: f.formaGeometrica,
    ranura: f.ranura,
    formaFarmaceutica: f.formaFarmaceutica,
    veredicto: f.veredicto,
  };
}

/** DCI de los resultados cuyo nombre contiene la consulta, sin repetir. */
export function dcisDeResultados(resultados: ResultadoBusqueda[], q: string): Principio[] {
  const qn = normalizar(q);
  const vistas = new Map<string, Principio>();
  for (const r of resultados) {
    for (const p of r.principios) {
      if (!vistas.has(p.slug) && normalizar(p.dci).includes(qn)) vistas.set(p.slug, p);
    }
  }
  return [...vistas.values()];
}

export { crearBuscadorLocal } from './buscar-local';
