import { describe, expect, it } from 'vitest';
import { crearCargaSupabase } from '../../src/lib/fuente-supabase';

const ficha = {
  id: 1, slug: 'a-1', nombre_comercial: 'A', laboratorio: null, forma_farmaceutica: 'comprimido', liberacion: 'inmediata',
  recubrimiento: false, recubrimiento_funcional: false, forma_geometrica: 'redonda', ranura: 'simple', ranura_orientacion: 0,
  grabado: null, veredicto: 'se_puede_partir', nota_veredicto: null, meta_descripcion: null, revisado_en: '2026-10-28',
  criterio_codigo: 'RANURA-LI', criterio_titulo: 't', criterio_fundamento: 'f', criterio_explicacion: 'e', criterio_que_hacer: 'q',
  principios: [{ dci: 'X', slug: 'x', cantidad: '5.000', unidad: 'mg' }],
};

function fetchFalso(fichas: unknown[], urls: string[]): typeof fetch {
  return (async (entrada: RequestInfo | URL) => {
    const u = String(entrada);
    urls.push(u);
    const cuerpo = u.includes('v_fichas_publicas') ? fichas : [];
    return new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

describe('crearCargaSupabase', () => {
  it('ordena cada consulta paginada para no repetir ni saltar filas', async () => {
    const urls: string[] = [];
    await crearCargaSupabase('https://x.supabase.co', 'clave', fetchFalso([ficha], urls))();
    expect(urls.length).toBe(3);
    for (const u of urls) expect(u).toMatch(/order=/);
  });

  it('se niega a publicar un sitio sin fichas', async () => {
    await expect(crearCargaSupabase('https://x.supabase.co', 'clave', fetchFalso([], []))()).rejects.toThrow(/no devolvió ninguna ficha/);
  });

  it('convierte la cantidad a número', async () => {
    const datos = await crearCargaSupabase('https://x.supabase.co', 'clave', fetchFalso([ficha], []))();
    expect(datos.fichas[0].principios[0].cantidad).toBe(5);
  });
});
