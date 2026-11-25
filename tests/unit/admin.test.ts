import { describe, expect, it } from 'vitest';
import { aplicarReglaRanura, validarFicha, hayCambios, type FichaEditable } from '../../src/lib/admin/reglas';
import { aPedido, desdeFila, aplicarFiltros, POR_PAGINA } from '../../src/lib/admin/fichas';

const base: FichaEditable = {
  id: 7, slug: 'aciclovir-200mg-ml', nombreComercial: 'Aciclovir 200 mg', laboratorio: 'MINT LAB',
  formaFarmaceutica: 'comprimido', liberacion: 'inmediata', formaGeometrica: 'redonda', ranura: 'sin_ranura',
  ranuraOrientacion: 0, criterio: 'SIN-RANURA-LI', estado: 'publicado', nota: '',
  principios: [{ dci: 'Aciclovir', cantidad: 200, unidad: 'mg' }], formaRevisada: false, editadaEnPanel: false,
};

describe('regla de ranura y criterio', () => {
  it('pasa a RANURA-LI al marcar una ranura funcional en un comprimido simple', () => {
    for (const ranura of ['simple', 'doble_cruz', 'multiple'] as const) {
      expect(aplicarReglaRanura({ ...base, ranura }).criterio).toBe('RANURA-LI');
    }
  });
  it('vuelve a SIN-RANURA-LI sin ranura o con ranura decorativa', () => {
    expect(aplicarReglaRanura({ ...base, criterio: 'RANURA-LI', ranura: 'sin_ranura' }).criterio).toBe('SIN-RANURA-LI');
    expect(aplicarReglaRanura({ ...base, criterio: 'RANURA-LI', ranura: 'solo_decorativa' }).criterio).toBe('SIN-RANURA-LI');
  });
  it('no toca otros criterios', () => {
    expect(aplicarReglaRanura({ ...base, criterio: 'MTE', ranura: 'simple' }).criterio).toBe('MTE');
    expect(aplicarReglaRanura({ ...base, criterio: 'RECUB-ESTETICO', ranura: 'simple' }).criterio).toBe('RECUB-ESTETICO');
  });
  it('no aplica a otras formas farmacéuticas ni liberaciones', () => {
    expect(aplicarReglaRanura({ ...base, formaFarmaceutica: 'comprimido_recubierto', ranura: 'simple' }).criterio).toBe('SIN-RANURA-LI');
    expect(aplicarReglaRanura({ ...base, liberacion: 'prolongada', ranura: 'simple' }).criterio).toBe('SIN-RANURA-LI');
  });
});

describe('validarFicha', () => {
  it('acepta una ficha correcta', () => {
    expect(validarFicha(base)).toEqual([]);
  });
  it('exige nombre, y criterio y principio activo para publicar', () => {
    expect(validarFicha({ ...base, nombreComercial: '  ' })).toContain('Falta el nombre comercial.');
    expect(validarFicha({ ...base, criterio: null })).toContain('Una ficha publicada necesita criterio.');
    expect(validarFicha({ ...base, principios: [] })).toContain('Una ficha publicada necesita al menos un principio activo.');
    expect(validarFicha({ ...base, criterio: null, principios: [], estado: 'borrador' })).toEqual([]);
  });
  it('revisa cada principio activo', () => {
    expect(validarFicha({ ...base, principios: [{ dci: '', cantidad: 1, unidad: 'mg' }] })).toContain('Falta el nombre de un principio activo.');
    expect(validarFicha({ ...base, principios: [{ dci: 'X', cantidad: 0, unidad: 'mg' }] })).toContain('La cantidad de X debe ser mayor que 0.');
    expect(validarFicha({ ...base, principios: [{ dci: 'X', cantidad: 1, unidad: 'mg' }, { dci: 'x ', cantidad: 2, unidad: 'mg' }] }))
      .toContain('El principio activo X está repetido.');
  });
});

describe('hayCambios', () => {
  it('detecta cambios en cualquier campo, incluidos los principios', () => {
    expect(hayCambios(base, { ...base })).toBe(false);
    expect(hayCambios(base, { ...base, ranura: 'simple' })).toBe(true);
    expect(hayCambios(base, { ...base, principios: [{ dci: 'Aciclovir', cantidad: 400, unidad: 'mg' }] })).toBe(true);
  });
});

describe('fichas del panel', () => {
  it('lee una fila de v_admin_fichas', () => {
    const f = desdeFila({
      id: 7, slug: 'aciclovir-200mg-ml', nombre_comercial: 'Aciclovir 200 mg', laboratorio: null, forma_farmaceutica: 'comprimido',
      liberacion: 'inmediata', forma_geometrica: 'redonda', ranura: 'sin_ranura', ranura_orientacion: 0, criterio_codigo: null,
      nota_veredicto: null, estado: 'borrador', forma_revisada: false, editada_en_panel: false,
      principios: [{ dci: 'Aciclovir', slug: 'aciclovir', cantidad: '200.000', unidad: 'mg' }, { dci: 'X', slug: 'x', cantidad: null, unidad: 'mg' }],
    });
    expect(f).toMatchObject({ laboratorio: '', criterio: null, nota: '', estado: 'borrador' });
    expect(f.principios).toEqual([{ dci: 'Aciclovir', cantidad: 200, unidad: 'mg' }, { dci: 'X', cantidad: null, unidad: 'mg' }]);
  });
  it('arma el pedido para guardar_ficha', () => {
    expect(aPedido({ ...base, nota: 'Parta por la ranura' })).toEqual({
      id: 7, nombre_comercial: 'Aciclovir 200 mg', laboratorio: 'MINT LAB', forma_farmaceutica: 'comprimido', liberacion: 'inmediata',
      forma_geometrica: 'redonda', ranura: 'sin_ranura', ranura_orientacion: 0, criterio: 'SIN-RANURA-LI', estado: 'publicado',
      nota: 'Parta por la ranura', principios: [{ dci: 'Aciclovir', cantidad: 200, unidad: 'mg' }],
    });
  });
  it('aplica filtros, búsqueda sin tildes, orden y página', () => {
    const llamadas: unknown[][] = [];
    const q: any = new Proxy({}, { get: (_, m: string) => (...a: unknown[]) => (llamadas.push([m, ...a]), q) });
    aplicarFiltros(q, { soloSinRevisar: true, estado: 'borrador', criterio: 'MTE', laboratorio: 'SAVAL', busqueda: ' Losartán ', pagina: 2 });
    expect(llamadas).toEqual([
      ['eq', 'forma_revisada', false],
      ['eq', 'estado', 'borrador'],
      ['eq', 'criterio_codigo', 'MTE'],
      ['eq', 'laboratorio', 'SAVAL'],
      ['ilike', 'busqueda', '%losartan%'],
      ['order', 'nombre_comercial'],
      ['range', 2 * POR_PAGINA, 3 * POR_PAGINA - 1],
    ]);
  });
  it('omite los filtros vacíos y la búsqueda de 1 carácter', () => {
    const llamadas: unknown[][] = [];
    const q: any = new Proxy({}, { get: (_, m: string) => (...a: unknown[]) => (llamadas.push([m, ...a]), q) });
    aplicarFiltros(q, { soloSinRevisar: false, estado: '', criterio: '', laboratorio: '', busqueda: 'l', pagina: 0 });
    expect(llamadas.map((l) => l[0])).toEqual(['order', 'range']);
  });
});
