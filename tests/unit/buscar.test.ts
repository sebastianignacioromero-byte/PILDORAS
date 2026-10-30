import { beforeAll, describe, expect, it } from 'vitest';
import { aResultado, crearBuscadorLocal, dcisDeResultados, debeBuscar, type Buscador } from '../../src/lib/buscar';
import { crearBuscadorSupabase } from '../../src/lib/buscar-supabase';
import { ErrorBusqueda } from '../../src/lib/buscar';
import { obtenerFichas, fichasDeDci } from '../../src/lib/datos';

let local: Buscador;
beforeAll(async () => {
  local = crearBuscadorLocal((await obtenerFichas()).map(aResultado));
});

describe('buscador local', () => {
  it('encuentra todas las marcas de una DCI sin importar mayúsculas', async () => {
    const esperadas = (await fichasDeDci('losartan')).map((f) => f.slug).sort();
    expect((await local.buscar('LOSARTAN')).map((r) => r.slug).sort()).toEqual(esperadas);
  });
  it('ignora tildes y espacios extra', async () => {
    const con = (await local.buscar('losartán  ')).map((r) => r.slug);
    const sin = (await local.buscar('losartan')).map((r) => r.slug);
    expect(con).toEqual(sin);
  });
  it('encuentra por marca y la pone primero', async () => {
    const r = await local.buscar('glucoret');
    expect(r.map((x) => x.nombreComercial)).toEqual(['Glucoret 850', 'Glucoret XR 750']);
  });
  it('prioriza la marca que empieza con la consulta sobre la DCI', async () => {
    const r = await local.buscar('losarvit');
    expect(r[0].nombreComercial.startsWith('Losarvit')).toBe(true);
  });
  it('no repite una asociación encontrada por sus dos DCI', async () => {
    const r = await local.buscar('lo');
    expect(r.length).toBeGreaterThan(0);
    expect(new Set(r.map((x) => x.slug)).size).toBe(r.length);
  });
  it('devuelve lista vacía si no hay coincidencias', async () => {
    expect(await local.buscar('xyzxyz')).toEqual([]);
  });
  it('devuelve lista vacía con menos de 2 caracteres', async () => {
    expect(await local.buscar(' l ')).toEqual([]);
  });
});

describe('debeBuscar', () => {
  it('exige al menos 2 caracteres útiles', () => {
    expect(debeBuscar('l')).toBe(false);
    expect(debeBuscar('  l  ')).toBe(false);
    expect(debeBuscar('lo')).toBe(true);
  });
});

describe('dcisDeResultados', () => {
  it('extrae las DCI que coinciden con la consulta, sin repetir', async () => {
    const res = await local.buscar('hidro');
    expect(dcisDeResultados(res, 'hidro').map((d) => d.slug)).toEqual(['hidroclorotiazida']);
  });
  it('no incluye la otra DCI de una asociación', async () => {
    const res = await local.buscar('losartan');
    expect(dcisDeResultados(res, 'losartan').map((d) => d.slug)).toEqual(['losartan']);
  });
});

describe('buscador Supabase', () => {
  const fila = {
    id: 4, slug: 'losarvit-d-4', nombre_comercial: 'Losarvit D', laboratorio: 'Lab', forma_farmaceutica: 'comprimido',
    liberacion: 'inmediata', forma_geometrica: 'capsular', ranura: 'simple', veredicto: 'se_puede_partir', relevancia: 0.8,
    principios: [{ dci: 'Losartán', slug: 'losartan', cantidad: '50.000', unidad: 'mg' }],
  };
  const conFetch = (respuesta: () => Promise<Response>) =>
    crearBuscadorSupabase('https://ejemplo.supabase.co', 'clave-anon', (() => respuesta()) as typeof fetch);

  it('mapea las filas de buscar_medicamentos', async () => {
    const b = conFetch(async () => new Response(JSON.stringify([fila]), { status: 200, headers: { 'content-type': 'application/json' } }));
    const [r] = await b.buscar('losartan');
    expect(r).toMatchObject({ slug: 'losarvit-d-4', nombreComercial: 'Losarvit D', formaGeometrica: 'capsular', veredicto: 'se_puede_partir' });
    expect(r.principios[0]).toEqual({ dci: 'Losartán', slug: 'losartan', cantidad: 50, unidad: 'mg' });
  });
  it('lanza ErrorBusqueda si Supabase responde con error', async () => {
    const b = conFetch(async () => new Response(JSON.stringify({ message: 'caído' }), { status: 500, headers: { 'content-type': 'application/json' } }));
    await expect(b.buscar('losartan')).rejects.toBeInstanceOf(ErrorBusqueda);
  });
  it('lanza ErrorBusqueda si no hay red', async () => {
    const b = conFetch(async () => { throw new TypeError('fetch failed'); });
    await expect(b.buscar('losartan')).rejects.toBeInstanceOf(ErrorBusqueda);
  });
  it('no llama a Supabase con menos de 2 caracteres', async () => {
    let llamadas = 0;
    const b = conFetch(async () => { llamadas++; return new Response('[]'); });
    expect(await b.buscar('l')).toEqual([]);
    expect(llamadas).toBe(0);
  });
});
