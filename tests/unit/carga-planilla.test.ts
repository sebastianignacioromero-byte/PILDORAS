import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { agruparFichas } from '../../scripts/carga/agrupar';
import { leerStock } from '../../scripts/carga/leer-stock';
import { escribirLaboratorios, escribirRevision, leerLaboratorios, leerRevision } from '../../scripts/carga/planilla';

const dir = mkdtempSync(join(tmpdir(), 'pildoras-'));
const fichas = agruparFichas([
  { tipo: 'MEDICAMENTO', producto: 'LOSARVIT D 50/12,5MG X 30CR SAV', variante: 'LOSARTAN, HIDROCLOROTIAZIDA', ean: '780' },
  { tipo: 'MEDICAMENTO', producto: 'ACICLOVIR 200MG X 24C ML', variante: 'ACICLOVIR', ean: '781' },
]);

describe('planilla de revisión', () => {
  it('se lee igual que se escribió', async () => {
    const ruta = join(dir, 'revision.xlsx');
    await escribirRevision(fichas, ruta);
    const leidas = await leerRevision(ruta);
    expect(leidas.map((f) => f.ficha)).toEqual(fichas.map(({ alertas, ...f }) => ({ ...f, alertas })));
    expect(leidas[0].fila).toBe(2);
  });
  it('ofrece listas desplegables para criterio y estado', async () => {
    const ruta = join(dir, 'revision-listas.xlsx');
    await escribirRevision(fichas, ruta);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(ruta);
    const hoja = wb.getWorksheet('Fichas')!;
    const encabezados = (hoja.getRow(1).values as string[]).slice(1);
    const col = encabezados.indexOf('Criterio') + 1;
    expect(hoja.getCell(2, col).dataValidation?.type).toBe('list');
  });
});

describe('notas', () => {
  it('separa la nota para el paciente del comentario interno', async () => {
    const ruta = join(dir, 'revision-notas.xlsx');
    await escribirRevision([{ ...fichas[0], nota: 'Parta por la ranura', comentario: 'revisar envase' }], ruta);
    const [r] = await leerRevision(ruta);
    expect(r.ficha).toMatchObject({ nota: 'Parta por la ranura', comentario: 'revisar envase' });
  });
  it('en planillas antiguas, "Nota del QF" se lee como comentario interno y no se publica', async () => {
    const ruta = join(dir, 'revision-antigua.xlsx');
    await escribirRevision(fichas, ruta);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(ruta);
    const hoja = wb.getWorksheet('Fichas')!;
    const enc = (hoja.getRow(1).values as string[]).slice(1);
    const nota = enc.indexOf('Nota para el paciente') + 1;
    hoja.getCell(1, nota).value = 'Nota del QF';
    hoja.getCell(2, nota).value = 'SE IRAN ARREGLANDO';
    hoja.spliceColumns(enc.indexOf('Comentario interno') + 1, 1);
    await wb.xlsx.writeFile(ruta);
    const [r] = await leerRevision(ruta);
    expect(r.ficha).toMatchObject({ nota: '', comentario: 'SE IRAN ARREGLANDO' });
  });
});

describe('planilla de laboratorios', () => {
  it('lista los códigos y lee los nombres completados', async () => {
    const ruta = join(dir, 'laboratorios.xlsx');
    await escribirLaboratorios(fichas, ruta);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(ruta);
    const hoja = wb.worksheets[0];
    hoja.getCell('D2').value = 'Laboratorio Ejemplo';
    await wb.xlsx.writeFile(ruta);
    const labs = await leerLaboratorios(ruta);
    expect([...labs.keys()].sort()).toEqual(['ML', 'SAV']);
    expect([...labs.values()]).toContain('Laboratorio Ejemplo');
  });
});

describe('leerStock', () => {
  it('encuentra la fila de encabezados y lee solo las columnas necesarias', async () => {
    const wb = new ExcelJS.Workbook();
    const h = wb.addWorksheet('Sheet1');
    h.addRow(['Sucursal', 'Casa Matriz']);
    h.addRow([]);
    h.addRow(['Tipo de Producto', 'Producto', 'Variante', 'Código de barras', 'SKU', 'Stock', 'Costo Neto Prom. Unitario']);
    h.addRow(['MEDICAMENTO', 'ACICLOVIR 200MG X 24C ML', 'ACICLOVIR', '7800', '7800', 5, 2829]);
    const ruta = join(dir, 'stock.xlsx');
    await wb.xlsx.writeFile(ruta);
    expect(await leerStock(ruta)).toEqual([{ tipo: 'MEDICAMENTO', producto: 'ACICLOVIR 200MG X 24C ML', variante: 'ACICLOVIR', ean: '7800' }]);
  });
});
