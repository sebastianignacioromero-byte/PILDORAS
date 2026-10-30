import type { Criterio, Ficha } from '../tipos';

/**
 * Replica en la web las reglas del esquema: una ficha publicada necesita veredicto,
 * criterio y fecha de revisión, y su veredicto debe coincidir con el del criterio.
 * Lanza un error que nombra la ficha para que la construcción del sitio se detenga.
 */
export function validarFichas(fichas: Ficha[], criterios: Criterio[]): void {
  const porCodigo = new Map(criterios.map((c) => [c.codigo, c]));
  const vistos = new Set<string>();
  for (const f of fichas) {
    const id = `Ficha "${f.slug}"`;
    if (vistos.has(f.slug)) throw new Error(`${id}: slug repetido`);
    vistos.add(f.slug);
    if (!f.veredicto) throw new Error(`${id}: no tiene veredicto`);
    if (!f.revisadoEn) throw new Error(`${id}: no tiene fecha de revisión`);
    const criterio = porCodigo.get(f.criterioCodigo);
    if (!criterio) throw new Error(`${id}: el criterio ${f.criterioCodigo} no existe`);
    if (criterio.veredicto !== f.veredicto) {
      throw new Error(`${id}: su veredicto (${f.veredicto}) no coincide con el del criterio ${criterio.codigo} (${criterio.veredicto})`);
    }
  }
}
