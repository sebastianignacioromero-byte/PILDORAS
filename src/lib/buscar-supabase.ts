import { createClient } from '@supabase/supabase-js';
import { debeBuscar, ErrorBusqueda, type Buscador, type ResultadoBusqueda } from './buscar';
import type { Principio } from '../tipos';

/** Búsqueda real: llama a la función buscar_medicamentos de Supabase con la clave anon. */
export function crearBuscadorSupabase(url: string, clave: string, fetchPropio?: typeof fetch): Buscador {
  const cliente = createClient(url, clave, {
    auth: { persistSession: false },
    global: fetchPropio ? { fetch: fetchPropio } : {},
  });
  return {
    async buscar(q) {
      if (!debeBuscar(q)) return [];
      let respuesta;
      try {
        respuesta = await cliente.rpc('buscar_medicamentos', { q: q.trim() });
      } catch (e) {
        throw new ErrorBusqueda(String(e));
      }
      if (respuesta.error) throw new ErrorBusqueda(respuesta.error.message);
      return ((respuesta.data ?? []) as Record<string, any>[]).map(
        (f): ResultadoBusqueda => ({
          slug: f.slug,
          nombreComercial: f.nombre_comercial,
          laboratorio: f.laboratorio,
          principios: (f.principios as Principio[]).map((p) => ({ ...p, cantidad: p.cantidad === null ? null : Number(p.cantidad) })),
          formaGeometrica: f.forma_geometrica,
          ranura: f.ranura,
          formaFarmaceutica: f.forma_farmaceutica,
          veredicto: f.veredicto,
        }),
      );
    },
  };
}
