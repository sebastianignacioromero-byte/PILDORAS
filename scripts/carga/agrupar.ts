// Agrupa las filas del stock en fichas (una por producto, juntando cajas de distinto tamaño),
// obtiene el principio activo y la concentración, y clasifica cada ficha.
import { normalizar } from '../../src/lib/normalizar';
import { analizarProducto, leerConcentraciones } from './analizar';
import { clasificar, type Clasificacion } from './clasificar';

export interface FilaStock {
  tipo: string;
  producto: string;
  variante: string;
  ean: string;
}

export interface PrincipioCarga {
  dci: string;
  cantidad: number | null;
  unidad: string;
}

export interface FichaCarga extends Clasificacion {
  slug: string;
  productos: string[];
  ean: string;
  nombreComercial: string;
  laboratorio: string;
  sigla: string;
  principios: PrincipioCarga[];
  /** Se publica en la ficha. */
  nota: string;
  /** Uso interno del QF; nunca se publica. */
  comentario: string;
}

const TIPOS = new Set(['MEDICAMENTO', 'CENABAST', 'MEDICAMENTO CONTROLADO']);
/** Siglas de comprimidos y cápsulas (spec §4.1) más las desconocidas que el QF revisa a mano. */
const SOLIDOS = new Set([
  'C', 'CR', 'GR', 'CRE', 'CPRE', 'CLP', 'CLPO', 'CP', 'CPB', 'CB', 'CEF', 'CSL', 'CBD', 'CDB', 'CM', 'CD', 'OV', 'CV', 'CPV',
  'U', 'UN', 'CF', 'CLR', 'CPR',
]);
/** Productos que no son de uso oral sólido aunque su unidad lo parezca (U, UN…). */
const NO_SOLIDOS = /INYECTABLE|PENFILL|FLEXPEN|LAPIZ|AMPOLLA|JERINGA|\d\s*ML\b/;
const PALABRAS_FORMA = /\b(OVULOS?|BD|ODT|XL|XR|LP|SR|RETARD|OR|OROS|SL|EFERVESCENTES?|BUCODISPERSABLES?|COMPRIMIDOS?|CAPSULAS?|FORTE)\b/g;
const SIGLAS_MAYUS = new Set(['OR', 'OROS', 'XR', 'XL', 'LP', 'SR', 'SL', 'ODT', 'BD', 'EC', 'HCT', 'D', 'AB', 'DA', 'FC', 'ER', 'CR', 'MR']);

const slugify = (t: string) => normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const oracion = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t);

/** "ACICLOVIR 200MG" → "Aciclovir 200 mg"; conserva siglas como OR o XL. */
export function nombreVisible(base: string): string {
  return base
    .split(' ')
    .map((p) => (SIGLAS_MAYUS.has(p) ? p : oracion(p)))
    .join(' ')
    .replace(/(\d)\s*(mcg|mg|ui|g)\b/gi, (_, n: string, u: string) => `${n} ${u.toUpperCase() === 'UI' ? 'UI' : u.toLowerCase()}`);
}

interface PartesVariante {
  dci: string;
  dosis: { cantidad: number; unidad: string | null } | null;
}

/** "DESOGESTREL 0,15, ETINILESTRADIOL 0,02 (BE)" → dos principios con su dosis. No corta en la coma decimal. */
function partesVariante(v: string): PartesVariante[] {
  const limpio = v.replace(/\((?:BE|GEN)\)|RR\*|\bGENERICOS?\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!limpio) return [];
  return limpio
    .split(/\s*(?:\/|\+|,(?!\d))\s*/)
    .filter(Boolean)
    .map((parte) => {
      const m = parte.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(MCG|MG|G|UI)?$/i);
      if (!m || !m[1]) return { dci: parte, dosis: null };
      const unidad = m[3] ? m[3].toLowerCase().replace('ui', 'UI') : null;
      return { dci: m[1], dosis: { cantidad: Number(m[2].replace(',', '.')), unidad } };
    });
}

const limpiarVariante = (v: string) => partesVariante(v).map((p) => p.dci);

function inferirDci(base: string): string {
  return base.split(/\s+\d/)[0].replace(PALABRAS_FORMA, ' ').replace(/\s+/g, ' ').trim();
}

export function agruparFichas(filas: FilaStock[]): FichaCarga[] {
  const grupos = new Map<string, { base: string; sigla: string; laboratorio: string; productos: string[]; variante: string; ean: string }>();
  for (const f of filas) {
    if (!TIPOS.has(f.tipo)) continue;
    const a = analizarProducto(f.producto);
    if (!a || !SOLIDOS.has(a.sigla) || NO_SOLIDOS.test(f.producto.toUpperCase())) continue;
    // U y UN se usan para todo tipo de unidades (parches, supositorios, sobres): solo cuentan si dice comprimido o cápsula.
    if ((a.sigla === 'U' || a.sigla === 'UN') && !/COMPRIMID|CAPSULA/.test(f.producto.toUpperCase())) continue;
    const clave = `${a.base}|${a.sigla}|${a.laboratorio}`;
    const g = grupos.get(clave) ?? { base: a.base, sigla: a.sigla, laboratorio: a.laboratorio, productos: [], variante: '', ean: f.ean };
    g.productos.push(f.producto);
    if (!limpiarVariante(g.variante).length && limpiarVariante(f.variante).length) g.variante = f.variante;
    grupos.set(clave, g);
  }

  const conocidas = new Set([...grupos.values()].flatMap((g) => limpiarVariante(g.variante).map(normalizar)));
  const slugs = new Set<string>();

  return [...grupos.values()].map((g) => {
    const alertas: string[] = [];
    let dcis = limpiarVariante(g.variante);
    if (dcis.length === 0) {
      const inferida = inferirDci(g.base);
      if (inferida) dcis = inferida.split(/\s*\/\s*/).filter(Boolean);
      if (inferida && !conocidas.has(normalizar(inferida))) alertas.push('principio activo inferido');
    }
    let conc = leerConcentraciones(g.base);
    // Sin unidad en el nombre ("PROLOPA 200/50"): se asume mg si las cantidades calzan con los principios.
    const sinUnidad = g.base.match(/\b\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)+\b/);
    if (conc.length === 0 && sinUnidad && sinUnidad[0].split('/').length === dcis.length) {
      conc = sinUnidad[0].split('/').map((n) => ({ cantidad: Number(n.replace(',', '.')), unidad: 'mg' }));
      alertas.push('unidad asumida: mg');
    }
    // Si el nombre no trae dosis, se usa la de la Variante.
    const variante = partesVariante(g.variante);
    if (conc.length === 0 && variante.length === dcis.length && variante.every((p) => p.dosis)) {
      conc = variante.map((p) => ({ cantidad: p.dosis!.cantidad, unidad: p.dosis!.unidad ?? 'mg' }));
      if (variante.some((p) => !p.dosis!.unidad)) alertas.push('unidad asumida: mg');
    }
    // Una sola cifra sin unidad con un solo principio activo ("CARVEDILOL 6,25", "PAUSE 500"): mg.
    const cifra = g.base.match(/\s(\d+(?:[.,]\d+)?)(?:\s|$)/);
    if (conc.length === 0 && dcis.length === 1 && cifra && !partesVariante(g.variante).some((p) => p.dosis)) {
      conc = [{ cantidad: Number(cifra[1].replace(',', '.')), unidad: 'mg' }];
      alertas.push('unidad asumida: mg');
    }
    const principios = dcis.map((d, i) => ({
      dci: oracion(d),
      cantidad: conc[dcis.length === 1 ? 0 : i]?.cantidad ?? null,
      unidad: conc[dcis.length === 1 ? 0 : i]?.unidad ?? '',
    }));
    const legibles = principios.length > 0 && principios.every((p) => p.cantidad !== null);
    const c = clasificar({ nombre: g.base, sigla: g.sigla, dcis, concentraciones: legibles ? conc : [] });

    let slug = slugify(`${g.base} ${g.laboratorio}`);
    if (slugs.has(slug)) slug = `${slug}-${g.sigla.toLowerCase()}`;
    slugs.add(slug);

    return {
      ...c,
      alertas: [...alertas, ...c.alertas],
      slug,
      productos: g.productos,
      ean: g.ean,
      nombreComercial: nombreVisible(g.base),
      laboratorio: g.laboratorio,
      sigla: g.sigla,
      principios,
      nota: '',
      comentario: '',
    };
  });
}
