// Reglas del panel de administración que se aplican en el navegador, antes de guardar.
// La base de datos (guardar_ficha) vuelve a validar todo.
import { normalizar } from '../normalizar';
import type { FormaFarmaceutica, FormaGeometrica, TipoLiberacion, TipoRanura } from '../../tipos';

export interface PrincipioEditable {
  dci: string;
  cantidad: number | null;
  unidad: string;
}

export interface FichaEditable {
  id: number;
  slug: string;
  nombreComercial: string;
  laboratorio: string;
  formaFarmaceutica: FormaFarmaceutica;
  liberacion: TipoLiberacion;
  formaGeometrica: FormaGeometrica;
  ranura: TipoRanura;
  ranuraOrientacion: number;
  criterio: string | null;
  estado: 'publicado' | 'borrador' | 'archivado';
  nota: string;
  principios: PrincipioEditable[];
  formaRevisada: boolean;
  editadaEnPanel: boolean;
}

const FUNCIONALES = new Set<TipoRanura>(['simple', 'doble_cruz', 'multiple']);

/**
 * En un comprimido simple de liberación inmediata, la ranura decide entre RANURA-LI y SIN-RANURA-LI.
 * Cualquier otro criterio se respeta.
 */
export function aplicarReglaRanura(f: FichaEditable): FichaEditable {
  const simple = f.formaFarmaceutica === 'comprimido' && f.liberacion === 'inmediata';
  if (!simple || (f.criterio !== 'SIN-RANURA-LI' && f.criterio !== 'RANURA-LI')) return f;
  return { ...f, criterio: FUNCIONALES.has(f.ranura) ? 'RANURA-LI' : 'SIN-RANURA-LI' };
}

/** Problemas que impiden guardar; lista vacía si la ficha está bien. */
export function validarFicha(f: FichaEditable): string[] {
  const errores: string[] = [];
  if (!f.nombreComercial.trim()) errores.push('Falta el nombre comercial.');
  if (f.estado === 'publicado' && !f.criterio) errores.push('Una ficha publicada necesita criterio.');
  if (f.estado === 'publicado' && f.principios.length === 0) errores.push('Una ficha publicada necesita al menos un principio activo.');
  const vistos = new Map<string, string>();
  for (const p of f.principios) {
    const dci = p.dci.trim();
    if (!dci) {
      errores.push('Falta el nombre de un principio activo.');
      continue;
    }
    if (p.cantidad !== null && !(Number.isFinite(p.cantidad) && p.cantidad > 0)) errores.push(`La cantidad de ${dci} debe ser mayor que 0.`);
    const previo = vistos.get(normalizar(dci));
    if (previo) errores.push(`El principio activo ${previo} está repetido.`);
    else vistos.set(normalizar(dci), dci);
  }
  return errores;
}

export function hayCambios(a: FichaEditable, b: FichaEditable): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
