import { describe, expect, it } from 'vitest';
import { concentracion, tituloFicha } from '../../src/lib/textos';
import type { Ficha } from '../../src/tipos';

const sinDosis = { nombreComercial: 'Vesnidan', principios: [
  { dci: 'Diosmina', slug: 'diosmina', cantidad: null, unidad: 'mg' },
  { dci: 'Hesperidina', slug: 'hesperidina', cantidad: null, unidad: 'mg' },
] } as unknown as Ficha;

describe('fichas sin concentración', () => {
  it('muestran solo los principios activos', () => {
    expect(concentracion(sinDosis)).toBe('Diosmina + Hesperidina');
  });
  it('no agregan concentración al título', () => {
    expect(tituloFicha(sinDosis)).toBe('¿Se puede partir Vesnidan?');
  });
});
