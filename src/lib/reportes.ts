// Envío de reportes de error desde la ficha a la tabla "reportes" de Supabase.
// El público solo puede insertar (RLS); nunca leer reportes ajenos.

export class ErrorReporte extends Error {
  constructor(readonly codigo: number) {
    super(`No se pudo enviar el reporte (error ${codigo}).`);
  }
}

export interface Reporte {
  medicamentoSlug: string;
  medicamento: string;
  mensaje: string;
  /** Correo o teléfono para responder; opcional. */
  contacto: string;
}

export function validarReporte(r: Reporte): string | null {
  const mensaje = r.mensaje.trim();
  if (mensaje.length < 5) return 'Cuéntenos en al menos 5 caracteres qué está mal.';
  if (mensaje.length > 1000) return 'El mensaje puede tener hasta 1000 caracteres.';
  if (r.contacto.trim().length > 200) return 'El contacto puede tener hasta 200 caracteres.';
  return null;
}

export async function enviarReporte(r: Reporte, supabase: { url: string; clave: string }, fetchPropio: typeof fetch = fetch): Promise<void> {
  const respuesta = await fetchPropio(`${supabase.url}/rest/v1/reportes`, {
    method: 'POST',
    headers: {
      apikey: supabase.clave,
      // Las claves nuevas (sb_publishable_…) no son JWT: van solo como apikey.
      ...(supabase.clave.startsWith('sb_') ? {} : { Authorization: `Bearer ${supabase.clave}` }),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      medicamento_slug: r.medicamentoSlug,
      medicamento: r.medicamento,
      mensaje: r.mensaje.trim(),
      contacto: r.contacto.trim() || null,
    }),
  });
  if (!respuesta.ok) throw new ErrorReporte(respuesta.status);
}
