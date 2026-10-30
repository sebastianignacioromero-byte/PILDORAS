import type { FormaFarmaceutica, FormaGeometrica, Ficha, TipoLiberacion, TipoRanura, Veredicto } from '../tipos';

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
  return f.principios.map((p) => `${p.dci} ${numero.format(p.cantidad)} ${p.unidad}`).join(' + ');
}

const fechaLarga = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "28 de octubre de 2026" */
export function fecha(iso: string): string {
  return fechaLarga.format(new Date(iso));
}
