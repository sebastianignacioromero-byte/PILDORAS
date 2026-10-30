// Escribe y lee las planillas que revisa el QF: revision.xlsx (una fila por ficha) y laboratorios.xlsx.
import ExcelJS from 'exceljs';
import criterios from '../../src/datos/ejemplo/criterios.json';
import { VALORES_FORMA, VALORES_GEOMETRICA, VALORES_LIBERACION, VALORES_RANURA } from '../../src/tipos';
import { VEREDICTOS } from '../../src/lib/textos';
import type { FichaCarga, PrincipioCarga } from './agrupar';

const MAX_PRINCIPIOS = 3;
const ESTADOS = ['publicado', 'borrador'];

const COLUMNAS: { titulo: string; ancho: number }[] = [
  { titulo: 'Clave', ancho: 28 },
  { titulo: 'Productos del stock', ancho: 40 },
  { titulo: 'Código de barras', ancho: 16 },
  { titulo: 'Nombre comercial', ancho: 30 },
  { titulo: 'Laboratorio', ancho: 10 },
  { titulo: 'Sigla', ancho: 7 },
  ...Array.from({ length: MAX_PRINCIPIOS }, (_, i) => [
    { titulo: `Principio activo ${i + 1}`, ancho: 24 },
    { titulo: `Cantidad ${i + 1}`, ancho: 10 },
    { titulo: `Unidad ${i + 1}`, ancho: 8 },
  ]).flat(),
  { titulo: 'Forma farmacéutica', ancho: 24 },
  { titulo: 'Liberación', ancho: 16 },
  { titulo: 'Forma geométrica', ancho: 14 },
  { titulo: 'Ranura', ancho: 14 },
  { titulo: 'Criterio', ancho: 18 },
  { titulo: 'Veredicto', ancho: 18 },
  { titulo: 'Estado', ancho: 11 },
  { titulo: 'Nota del QF', ancho: 30 },
  { titulo: 'Alertas', ancho: 40 },
];

/** Listas desplegables: columna de la planilla → valores permitidos. */
const LISTAS: Record<string, readonly string[]> = {
  'Forma farmacéutica': VALORES_FORMA,
  Liberación: VALORES_LIBERACION,
  'Forma geométrica': VALORES_GEOMETRICA,
  Ranura: VALORES_RANURA,
  Criterio: criterios.map((c) => c.codigo),
  Estado: ESTADOS,
};

const veredictoDe = new Map(criterios.map((c) => [c.codigo, VEREDICTOS[c.veredicto as keyof typeof VEREDICTOS].etiqueta]));
const texto = (v: ExcelJS.CellValue) => (v === null || v === undefined ? '' : String(typeof v === 'object' && 'richText' in v ? v.richText.map((r) => r.text).join('') : v).trim());
const letra = (n: number) => String.fromCharCode(64 + n);

export async function escribirRevision(fichas: FichaCarga[], ruta: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Fichas', { views: [{ state: 'frozen', xSplit: 4, ySplit: 1 }] });
  const listas = wb.addWorksheet('Listas', { state: 'hidden' });
  hoja.columns = COLUMNAS.map((c) => ({ header: c.titulo, width: c.ancho }));
  hoja.getRow(1).font = { bold: true };

  const rangos: Record<string, string> = {};
  Object.entries(LISTAS).forEach(([titulo, valores], i) => {
    const c = i + 1;
    listas.getCell(1, c).value = titulo;
    valores.forEach((v, j) => (listas.getCell(j + 2, c).value = v));
    rangos[titulo] = `Listas!$${letra(c)}$2:$${letra(c)}$${valores.length + 1}`;
  });

  for (const f of fichas) {
    const principios = Array.from({ length: MAX_PRINCIPIOS }, (_, i) => f.principios[i]);
    hoja.addRow([
      f.slug,
      f.productos.join('\n'),
      f.ean,
      f.nombreComercial,
      f.laboratorio,
      f.sigla,
      ...principios.flatMap((p) => [p?.dci ?? '', p?.cantidad ?? '', p?.unidad ?? '']),
      f.formaFarmaceutica,
      f.liberacion,
      f.formaGeometrica,
      f.ranura,
      f.criterio ?? '',
      f.criterio ? veredictoDe.get(f.criterio) ?? '' : '',
      f.estado,
      f.nota,
      f.alertas.join('; '),
    ]);
  }

  const columna = (titulo: string) => COLUMNAS.findIndex((c) => c.titulo === titulo) + 1;
  for (let fila = 2; fila <= fichas.length + 1; fila++) {
    for (const titulo of Object.keys(LISTAS)) {
      hoja.getCell(fila, columna(titulo)).dataValidation = {
        type: 'list',
        allowBlank: titulo === 'Criterio',
        formulae: [rangos[titulo]],
        showErrorMessage: true,
        errorTitle: 'Valor no válido',
        error: 'Elija un valor de la lista.',
      };
    }
  }
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };
  await wb.xlsx.writeFile(ruta);
}

export interface FilaRevision {
  fila: number;
  ficha: FichaCarga;
}

export async function leerRevision(ruta: string): Promise<FilaRevision[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const hoja = wb.getWorksheet('Fichas');
  if (!hoja) throw new Error('La planilla no tiene la hoja "Fichas".');
  const indice = new Map<string, number>();
  hoja.getRow(1).eachCell((c, n) => indice.set(texto(c.value), n));
  const faltan = COLUMNAS.filter((c) => !indice.has(c.titulo)).map((c) => c.titulo);
  if (faltan.length) throw new Error(`Faltan columnas en la planilla: ${faltan.join(', ')}`);

  const salida: FilaRevision[] = [];
  hoja.eachRow((r, n) => {
    if (n === 1) return;
    const v = (titulo: string) => texto(r.getCell(indice.get(titulo)!).value);
    if (!v('Clave')) return;
    const principios: PrincipioCarga[] = [];
    for (let i = 1; i <= MAX_PRINCIPIOS; i++) {
      const dci = v(`Principio activo ${i}`);
      if (!dci) continue;
      const cantidad = v(`Cantidad ${i}`);
      principios.push({ dci, cantidad: cantidad === '' ? null : Number(cantidad.replace(',', '.')), unidad: v(`Unidad ${i}`) });
    }
    salida.push({
      fila: n,
      ficha: {
        slug: v('Clave'),
        productos: v('Productos del stock').split('\n').filter(Boolean),
        ean: v('Código de barras'),
        nombreComercial: v('Nombre comercial'),
        laboratorio: v('Laboratorio'),
        sigla: v('Sigla'),
        principios,
        formaFarmaceutica: v('Forma farmacéutica') as FichaCarga['formaFarmaceutica'],
        liberacion: v('Liberación') as FichaCarga['liberacion'],
        formaGeometrica: v('Forma geométrica') as FichaCarga['formaGeometrica'],
        ranura: v('Ranura') as FichaCarga['ranura'],
        criterio: v('Criterio') || null,
        estado: v('Estado') as FichaCarga['estado'],
        nota: v('Nota del QF'),
        alertas: v('Alertas') ? v('Alertas').split('; ') : [],
      },
    });
  });
  return salida;
}

export async function escribirLaboratorios(fichas: FichaCarga[], ruta: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Laboratorios', { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = [
    { header: 'Código', width: 10 },
    { header: 'Fichas', width: 8 },
    { header: 'Ejemplo', width: 40 },
    { header: 'Nombre del laboratorio', width: 36 },
  ];
  hoja.getRow(1).font = { bold: true };
  const porCodigo = new Map<string, FichaCarga[]>();
  for (const f of fichas) if (f.laboratorio) porCodigo.set(f.laboratorio, [...(porCodigo.get(f.laboratorio) ?? []), f]);
  [...porCodigo.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([codigo, lista]) => hoja.addRow([codigo, lista.length, lista[0].productos[0], codigo === 'CEN' ? 'Cenabast' : '']));
  await wb.xlsx.writeFile(ruta);
}

export async function leerLaboratorios(ruta: string): Promise<Map<string, string>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const hoja = wb.worksheets[0];
  const labs = new Map<string, string>();
  hoja.eachRow((r, n) => {
    if (n > 1 && texto(r.getCell(1).value)) labs.set(texto(r.getCell(1).value), texto(r.getCell(4).value));
  });
  return labs;
}
