import type { Criterio, DciBase, Ficha } from '../tipos';
import type { DatosCrudos } from './datos';
import criteriosJson from '../datos/ejemplo/criterios.json';
import dcisJson from '../datos/ejemplo/dcis.json';
import fichasJson from '../datos/ejemplo/fichas.json';

type FichaEjemplo = Omit<Ficha, 'criterioTitulo' | 'criterioFundamento' | 'criterioExplicacion' | 'criterioQueHacer' | 'principios'> & {
  principios: { slug: string; cantidad: number; unidad: string }[];
};

/** Lee las fichas ficticias de src/datos/ejemplo y completa criterio y nombre de cada DCI. */
export async function cargarEjemplo(): Promise<DatosCrudos> {
  const criterios = criteriosJson as Criterio[];
  const dcis = dcisJson as DciBase[];
  const criterio = new Map(criterios.map((c) => [c.codigo, c]));
  const nombreDci = new Map(dcis.map((d) => [d.slug, d.dci]));
  const fichas = (fichasJson as FichaEjemplo[]).map((f) => ({
    ...f,
    criterioTitulo: criterio.get(f.criterioCodigo)?.titulo ?? '',
    criterioFundamento: criterio.get(f.criterioCodigo)?.fundamento ?? '',
    criterioExplicacion: criterio.get(f.criterioCodigo)?.explicacion ?? '',
    criterioQueHacer: criterio.get(f.criterioCodigo)?.queHacer ?? '',
    principios: f.principios.map((p) => ({ ...p, dci: nombreDci.get(p.slug) ?? p.slug })),
  }));
  return { fichas, dcis, criterios };
}
