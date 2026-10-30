// Única puerta de acceso a los datos durante la construcción del sitio.
// La fuente se elige con DATOS_FUENTE: "ejemplo" (por defecto) o "supabase".
import type { Criterio, Dci, DciBase, Ficha } from '../tipos';
import { cargarEjemplo } from './fuente-ejemplo';
import { crearCargaSupabase } from './fuente-supabase';
import { validarFichas } from './validar';

export interface DatosCrudos {
  fichas: Ficha[];
  dcis: DciBase[];
  criterios: Criterio[];
}

type Entorno = Record<string, string | undefined>;

function entorno(): Entorno {
  return { ...process.env, ...(import.meta.env as Entorno) };
}

/**
 * Conexión a Supabase, solo si DATOS_FUENTE=supabase. Las páginas y el buscador usan esta misma decisión,
 * para que nunca se mezclen datos de ejemplo con datos reales.
 */
export function configSupabase(env: Entorno = entorno()): { url: string; clave: string } | null {
  if ((env.DATOS_FUENTE ?? 'ejemplo') !== 'supabase') return null;
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY');
  }
  return { url: env.PUBLIC_SUPABASE_URL, clave: env.PUBLIC_SUPABASE_ANON_KEY };
}

export function crearFuente(env: Entorno): () => Promise<DatosCrudos> {
  const supabase = configSupabase(env);
  return supabase ? crearCargaSupabase(supabase.url, supabase.clave) : cargarEjemplo;
}

/** true mientras el sitio muestra datos ficticios de ejemplo. */
export const esEjemplo = (entorno().DATOS_FUENTE ?? 'ejemplo') !== 'supabase';

const porNombre = (a: string, b: string) => a.localeCompare(b, 'es');

function calcularDcis(bases: DciBase[], fichas: Ficha[]): Dci[] {
  return bases
    .map((d) => {
      const suyas = fichas.filter((f) => f.principios.some((p) => p.slug === d.slug));
      return {
        ...d,
        nSePuede: suyas.filter((f) => f.veredicto === 'se_puede_partir').length,
        nNoDebe: suyas.filter((f) => f.veredicto === 'no_debe_partir').length,
        nNoPuede: suyas.filter((f) => f.veredicto === 'no_puede_partir').length,
        ultimaRevision: suyas.map((f) => f.revisadoEn).sort().at(-1) ?? '',
      };
    })
    .filter((d) => d.nSePuede + d.nNoDebe + d.nNoPuede > 0)
    .sort((a, b) => porNombre(a.dci, b.dci));
}

interface Datos {
  fichas: Ficha[];
  dcis: Dci[];
  criterios: Criterio[];
}

let cache: Promise<Datos> | undefined;

function cargar(): Promise<Datos> {
  cache ??= (async () => {
    const crudos = await crearFuente(entorno())();
    validarFichas(crudos.fichas, crudos.criterios);
    const fichas = [...crudos.fichas].sort((a, b) => porNombre(a.nombreComercial, b.nombreComercial));
    return { fichas, dcis: calcularDcis(crudos.dcis, fichas), criterios: crudos.criterios };
  })();
  return cache;
}

export async function obtenerFichas(): Promise<Ficha[]> {
  return (await cargar()).fichas;
}

export async function obtenerDcis(): Promise<Dci[]> {
  return (await cargar()).dcis;
}

export async function obtenerCriterios(): Promise<Criterio[]> {
  return (await cargar()).criterios;
}

export async function fichasDeDci(slug: string): Promise<Ficha[]> {
  return (await obtenerFichas()).filter((f) => f.principios.some((p) => p.slug === slug));
}

export async function fichasDeCriterio(codigo: string): Promise<Ficha[]> {
  return (await obtenerFichas()).filter((f) => f.criterioCodigo === codigo);
}
