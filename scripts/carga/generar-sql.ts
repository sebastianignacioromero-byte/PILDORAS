// npm run carga:sql -- <revision.xlsx> <laboratorios.xlsx> --revisor <correo> [salida.sql]
// Valida la planilla revisada por el QF y escribe el SQL para el SQL Editor de Supabase.
import { writeFileSync } from 'node:fs';
import { leerLaboratorios, leerRevision } from './planilla';
import { generarSql, validarRevision } from './sql';

const args = process.argv.slice(2);
const i = args.indexOf('--revisor');
const revisor = i >= 0 ? args[i + 1] : '';
const [revision, laboratorios, salida = 'privado/carga.sql'] = args.filter((_, j) => j !== i && j !== i + 1);
if (!revision || !laboratorios || !revisor) {
  console.error('Uso: npm run carga:sql -- <revision.xlsx> <laboratorios.xlsx> --revisor <correo> [salida.sql]');
  process.exit(1);
}

const filas = await leerRevision(revision);
try {
  validarRevision(filas);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
const fichas = filas.map((f) => f.ficha);
const fecha = new Date().toISOString().slice(0, 10);
writeFileSync(salida, generarSql(fichas, await leerLaboratorios(laboratorios), revisor, fecha));
const publicadas = fichas.filter((f) => f.estado === 'publicado').length;
console.log(`${salida}: ${fichas.length} fichas (${publicadas} publicadas, ${fichas.length - publicadas} en borrador).`);
