import { describe, expect, it } from 'vitest';
import { url } from '../../src/lib/url';

describe('url', () => {
  const base = '/PILDORAS/';
  it('antepone la base a una ruta absoluta', () => {
    expect(url('/dci/losartan/', base)).toBe('/PILDORAS/dci/losartan/');
  });
  it('antepone la base a una ruta relativa', () => {
    expect(url('dci/', base)).toBe('/PILDORAS/dci/');
  });
  it('resuelve la raíz', () => {
    expect(url('/', base)).toBe('/PILDORAS/');
  });
  it('acepta una base sin barra final', () => {
    expect(url('/criterios/', '/PILDORAS')).toBe('/PILDORAS/criterios/');
  });
  it('funciona con base raíz', () => {
    expect(url('/criterios/', '/')).toBe('/criterios/');
  });
});
