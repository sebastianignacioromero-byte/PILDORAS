import { describe, expect, it } from 'vitest';
import { crearFuente, obtenerCriterios, obtenerDcis, obtenerFichas, fichasDeCriterio, fichasDeDci } from '../../src/lib/datos';

describe('datos de ejemplo', () => {
  it('cubren los 3 veredictos, ≥6 formas, las 5 ranuras y una cápsula', async () => {
    const fichas = await obtenerFichas();
    expect(new Set(fichas.map((f) => f.veredicto)).size).toBe(3);
    expect(new Set(fichas.map((f) => f.formaGeometrica)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(fichas.map((f) => f.ranura)).size).toBe(5);
    expect(fichas.some((f) => f.formaFarmaceutica.startsWith('capsula'))).toBe(true);
  });

  it('completan el criterio de cada ficha', async () => {
    const [f] = await obtenerFichas();
    expect(f.criterioTitulo).toBeTruthy();
    expect(f.criterioFundamento).toBeTruthy();
    expect(f.principios[0].dci).toBeTruthy();
  });

  it('una DCI reúne ≥3 marcas, incluida la asociación, sin duplicados', async () => {
    const fichas = await fichasDeDci('losartan');
    expect(fichas.length).toBeGreaterThanOrEqual(3);
    expect(fichas.some((f) => f.principios.length > 1)).toBe(true);
    expect(new Set(fichas.map((f) => f.slug)).size).toBe(fichas.length);
  });

  it('la asociación aparece también en la página de su segunda DCI', async () => {
    const fichas = await fichasDeDci('hidroclorotiazida');
    expect(fichas.some((f) => f.principios.some((p) => p.slug === 'losartan'))).toBe(true);
  });

  it('calcula los conteos por veredicto de cada DCI', async () => {
    const dcis = await obtenerDcis();
    const los = dcis.find((d) => d.slug === 'losartan')!;
    const fichas = await fichasDeDci('losartan');
    expect(los.nSePuede + los.nNoDebe + los.nNoPuede).toBe(fichas.length);
    expect(los.ultimaRevision).toBeTruthy();
  });

  it('solo publica DCI con al menos una marca', async () => {
    const dcis = await obtenerDcis();
    for (const d of dcis) expect((await fichasDeDci(d.slug)).length).toBeGreaterThan(0);
  });

  it('entrega los 12 criterios y las fichas de cada uno', async () => {
    expect(await obtenerCriterios()).toHaveLength(12);
    expect((await fichasDeCriterio('RANURA-LI')).length).toBeGreaterThan(0);
  });

  it('falla con mensaje claro si se pide Supabase sin variables', () => {
    expect(() => crearFuente({ DATOS_FUENTE: 'supabase' })).toThrow('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY');
  });
});
