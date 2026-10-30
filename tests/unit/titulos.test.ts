import { describe, expect, it } from 'vitest';
import { metaDescripcionFicha, tituloDci, tituloFicha } from '../../src/lib/textos';
import { obtenerDcis, obtenerFichas } from '../../src/lib/datos';
import type { Ficha } from '../../src/tipos';

const con = (nombreComercial: string, principios: Ficha['principios']) => ({ nombreComercial, principios }) as Ficha;
const los = (cantidad: number) => ({ dci: 'Losartán', slug: 'losartan', cantidad, unidad: 'mg' });

describe('tituloFicha', () => {
  it('agrega la concentración cuando el nombre no la trae', () => {
    expect(tituloFicha(con('Cozaar', [los(50)]))).toBe('¿Se puede partir Cozaar 50 mg?');
    expect(tituloFicha(con('Cozaar', [los(100)]))).toBe('¿Se puede partir Cozaar 100 mg?');
  });
  it('no repite la concentración si el nombre ya la trae', () => {
    expect(tituloFicha(con('Losarvit 50', [los(50)]))).toBe('¿Se puede partir Losarvit 50?');
    expect(tituloFicha(con('Digoxal 0,25', [{ dci: 'Digoxina', slug: 'digoxina', cantidad: 0.25, unidad: 'mg' }]))).toBe('¿Se puede partir Digoxal 0,25?');
  });
  it('arma la concentración de una asociación', () => {
    expect(tituloFicha(con('Hyzaar', [los(50), { dci: 'Hidroclorotiazida', slug: 'h', cantidad: 12.5, unidad: 'mg' }]))).toBe('¿Se puede partir Hyzaar 50/12,5 mg?');
  });
  it('no confunde 5 con 50', () => {
    expect(tituloFicha(con('Marca 50', [los(5)]))).toBe('¿Se puede partir Marca 50 5 mg?');
  });
  it('da títulos únicos a todas las fichas de ejemplo', async () => {
    const t = (await obtenerFichas()).map(tituloFicha);
    expect(new Set(t).size).toBe(t.length);
  });
});

describe('metaDescripcionFicha', () => {
  it('es única para cada ficha de ejemplo', async () => {
    const d = (await obtenerFichas()).map(metaDescripcionFicha);
    expect(new Set(d).size).toBe(d.length);
  });
  it('usa la meta descripción editorial si existe', async () => {
    const [f] = await obtenerFichas();
    expect(metaDescripcionFicha({ ...f, metaDescripcion: 'Texto del QF' })).toBe('Texto del QF');
  });
});

describe('tituloDci', () => {
  it('es correcto para DCI femeninas y masculinas', async () => {
    const dcis = await obtenerDcis();
    const met = dcis.find((d) => d.slug === 'metformina')!;
    expect(tituloDci(met)).toBe('Metformina: ¿se puede partir?');
    for (const d of dcis) expect(tituloDci(d)).not.toMatch(/\bel [a-záéíóú]*a\?/i);
  });
});
