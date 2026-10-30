import { describe, expect, it } from 'vitest';
import { validarFichas } from '../../src/lib/validar';
import type { Criterio, Ficha } from '../../src/tipos';

const criterios: Criterio[] = [
  { codigo: 'RANURA-LI', titulo: 'Ranurado', fundamento: 'x', veredicto: 'se_puede_partir', explicacion: 'x', queHacer: 'x', comoReconocer: 'x' },
  { codigo: 'LIB-PROLONGADA', titulo: 'LP', fundamento: 'x', veredicto: 'no_debe_partir', explicacion: 'x', queHacer: 'x', comoReconocer: 'x' },
];

function ficha(extra: Partial<Ficha> = {}): Ficha {
  return {
    id: 1, slug: 'losarvit-50', nombreComercial: 'Losarvit 50', laboratorio: 'Lab', formaFarmaceutica: 'comprimido',
    liberacion: 'inmediata', recubrimiento: false, recubrimientoFuncional: false, formaGeometrica: 'oblonga',
    ranura: 'simple', ranuraOrientacion: 0, grabado: null, veredicto: 'se_puede_partir', notaVeredicto: null,
    metaDescripcion: null, revisadoEn: '2026-10-28', criterioCodigo: 'RANURA-LI', criterioTitulo: 'Ranurado',
    criterioFundamento: 'x', criterioExplicacion: 'x', criterioQueHacer: 'x', principios: [], ...extra,
  };
}

describe('validarFichas', () => {
  it('acepta fichas correctas', () => {
    expect(() => validarFichas([ficha()], criterios)).not.toThrow();
  });
  it('rechaza un veredicto distinto al de su criterio y nombra la ficha', () => {
    expect(() => validarFichas([ficha({ slug: 'mala-1', veredicto: 'no_debe_partir' })], criterios)).toThrow(/mala-1/);
  });
  it('rechaza slugs repetidos', () => {
    expect(() => validarFichas([ficha(), ficha({ id: 2 })], criterios)).toThrow(/slug repetido/);
  });
  it('rechaza una ficha sin fecha de revisión', () => {
    expect(() => validarFichas([ficha({ revisadoEn: '' })], criterios)).toThrow(/losarvit-50/);
  });
  it('rechaza una ficha sin veredicto', () => {
    expect(() => validarFichas([ficha({ veredicto: undefined as never })], criterios)).toThrow(/losarvit-50/);
  });
  it('rechaza un criterio inexistente', () => {
    expect(() => validarFichas([ficha({ criterioCodigo: 'NO-EXISTE' })], criterios)).toThrow(/NO-EXISTE/);
  });
});
