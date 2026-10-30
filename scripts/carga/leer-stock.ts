// Lee el stock exportado por el sistema de Curie. Solo toma las columnas que necesita:
// costos, precios y márgenes se descartan aquí y no llegan a ningún archivo de salida.
import ExcelJS from 'exceljs';
import type { FilaStock } from './agrupar';

const texto = (v: ExcelJS.CellValue) => (v === null || v === undefined ? '' : String(v).trim());

export async function leerStock(ruta: string): Promise<FilaStock[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const hoja = wb.worksheets[0];
  let encabezado = 0;
  const col: Record<string, number> = {};
  hoja.eachRow((fila, n) => {
    if (encabezado) return;
    const valores = (fila.values as ExcelJS.CellValue[]).map(texto);
    if (valores.includes('Producto') && valores.includes('Tipo de Producto')) {
      encabezado = n;
      valores.forEach((v, i) => (col[v] = i));
    }
  });
  if (!encabezado) throw new Error('No encontré la fila de encabezados (Tipo de Producto, Producto…) en el stock.');
  const filas: FilaStock[] = [];
  hoja.eachRow((fila, n) => {
    if (n <= encabezado) return;
    const v = (nombre: string) => texto(fila.getCell(col[nombre]).value);
    if (!v('Producto')) return;
    filas.push({ tipo: v('Tipo de Producto'), producto: v('Producto'), variante: v('Variante'), ean: v('Código de barras') });
  });
  return filas;
}
