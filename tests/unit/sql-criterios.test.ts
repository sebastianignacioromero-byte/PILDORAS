import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import criterios from '../../src/datos/ejemplo/criterios.json';

const sql = (archivo: string) => readFileSync(new URL(`../../supabase/${archivo}`, import.meta.url), 'utf8');
const literal = (t: string) => `'${t.replace(/'/g, "''")}'`;

describe('textos de criterios en el SQL', () => {
  it.each(['migracion_criterios.sql', 'schema_partibilidad.sql'])('%s trae los mismos textos que el sitio', (archivo) => {
    const contenido = sql(archivo);
    for (const c of criterios) {
      for (const texto of [c.codigo, c.titulo, c.fundamento, c.explicacion, c.queHacer, c.comoReconocer]) {
        expect(contenido, `${c.codigo}: ${texto}`).toContain(literal(texto));
      }
    }
  });
});
