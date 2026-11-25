// Sesión del panel: entrar con correo y contraseña de Supabase y comprobar el rol de administrador.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function crearCliente(url: string, clave: string): SupabaseClient {
  return createClient(url, clave, { auth: { persistSession: true, storageKey: 'pildoras-admin' } });
}

export async function entrar(cliente: SupabaseClient, correo: string, contrasena: string): Promise<string | null> {
  const { error } = await cliente.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
  if (!error) return null;
  return /invalid/i.test(error.message) ? 'Correo o contraseña incorrectos.' : `No se pudo entrar: ${error.message}`;
}

export async function usuarioActual(cliente: SupabaseClient): Promise<{ id: string; correo: string } | null> {
  const { data } = await cliente.auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, correo: u.email ?? '' } : null;
}

export async function esAdmin(cliente: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await cliente.from('perfiles').select('rol').eq('id', id);
  return !error && data?.[0]?.rol === 'admin';
}

export async function salir(cliente: SupabaseClient): Promise<void> {
  await cliente.auth.signOut();
}
