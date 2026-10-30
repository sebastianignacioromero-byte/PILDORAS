// Asigna el criterio de partición a una ficha del stock, según las reglas aprobadas por el QF
// (documento "Píldoras · Criterios de partición" y spec de carga, §4).
import type { FormaFarmaceutica, FormaGeometrica, TipoLiberacion, TipoRanura } from '../../src/tipos';
import { normalizar } from '../../src/lib/normalizar';
import type { Concentracion } from './analizar';
import { MTE, PELIGROSOS } from './listas';

export interface EntradaClasificar {
  /** Nombre y concentración, sin la caja ni el laboratorio. */
  nombre: string;
  sigla: string;
  dcis: string[];
  concentraciones: Concentracion[];
}

export interface Clasificacion {
  criterio: string | null;
  formaFarmaceutica: FormaFarmaceutica;
  liberacion: TipoLiberacion;
  formaGeometrica: FormaGeometrica;
  ranura: TipoRanura;
  estado: 'publicado' | 'borrador';
  alertas: string[];
}

type Datos = { forma: FormaFarmaceutica; liberacion: TipoLiberacion; criterio: string };

/** Spec §4.1 */
const SIGLAS: Record<string, Datos> = {
  C: { forma: 'comprimido', liberacion: 'inmediata', criterio: 'SIN-RANURA-LI' },
  CR: { forma: 'comprimido_recubierto', liberacion: 'inmediata', criterio: 'RECUB-ESTETICO' },
  GR: { forma: 'gragea', liberacion: 'inmediata', criterio: 'RECUB-ESTETICO' },
  CRE: { forma: 'comprimido_recubierto', liberacion: 'gastrorresistente', criterio: 'ENTERICO' },
  CPRE: { forma: 'capsula_dura', liberacion: 'gastrorresistente', criterio: 'ENTERICO' },
  CLP: { forma: 'comprimido', liberacion: 'prolongada', criterio: 'LIB-PROLONGADA' },
  CLPO: { forma: 'comprimido_recubierto', liberacion: 'osmotica', criterio: 'LIB-OSMOTICA' },
  CP: { forma: 'capsula_dura', liberacion: 'inmediata', criterio: 'NO-SOLIDA' },
  CPB: { forma: 'capsula_blanda', liberacion: 'inmediata', criterio: 'NO-SOLIDA' },
  CB: { forma: 'capsula_blanda', liberacion: 'inmediata', criterio: 'NO-SOLIDA' },
  CEF: { forma: 'comprimido_efervescente', liberacion: 'efervescente', criterio: 'EFERVESCENTE' },
  CSL: { forma: 'comprimido_sublingual', liberacion: 'sublingual', criterio: 'SUBLINGUAL' },
  CBD: { forma: 'comprimido_bucodispersable', liberacion: 'bucodispersable', criterio: 'BUCODISPERSABLE' },
  CDB: { forma: 'comprimido_bucodispersable', liberacion: 'bucodispersable', criterio: 'BUCODISPERSABLE' },
  CM: { forma: 'comprimido_masticable', liberacion: 'masticable', criterio: 'MASTICABLE' },
  CD: { forma: 'comprimido_dispersable', liberacion: 'inmediata', criterio: 'DISPERSABLE' },
  OV: { forma: 'comprimido_vaginal', liberacion: 'inmediata', criterio: 'VAGINAL' },
  CV: { forma: 'capsula_blanda', liberacion: 'inmediata', criterio: 'VAGINAL' },
  CPV: { forma: 'capsula_blanda', liberacion: 'inmediata', criterio: 'VAGINAL' },
};

/** Spec §4.2: siglas del nombre, como palabras completas. */
const EN_NOMBRE: [RegExp, Datos][] = [
  [/\b(or|oros)\b/, { forma: 'comprimido_recubierto', liberacion: 'osmotica', criterio: 'LIB-OSMOTICA' }],
  [/\b(lp|sr|xr|xl|retard)\b|liberacion prolongada/, { forma: 'comprimido', liberacion: 'prolongada', criterio: 'LIB-PROLONGADA' }],
  [/\bec\b|gastrorresistente/, { forma: 'comprimido_recubierto', liberacion: 'gastrorresistente', criterio: 'ENTERICO' }],
  [/\bsl\b|sublingual/, { forma: 'comprimido_sublingual', liberacion: 'sublingual', criterio: 'SUBLINGUAL' }],
  [/\b(odt|bd)\b|bucodispersable/, { forma: 'comprimido_bucodispersable', liberacion: 'bucodispersable', criterio: 'BUCODISPERSABLE' }],
  [/efervescente/, { forma: 'comprimido_efervescente', liberacion: 'efervescente', criterio: 'EFERVESCENTE' }],
  [/masticable/, { forma: 'comprimido_masticable', liberacion: 'masticable', criterio: 'MASTICABLE' }],
];

/** Spec §4.3: orden de evaluación de los criterios que dependen de la forma. */
const ORDEN_FORMA = ['SUBLINGUAL', 'BUCODISPERSABLE', 'EFERVESCENTE', 'VAGINAL', 'LIB-OSMOTICA', 'LIB-PROLONGADA', 'ENTERICO'];
const ORDEN_FINAL = ['MASTICABLE', 'DISPERSABLE', 'RECUB-ESTETICO', 'SIN-RANURA-LI'];
const NO_SOLIDA = new Set(['CP', 'CPB', 'CB']);
const BAJA_CONFIANZA = new Set(['MTE', 'DOSIS-MCG']);

const esCapsula = (f: FormaFarmaceutica) => f === 'capsula_dura' || f === 'capsula_blanda';
const enLista = (dcis: string[], lista: string[]) => dcis.some((d) => lista.some((x) => normalizar(d).includes(x)));

export function clasificar(e: EntradaClasificar): Clasificacion {
  const alertas: string[] = [];
  const nombre = normalizar(e.nombre);
  const porSigla = SIGLAS[e.sigla];
  const porNombre = EN_NOMBRE.filter(([re]) => re.test(nombre)).map(([, d]) => d);
  if (!porSigla && porNombre.length === 0) alertas.push(`sigla desconocida: ${e.sigla}`);

  // Las siglas del nombre mandan sobre la de la unidad, salvo en las cápsulas (la forma física no cambia).
  const base = porSigla ?? porNombre[0];
  const capsula = base ? esCapsula(base.forma) : false;
  const candidatos = new Set([...(porSigla ? [porSigla.criterio] : []), ...porNombre.map((d) => d.criterio)]);
  const delNombre = [...ORDEN_FORMA, ...ORDEN_FINAL].map((c) => porNombre.find((d) => d.criterio === c)).find(Boolean);
  const datos = !capsula && delNombre ? delNombre : base;

  let criterio: string | null = null;
  if (NO_SOLIDA.has(e.sigla)) criterio = 'NO-SOLIDA';
  else if (enLista(e.dcis, PELIGROSOS)) criterio = 'PELIGROSO';
  else criterio = ORDEN_FORMA.find((c) => candidatos.has(c)) ?? null;
  if (!criterio && enLista(e.dcis, MTE)) criterio = 'MTE';
  if (!criterio && e.concentraciones.some((c) => c.unidad === 'mcg') && !capsula) criterio = 'DOSIS-MCG';
  if (!criterio) criterio = ORDEN_FINAL.find((c) => candidatos.has(c)) ?? null;

  if (e.sigla === 'C' && criterio === 'SIN-RANURA-LI') alertas.push('ranura pendiente');
  if (e.dcis.length === 0) alertas.push('sin principio activo');
  if (e.concentraciones.length === 0) alertas.push('concentración ilegible');

  const forma = datos?.forma ?? 'otra';
  // Sin concentración la ficha se publica igual: el veredicto depende de la forma, no de la dosis.
  const borrador = !criterio || BAJA_CONFIANZA.has(criterio) || e.dcis.length === 0;
  return {
    criterio,
    formaFarmaceutica: forma,
    liberacion: datos?.liberacion ?? 'inmediata',
    formaGeometrica: esCapsula(forma) ? 'capsular' : 'redonda',
    ranura: 'sin_ranura',
    estado: borrador ? 'borrador' : 'publicado',
    alertas,
  };
}
