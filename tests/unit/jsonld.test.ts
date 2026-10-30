import { describe, expect, it } from 'vitest';
import { jsonldDci, jsonldFicha } from '../../src/lib/jsonld';
import { obtenerDcis, obtenerFichas } from '../../src/lib/datos';

describe('jsonld', () => {
  it('describe la ficha como MedicalWebPage revisada por el QF', async () => {
    const [f] = await obtenerFichas();
    const j = jsonldFicha(f, 'https://ejemplo.cl/medicamentos/x/') as Record<string, any>;
    expect(j['@context']).toBe('https://schema.org');
    expect(j['@type']).toBe('MedicalWebPage');
    expect(j.url).toBe('https://ejemplo.cl/medicamentos/x/');
    expect(j.lastReviewed).toBe(f.revisadoEn.slice(0, 10));
    expect(j.reviewedBy['@type']).toBe('Person');
    expect(j.publisher).toMatchObject({ '@type': 'Organization', name: 'Farmacias Curie' });
    expect(j.name).toContain(f.nombreComercial);
  });
  it('describe la DCI con su fecha de última revisión', async () => {
    const [d] = await obtenerDcis();
    const j = jsonldDci(d, 'https://ejemplo.cl/dci/x/') as Record<string, any>;
    expect(j['@type']).toBe('MedicalWebPage');
    expect(j.lastReviewed).toBe(d.ultimaRevision.slice(0, 10));
    expect(j.about).toMatchObject({ '@type': 'Drug', name: d.dci });
  });
});
