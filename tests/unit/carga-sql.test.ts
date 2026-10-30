import { describe, expect, it } from 'vitest';
import { agruparFichas } from '../../scripts/carga/agrupar';
import { generarSql, validarRevision } from '../../scripts/carga/sql';

const fichas = agruparFichas([
  { tipo: 'MEDICAMENTO', producto: "D'ANGELO 10MG X 30C ML", variante: 'ACICLOVIR', ean: '1' },
  { tipo: 'MEDICAMENTO', producto: 'ESOMEPRAZOL 20MG X 30CRE OPK', variante: 'ESOMEPRAZOL', ean: '2' },
]);
const filas = fichas.map((ficha, i) => ({ fila: i + 2, ficha }));

describe('validarRevision', () => {
  it('acepta la planilla tal como sale del stock', () => {
    expect(() => validarRevision(filas)).not.toThrow();
  });
  it('rechaza un criterio inexistente indicando la fila', () => {
    const mala = [{ fila: 7, ficha: { ...fichas[0], criterio: 'INVENTADO' } }];
    expect(() => validarRevision(mala)).toThrow(/Fila 7.*INVENTADO/);
  });
  it('rechaza publicar una ficha sin criterio o sin principio activo', () => {
    expect(() => validarRevision([{ fila: 3, ficha: { ...fichas[0], criterio: null, estado: 'publicado' } }])).toThrow(/Fila 3/);
    expect(() => validarRevision([{ fila: 4, ficha: { ...fichas[0], principios: [], estado: 'publicado' } }])).toThrow(/Fila 4/);
  });
  it('rechaza valores fuera de las listas y cantidades no numéricas', () => {
    expect(() => validarRevision([{ fila: 5, ficha: { ...fichas[0], ranura: 'rara' as never } }])).toThrow(/Fila 5.*ranura/i);
    expect(() => validarRevision([{ fila: 6, ficha: { ...fichas[0], principios: [{ dci: 'X', cantidad: Number.NaN, unidad: 'mg' }] } }])).toThrow(/Fila 6/);
  });
  it('rechaza claves repetidas', () => {
    expect(() => validarRevision([filas[0], { ...filas[0], fila: 9 }])).toThrow(/Fila 9.*repetida/);
  });
  it('junta todos los errores en un solo mensaje', () => {
    expect(() => validarRevision([
      { fila: 2, ficha: { ...fichas[0], criterio: 'X' } },
      { fila: 3, ficha: { ...fichas[1], estado: 'otro' as never } },
    ])).toThrow(/Fila 2[\s\S]*Fila 3/);
  });
});

describe('generarSql', () => {
  const sql = generarSql(fichas, new Map([['ML', 'Laboratorio Chile'], ['OPK', '']]), 'qf@ejemplo.cl', '2026-10-30');
  it('corre en una transacción y verifica al revisor antes de escribir', () => {
    expect(sql.trimStart()).toMatch(/^--[\s\S]*begin;/);
    expect(sql.indexOf("email = 'qf@ejemplo.cl'")).toBeLessThan(sql.indexOf('insert into public.medicamentos'));
    expect(sql.trimEnd()).toMatch(/commit;$/);
  });
  it('escapa las comillas simples', () => {
    expect(sql).toContain("'D''angelo 10 mg'");
  });
  it('usa el nombre del laboratorio cuando existe y vacío si no', () => {
    expect(sql).toContain("'Laboratorio Chile'");
    expect(sql).not.toContain("'OPK'");
  });
  it('no despublica fichas que el QF ya publicó', () => {
    expect(sql).toMatch(/when public\.medicamentos\.estado = 'publicado' then 'publicado'/);
  });
});
