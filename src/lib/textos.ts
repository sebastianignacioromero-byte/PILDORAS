import type { Dci, FormaFarmaceutica, FormaGeometrica, Ficha, TipoLiberacion, TipoRanura, Veredicto } from '../tipos';

export interface TextoVeredicto {
  sello: string;
  subtitulo: string;
  etiqueta: string;
  color: string;
  icono: 'ok' | 'alerta' | 'tachado';
}

export const VEREDICTOS: Record<Veredicto, TextoVeredicto> = {
  se_puede_partir: {
    sello: 'Sí, se puede partir',
    subtitulo: 'Pártalo solo si le indicaron media dosis',
    etiqueta: 'Se puede partir',
    color: '#157a55',
    icono: 'ok',
  },
  no_debe_partir: {
    sello: 'No se debe partir',
    subtitulo: 'Partirlo puede alterar su efecto o su seguridad',
    etiqueta: 'No se debe partir',
    color: '#c42c2c',
    icono: 'alerta',
  },
  no_puede_partir: {
    sello: 'No se puede partir',
    subtitulo: 'Su forma no permite dividirlo',
    etiqueta: 'No se puede partir',
    color: '#4a5b63',
    icono: 'tachado',
  },
};

export const ETIQUETA_FORMA: Record<FormaFarmaceutica, string> = {
  comprimido: 'Comprimido',
  comprimido_recubierto: 'Comprimido recubierto',
  comprimido_masticable: 'Comprimido masticable',
  comprimido_dispersable: 'Comprimido dispersable',
  comprimido_bucodispersable: 'Comprimido bucodispersable',
  comprimido_sublingual: 'Comprimido sublingual',
  comprimido_efervescente: 'Comprimido efervescente',
  comprimido_vaginal: 'Comprimido vaginal',
  gragea: 'Gragea',
  capsula_dura: 'Cápsula dura',
  capsula_blanda: 'Cápsula blanda',
  otra: 'Otra',
};

export const ETIQUETA_GEOMETRICA: Record<FormaGeometrica, string> = {
  redonda: 'Redonda',
  ovalada: 'Ovalada',
  oblonga: 'Oblonga',
  capsular: 'Capsular',
  cuadrada: 'Cuadrada',
  rectangular: 'Rectangular',
  triangular: 'Triangular',
  romboidal: 'Romboidal',
  hexagonal: 'Hexagonal',
  otra: 'Otra',
};

export const ETIQUETA_LIBERACION: Record<TipoLiberacion, string> = {
  inmediata: 'Inmediata',
  prolongada: 'Prolongada',
  modificada: 'Modificada',
  osmotica: 'Osmótica',
  retardada: 'Retardada',
  gastrorresistente: 'Gastrorresistente',
  bucodispersable: 'Bucodispersable',
  sublingual: 'Sublingual',
  efervescente: 'Efervescente',
  masticable: 'Masticable',
};

export const ETIQUETA_RANURA: Record<TipoRanura, string> = {
  sin_ranura: 'Sin ranura',
  simple: 'Simple',
  doble_cruz: 'Doble (en cruz)',
  multiple: 'Múltiple',
  solo_decorativa: 'Solo decorativa',
};

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 });

/** "Losartán 50 mg + Hidroclorotiazida 12,5 mg" */
export function concentracion(f: Pick<Ficha, 'principios'>): string {
  return f.principios.map((p) => (p.cantidad === null ? p.dci : `${p.dci} ${numero.format(p.cantidad)} ${p.unidad}`)).join(' + ');
}

const fechaLarga = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "28 de octubre de 2026" */
export function fecha(iso: string): string {
  return fechaLarga.format(new Date(iso));
}

/** "50 mg" o, en una asociación, "50/12,5 mg" (o "50 mg/12,5 mcg" si cambian las unidades). */
function fuerza(f: Pick<Ficha, 'principios'>): string {
  if (f.principios.some((p) => p.cantidad === null)) return '';
  const unidades = new Set(f.principios.map((p) => p.unidad));
  if (unidades.size === 1) return `${f.principios.map((p) => numero.format(p.cantidad)).join('/')} ${f.principios[0].unidad}`;
  return f.principios.map((p) => `${numero.format(p.cantidad)} ${p.unidad}`).join('/');
}

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** El nombre ya incluye todas las cantidades (p. ej. "Losarvit 50"). */
function nombreTraeFuerza(f: Pick<Ficha, 'nombreComercial' | 'principios'>): boolean {
  return f.principios.every((p) =>
    p.cantidad === null || new RegExp(`(^|[^0-9,])${escaparRegex(numero.format(p.cantidad))}($|[^0-9,])`).test(f.nombreComercial),
  );
}

/** "¿Se puede partir Cozaar 50 mg?": distingue presentaciones de la misma marca. */
export function tituloFicha(f: Pick<Ficha, 'nombreComercial' | 'principios'>): string {
  const nombre = f.principios.length === 0 || nombreTraeFuerza(f) ? f.nombreComercial : `${f.nombreComercial} ${fuerza(f)}`;
  return `¿Se puede partir ${nombre}?`;
}

export function metaDescripcionFicha(f: Ficha): string {
  if (f.metaDescripcion) return f.metaDescripcion;
  const lab = f.laboratorio ? `, ${f.laboratorio}` : '';
  return `${f.nombreComercial} (${concentracion(f)}${lab}): ${VEREDICTOS[f.veredicto].sello.toLowerCase()}. ${f.criterioTitulo}. Revisado por químico farmacéutico.`;
}

/** "Metformina: ¿se puede partir?": evita el artículo, que cambia según la DCI. */
export function tituloDci(d: Pick<Dci, 'dci'>): string {
  return `${d.dci}: ¿se puede partir?`;
}
