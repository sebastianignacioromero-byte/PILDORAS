/**
 * Construye un enlace interno respetando la base del sitio (p. ej. /PILDORAS/ en GitHub Pages).
 * Todos los enlaces internos deben pasar por aquí.
 */
export function url(ruta: string, base: string = import.meta.env.BASE_URL): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const r = ruta.replace(/^\/+/, '');
  return `${b}${r}`;
}
