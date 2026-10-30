// Tipos de dominio. Los valores coinciden exactamente con los enums de supabase/schema_partibilidad.sql.

export const VALORES_VEREDICTO = ['se_puede_partir', 'no_debe_partir', 'no_puede_partir'] as const;
export type Veredicto = (typeof VALORES_VEREDICTO)[number];

export const VALORES_FORMA = [
  'comprimido', 'comprimido_recubierto', 'comprimido_masticable',
  'comprimido_dispersable', 'comprimido_bucodispersable', 'comprimido_sublingual',
  'comprimido_efervescente', 'comprimido_vaginal', 'gragea',
  'capsula_dura', 'capsula_blanda', 'otra',
] as const;
export type FormaFarmaceutica = (typeof VALORES_FORMA)[number];

export const VALORES_GEOMETRICA = [
  'redonda', 'ovalada', 'oblonga', 'capsular', 'cuadrada',
  'rectangular', 'triangular', 'romboidal', 'hexagonal', 'otra',
] as const;
export type FormaGeometrica = (typeof VALORES_GEOMETRICA)[number];

export const VALORES_LIBERACION = [
  'inmediata', 'prolongada', 'modificada', 'osmotica', 'retardada',
  'gastrorresistente', 'bucodispersable', 'sublingual',
  'efervescente', 'masticable',
] as const;
export type TipoLiberacion = (typeof VALORES_LIBERACION)[number];

export const VALORES_RANURA = ['sin_ranura', 'simple', 'doble_cruz', 'multiple', 'solo_decorativa'] as const;
export type TipoRanura = (typeof VALORES_RANURA)[number];

export interface Principio {
  dci: string;
  slug: string;
  cantidad: number;
  unidad: string;
}

/** Ficha publicada de una marca (equivale a una fila de v_fichas_publicas). */
export interface Ficha {
  id: number;
  slug: string;
  nombreComercial: string;
  laboratorio: string | null;
  formaFarmaceutica: FormaFarmaceutica;
  liberacion: TipoLiberacion;
  recubrimiento: boolean;
  recubrimientoFuncional: boolean;
  formaGeometrica: FormaGeometrica;
  ranura: TipoRanura;
  ranuraOrientacion: number;
  grabado: string | null;
  veredicto: Veredicto;
  notaVeredicto: string | null;
  metaDescripcion: string | null;
  /** Fecha ISO de la revisión del QF. */
  revisadoEn: string;
  criterioCodigo: string;
  criterioTitulo: string;
  criterioFundamento: string;
  /** Explicación breve del criterio para el paciente. */
  criterioExplicacion: string;
  criterioQueHacer: string;
  principios: Principio[];
}

/** Principio activo con al menos una marca publicada (equivale a v_dci_publicas). */
export interface Dci {
  slug: string;
  dci: string;
  sinonimos: string[];
  resumen: string | null;
  resumenRevisadoEn: string | null;
  nSePuede: number;
  nNoDebe: number;
  nNoPuede: number;
  ultimaRevision: string;
}

/** Datos propios de una DCI, antes de calcular sus conteos. */
export type DciBase = Pick<Dci, 'slug' | 'dci' | 'sinonimos' | 'resumen' | 'resumenRevisadoEn'>;

export interface Criterio {
  codigo: string;
  titulo: string;
  veredicto: Veredicto;
  /** Explicación para el paciente (1–2 frases), visible en la ficha. */
  explicacion: string;
  /** Por qué: fundamento farmacéutico, visible en la página del criterio. */
  fundamento: string;
  queHacer: string;
  comoReconocer: string;
}
