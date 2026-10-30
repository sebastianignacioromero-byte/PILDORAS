import { debeBuscar, type Buscador, type ResultadoBusqueda } from './buscar';
import { normalizar } from './normalizar';

const TOPE = 30;

/**
 * Búsqueda de la maqueta, sin servidor: subcadena normalizada en el nombre comercial y en cada DCI.
 * Orden: marcas que empiezan con la consulta, marcas que la contienen, y luego coincidencias por DCI.
 */
export function crearBuscadorLocal(items: ResultadoBusqueda[]): Buscador {
  const indice = items.map((r) => ({ r, nombre: normalizar(r.nombreComercial), dcis: r.principios.map((p) => normalizar(p.dci)) }));
  return {
    async buscar(q) {
      if (!debeBuscar(q)) return [];
      const qn = normalizar(q);
      return indice
        .map((x) => ({
          r: x.r,
          rango: x.nombre.startsWith(qn) ? 0 : x.nombre.includes(qn) ? 1 : x.dcis.some((d) => d.includes(qn)) ? 2 : -1,
        }))
        .filter((x) => x.rango >= 0)
        .sort((a, b) => a.rango - b.rango || a.r.nombreComercial.localeCompare(b.r.nombreComercial, 'es'))
        .slice(0, TOPE)
        .map((x) => x.r);
    },
  };
}
