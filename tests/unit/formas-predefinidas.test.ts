import { describe, expect, it } from 'vitest';
import { FORMAS_PREDEFINIDAS } from '../../src/lib/formas-predefinidas';
import { VALORES_GEOMETRICA, VALORES_RANURA } from '../../src/tipos';

describe('formas predefinidas', () => {
  it('son las 7 aprobadas por el QF, en orden', () => {
    expect(FORMAS_PREDEFINIDAS.map((f) => [f.numero, f.forma, f.ranura])).toEqual([
      [1, 'redonda', 'sin_ranura'],
      [2, 'redonda', 'simple'],
      [3, 'redonda', 'doble_cruz'],
      [4, 'cuadrada', 'sin_ranura'],
      [5, 'cuadrada', 'simple'],
      [6, 'cuadrada', 'doble_cruz'],
      [7, 'rectangular', 'multiple'],
    ]);
  });
  it('usan valores válidos y orientación 0', () => {
    for (const f of FORMAS_PREDEFINIDAS) {
      expect(VALORES_GEOMETRICA).toContain(f.forma);
      expect(VALORES_RANURA).toContain(f.ranura);
      expect(f.orientacion).toBe(0);
      expect(f.nombre).toBeTruthy();
    }
  });
});
