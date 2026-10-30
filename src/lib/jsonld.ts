// Datos estructurados (schema.org) para que los buscadores entiendan quién revisa cada página.
import type { Dci, Ficha } from '../tipos';
import { CURIE_NOMBRE, CURIE_URL, QF_NOMBRE } from '../config';
import { concentracion } from './textos';

const revisor = { '@type': 'Person', name: QF_NOMBRE, jobTitle: 'Químico farmacéutico' };
const editor = { '@type': 'Organization', name: CURIE_NOMBRE, url: CURIE_URL };
const dia = (iso: string) => iso.slice(0, 10);

export function jsonldFicha(f: Ficha, canonica: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: `¿Se puede partir ${f.nombreComercial}?`,
    url: canonica,
    inLanguage: 'es-CL',
    lastReviewed: dia(f.revisadoEn),
    reviewedBy: revisor,
    author: revisor,
    publisher: editor,
    about: { '@type': 'Drug', name: f.nombreComercial, activeIngredient: concentracion(f) },
  };
}

export function jsonldDci(d: Dci, canonica: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: `¿Se puede partir ${d.dci}?`,
    url: canonica,
    inLanguage: 'es-CL',
    lastReviewed: dia(d.ultimaRevision),
    reviewedBy: revisor,
    author: revisor,
    publisher: editor,
    about: { '@type': 'Drug', name: d.dci },
  };
}
