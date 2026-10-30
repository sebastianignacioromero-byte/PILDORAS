/** Pasa un texto a minúsculas, sin tildes y con espacios simples, para comparar búsquedas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
