import { describe, expect, it } from 'vitest';
import { enviarReporte, validarReporte } from '../../src/lib/reportes';

const base = { medicamentoSlug: 'losartan-100mg-asc', medicamento: 'Losartan 100 mg', mensaje: 'La ranura no coincide', contacto: '' };

describe('validarReporte', () => {
  it('acepta un reporte completo', () => {
    expect(validarReporte(base)).toBeNull();
  });
  it('pide al menos 5 caracteres en el mensaje', () => {
    expect(validarReporte({ ...base, mensaje: '  no ' })).toBe('Cuéntenos en al menos 5 caracteres qué está mal.');
  });
  it('limita el largo del mensaje y del contacto', () => {
    expect(validarReporte({ ...base, mensaje: 'x'.repeat(1001) })).toMatch(/1000/);
    expect(validarReporte({ ...base, contacto: 'x'.repeat(201) })).toMatch(/200/);
  });
});

describe('enviarReporte', () => {
  it('inserta en la tabla reportes con la clave pública y sin pedir el registro de vuelta', async () => {
    let pedido: { url: string; init: RequestInit } | undefined;
    const fetchFalso = (async (url: string, init: RequestInit) => {
      pedido = { url, init };
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;
    await enviarReporte({ ...base, contacto: ' 912345678 ' }, { url: 'https://x.supabase.co', clave: 'pub' }, fetchFalso);
    expect(pedido!.url).toBe('https://x.supabase.co/rest/v1/reportes');
    const h = pedido!.init.headers as Record<string, string>;
    expect(h.apikey).toBe('pub');
    expect(h.Prefer).toBe('return=minimal');
    expect(JSON.parse(pedido!.init.body as string)).toEqual({
      medicamento_slug: 'losartan-100mg-asc', medicamento: 'Losartan 100 mg', mensaje: 'La ranura no coincide', contacto: '912345678',
    });
  });
  it('con una clave publishable no la envía como Authorization', async () => {
    let h: Record<string, string> = {};
    const fetchFalso = (async (_: string, init: RequestInit) => ((h = init.headers as Record<string, string>), new Response(null, { status: 201 }))) as unknown as typeof fetch;
    await enviarReporte(base, { url: 'https://x.supabase.co', clave: 'sb_publishable_abc' }, fetchFalso);
    expect(h.apikey).toBe('sb_publishable_abc');
    expect(h.Authorization).toBeUndefined();
  });
  it('envía contacto nulo si viene vacío', async () => {
    let cuerpo = '';
    const fetchFalso = (async (_: string, init: RequestInit) => ((cuerpo = init.body as string), new Response(null, { status: 201 }))) as unknown as typeof fetch;
    await enviarReporte(base, { url: 'https://x.supabase.co', clave: 'pub' }, fetchFalso);
    expect(JSON.parse(cuerpo).contacto).toBeNull();
  });
  it('lanza un error si Supabase rechaza el reporte o no hay red', async () => {
    const rechaza = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    await expect(enviarReporte(base, { url: 'https://x', clave: 'k' }, rechaza)).rejects.toThrow();
    const sinRed = (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    await expect(enviarReporte(base, { url: 'https://x', clave: 'k' }, sinRed)).rejects.toThrow();
  });
});
