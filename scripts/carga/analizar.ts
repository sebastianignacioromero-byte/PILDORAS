// Lee la nomenclatura de productos de Curie: "<nombre y concentración> X <cantidad><sigla> <laboratorio>".
// Ejemplo: "ACICLOVIR 200MG X 24C ML" → base "ACICLOVIR 200MG", 24 unidades, sigla C, laboratorio ML.

export interface ProductoAnalizado {
  base: string;
  cantidadCaja: number;
  sigla: string;
  laboratorio: string;
}

export interface Concentracion {
  cantidad: number;
  unidad: string;
}

const CAJA = /\bX\s*(\d+(?:[.,]\d+)?)\s*([A-Z]+)\b/g;
// Marcas internas del stock que no son laboratorio.
const MARCAS = /\((?:CV|OF\d*|REFRI|BE|GEN)\)/g;

export function analizarProducto(nombre: string): ProductoAnalizado | null {
  const texto = nombre.toUpperCase().replace(/\s+/g, ' ').trim();
  const coincidencias = [...texto.matchAll(CAJA)];
  const ultima = coincidencias.at(-1);
  if (!ultima || ultima.index === undefined) return null;
  const resto = texto.slice(ultima.index + ultima[0].length).replace(MARCAS, ' ').trim();
  const laboratorio = /^\(CEN\)/.test(resto) ? 'CEN' : (resto.match(/^[A-Z]{2,5}\b/)?.[0] ?? '');
  return {
    base: texto.slice(0, ultima.index).trim(),
    cantidadCaja: Number(ultima[1].replace(',', '.')),
    sigla: ultima[2],
    laboratorio,
  };
}

const UNIDADES: Record<string, string> = { MCG: 'mcg', 'µG': 'mcg', UG: 'mcg', MG: 'mg', G: 'g', UI: 'UI', '%': '%' };
const NUM = String.raw`\d+(?:[.,]\d+)*`;
const GRUPO = new RegExp(String.raw`(${NUM}(?:\s*(?:MCG|µG|UG|MG|G|UI))?(?:\s*/\s*${NUM})*)\s*(MCG|µG|UG|MG|G|UI|%)(?![A-Z])`, 'g');

/** "100.000" son miles; "27.5" y "0,5" son decimales. */
function numero(t: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t.replace(',', '.'));
}

/** Concentraciones del nombre, en orden: "50/12,5MG" → 50 mg y 12,5 mg. */
export function leerConcentraciones(texto: string): Concentracion[] {
  const salida: Concentracion[] = [];
  for (const m of texto.toUpperCase().matchAll(GRUPO)) {
    const unidad = UNIDADES[m[2]];
    for (const parte of m[1].split('/')) {
      const n = parte.trim().match(new RegExp(String.raw`^(${NUM})\s*(MCG|µG|UG|MG|G|UI)?$`));
      if (n) salida.push({ cantidad: numero(n[1]), unidad: n[2] ? UNIDADES[n[2]] : unidad });
    }
  }
  return salida;
}
