import { describe, expect, it } from 'vitest';
import {
  VALORES_FORMA, VALORES_GEOMETRICA, VALORES_LIBERACION, VALORES_RANURA, VALORES_VEREDICTO,
} from '../../src/tipos';
import {
  ETIQUETA_FORMA, ETIQUETA_GEOMETRICA, ETIQUETA_LIBERACION, ETIQUETA_RANURA, VEREDICTOS, concentracion,
} from '../../src/lib/textos';
import type { Ficha } from '../../src/tipos';

describe('textos', () => {
  it.each([
    ['forma', VALORES_FORMA, ETIQUETA_FORMA],
    ['geométrica', VALORES_GEOMETRICA, ETIQUETA_GEOMETRICA],
    ['liberación', VALORES_LIBERACION, ETIQUETA_LIBERACION],
    ['ranura', VALORES_RANURA, ETIQUETA_RANURA],
  ] as const)('todo valor de %s tiene etiqueta', (_n, valores, etiquetas) => {
    for (const v of valores) expect((etiquetas as Record<string, string>)[v]).toBeTruthy();
  });

  it('incluye la liberación osmótica', () => {
    expect(ETIQUETA_LIBERACION.osmotica).toBe('Osmótica');
  });

  it('define sello, etiqueta, color e ícono de cada veredicto', () => {
    for (const v of VALORES_VEREDICTO) {
      expect(VEREDICTOS[v].sello).toBeTruthy();
      expect(VEREDICTOS[v].etiqueta).toBeTruthy();
    }
    expect(VEREDICTOS.se_puede_partir).toMatchObject({ sello: 'Sí, se puede partir', etiqueta: 'Se puede partir', color: '#157a55', icono: 'ok' });
    expect(VEREDICTOS.no_debe_partir).toMatchObject({ sello: 'No se debe partir', etiqueta: 'No se debe partir', color: '#c42c2c', icono: 'alerta' });
    expect(VEREDICTOS.no_puede_partir).toMatchObject({ sello: 'No se puede partir', etiqueta: 'No se puede partir', color: '#4a5b63', icono: 'tachado' });
  });

  it('arma la concentración de una asociación con coma decimal', () => {
    const f = {
      principios: [
        { dci: 'Losartán', slug: 'losartan', cantidad: 50, unidad: 'mg' },
        { dci: 'Hidroclorotiazida', slug: 'hidroclorotiazida', cantidad: 12.5, unidad: 'mg' },
      ],
    } as Ficha;
    expect(concentracion(f)).toBe('Losartán 50 mg + Hidroclorotiazida 12,5 mg');
  });
});
