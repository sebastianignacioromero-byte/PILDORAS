// npm run carga:revision -- <stock.xlsx> [carpeta de salida]
// Lee el stock, arma y clasifica las fichas, y escribe revision.xlsx y laboratorios.xlsx.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { agruparFichas } from './agrupar';
import { leerStock } from './leer-stock';
import { escribirLaboratorios, escribirRevision } from './planilla';

const [stock, salida = 'privado'] = process.argv.slice(2);
if (!stock) {
  console.error('Uso: npm run carga:revision -- <stock.xlsx> [carpeta de salida]');
  process.exit(1);
}

const fichas = agruparFichas(await leerStock(stock));
mkdirSync(salida, { recursive: true });
await escribirRevision(fichas, join(salida, 'revision.xlsx'));
await escribirLaboratorios(fichas, join(salida, 'laboratorios.xlsx'));

const contar = (claves: string[]) => Object.entries(claves.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
console.log(`${fichas.length} fichas → ${join(salida, 'revision.xlsx')}`);
console.log('\nPor estado:', Object.fromEntries(contar(fichas.map((f) => f.estado))));
console.log('\nPor criterio:');
for (const [c, n] of contar(fichas.map((f) => f.criterio ?? '(sin criterio)'))) console.log(`  ${c.padEnd(18)} ${n}`);
console.log('\nAlertas:');
for (const [a, n] of contar(fichas.flatMap((f) => f.alertas.map((x) => x.replace(/: .*/, ''))))) console.log(`  ${a.padEnd(28)} ${n}`);
