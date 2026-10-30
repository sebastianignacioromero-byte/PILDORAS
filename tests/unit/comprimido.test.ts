import { describe, expect, it } from 'vitest';
import { descripcionComprimido, svgComprimido, type OpcionesComprimido } from '../../src/lib/comprimido';
import { VALORES_GEOMETRICA, VALORES_RANURA } from '../../src/tipos';

const base: OpcionesComprimido = { forma: 'redonda', ranura: 'simple', orientacion: 0, formaFarmaceutica: 'comprimido' };
const lineas = (s: string) => (s.match(/data-ranura/g) ?? []).length;

describe('svgComprimido', () => {
  it.each(VALORES_GEOMETRICA.flatMap((forma) => VALORES_RANURA.map((ranura) => [forma, ranura] as const)))(
    'dibuja %s con ranura %s como imagen accesible',
    (forma, ranura) => {
      const s = svgComprimido({ ...base, forma, ranura });
      expect(s).toMatch(/^<svg[^>]*role="img"/);
      expect(s).toMatch(/aria-label="[^"]+"/);
      expect(s).toContain('viewBox="0 0 200 120"');
    },
  );
  it('no dibuja ranura cuando no tiene', () => {
    expect(lineas(svgComprimido({ ...base, ranura: 'sin_ranura' }))).toBe(0);
  });
  it('dibuja una línea para la ranura simple', () => {
    expect(lineas(svgComprimido({ ...base, ranura: 'simple' }))).toBe(1);
  });
  it('dibuja dos líneas para la ranura en cruz', () => {
    expect(lineas(svgComprimido({ ...base, ranura: 'doble_cruz' }))).toBe(2);
  });
  it('dibuja tres líneas para la ranura múltiple', () => {
    expect(lineas(svgComprimido({ ...base, ranura: 'multiple' }))).toBe(3);
  });
  it('dibuja la ranura decorativa punteada', () => {
    expect(svgComprimido({ ...base, ranura: 'solo_decorativa' })).toContain('stroke-dasharray');
  });
  it('rota la ranura según su orientación', () => {
    expect(svgComprimido({ ...base, orientacion: 45 })).toContain('rotate(45');
  });
  it('dibuja las cápsulas como cápsula, sin ranura, cualquiera sea la forma', () => {
    const s = svgComprimido({ ...base, forma: 'triangular', ranura: 'simple', formaFarmaceutica: 'capsula_blanda' });
    expect(s).toContain('data-capsula');
    expect(lineas(s)).toBe(0);
  });
  it('usa ids de recorte únicos por dibujo', () => {
    const a = svgComprimido(base).match(/id="([^"]+)"/)![1];
    const b = svgComprimido(base).match(/id="([^"]+)"/)![1];
    expect(a).not.toBe(b);
  });
});

describe('descripcionComprimido', () => {
  it('describe forma y ranura', () => {
    expect(descripcionComprimido({ ...base, forma: 'oblonga', ranura: 'simple' })).toBe('Comprimido oblongo con ranura simple');
    expect(descripcionComprimido({ ...base, forma: 'redonda', ranura: 'sin_ranura' })).toBe('Comprimido redondo sin ranura');
    expect(descripcionComprimido({ ...base, forma: 'hexagonal', ranura: 'doble_cruz' })).toBe('Comprimido hexagonal con ranura en cruz');
  });
  it('describe las cápsulas como cápsula', () => {
    expect(descripcionComprimido({ ...base, formaFarmaceutica: 'capsula_dura', ranura: 'sin_ranura' })).toBe('Cápsula');
  });
  it('omite la forma cuando es "otra"', () => {
    expect(descripcionComprimido({ ...base, forma: 'otra', ranura: 'sin_ranura' })).toBe('Comprimido sin ranura');
  });
});
