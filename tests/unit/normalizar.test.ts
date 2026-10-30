import { describe, expect, it } from 'vitest';
import { normalizar } from '../../src/lib/normalizar';

describe('normalizar', () => {
  it('quita tildes, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizar('  Losartán  Potásico ')).toBe('losartan potasico');
  });
  it('funciona con mayúsculas acentuadas', () => {
    expect(normalizar('ÁCIDO ACETILSALICÍLICO')).toBe('acido acetilsalicilico');
  });
  it('convierte la ñ en n', () => {
    expect(normalizar('Ñandú')).toBe('nandu');
  });
  it('acepta texto vacío', () => {
    expect(normalizar('')).toBe('');
  });
});
