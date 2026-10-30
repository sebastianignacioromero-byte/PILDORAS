# Carga masiva desde el stock: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a partir del stock de Curie, generar `revision.xlsx` con una fila por ficha y criterio asignado, y con la planilla revisada generar `carga.sql` para Supabase.

**Architecture:** las funciones puras de `scripts/carga/` (analizar, clasificar, sql) llevan pruebas unitarias. Los comandos `carga:revision` y `carga:sql` las conectan con Excel (exceljs). Los archivos privados van en `privado/`, que está en `.gitignore`.

**Tech Stack:** TypeScript con tsx, exceljs, Vitest y el PostgreSQL 16 local de `supabase/verificar.sh`.

**Spec:** `docs/superpowers/specs/2026-10-30-carga-stock-design.md`

## Global Constraints

- Las siglas, el orden de evaluación y los estados siguen la spec (§4.1–4.4) al pie de la letra.
- Nunca se escriben costos, precios ni márgenes en ningún archivo de salida.
- Nada de `privado/` se sube al repositorio.

## Review Focus

- Nombres con espacios irregulares (`X30 ASC`, `X 16 CDB`) se leen igual que `X 30C`.
- `BDH` (laboratorio) no activa BUCODISPERSABLE; `BD` y `ODT` sí.
- Un fármaco peligroso con sigla C nunca sale como "Se puede partir".
- Repetir el SQL no duplica fichas ni principios activos.
- Una planilla editada con un criterio inexistente se rechaza indicando la fila.

### Task 1: Analizar el nombre del producto
**Files:** `scripts/carga/analizar.ts`, `tests/unit/carga-analizar.test.ts`
**Produces:** `analizarProducto(nombre: string): { base: string; concentracion: string; cantidadCaja: number; sigla: string; laboratorio: string } | null`; `leerConcentraciones(texto: string): { cantidad: number; unidad: string }[]`.
- [ ] Tests con los ejemplos del QF (ACICLOVIR 200MG X 24C ML, AERIUS 5MG X 30CR MSD, ESOMEPRAZOL 20MG X 30CRE OPK, FERRANEM X 30CLP CHE, SUBELAN OR 75MG X 30CLPO, CALCITRIOL 0,5MCG X 30CPB REU, PLANIDEN ODT 10MG X 30CD ABB (OF1), STREPFEN X 16 CDB REC, BETAHISTINA 24MG X30 ASC, ILTUX HCT 40MG/25MG X 28MG TEC) → RED → implementar → GREEN → commit.

### Task 2: Clasificar
**Files:** `scripts/carga/listas.ts`, `scripts/carga/clasificar.ts`, `tests/unit/carga-clasificar.test.ts`
**Produces:** `clasificar(p: { nombre: string; sigla: string; dcis: string[]; concentraciones: {cantidad:number;unidad:string}[] }): { criterio: string | null; formaFarmaceutica; liberacion; formaGeometrica; ranura; estado: 'publicado'|'borrador'; alertas: string[] }`.
- [ ] Tests: cada fila de la tabla §4.1, cada sigla de §4.2, y los conflictos de §8 (peligroso en C, CPRE→ENTERICO, OR gana a CR, levotiroxina mcg → MTE borrador, BDH no es BD, sigla desconocida → borrador sin criterio) → RED → GREEN → commit.

### Task 3: Planilla de revisión desde el stock real
**Files:** `scripts/carga/leer-stock.ts`, `scripts/carga/planilla.ts`, `scripts/carga/revision.ts`, `tests/unit/carga-agrupar.test.ts`
**Produces:** `agruparFichas(filas: FilaStock[]): FichaCarga[]` (clave estable `slug`, DCI limpia o inferida con alerta), `escribirRevision(fichas, ruta)`, `leerRevision(ruta): FichaCarga[]`, comando `npm run carga:revision -- <stock.xlsx>`.
- [ ] Tests de agrupación (cajas distintas → 1 ficha; CORTO VENCIMIENTO excluido; Variante "(BE)" → DCI inferida con alerta) → RED → GREEN.
- [ ] Ejecutar con el stock real → `privado/revision.xlsx`, `privado/laboratorios.xlsx`, resumen por criterio y estado. Commit (sin archivos privados).

### Task 4: SQL
**Files:** `scripts/carga/sql.ts`, `scripts/carga/generar-sql.ts`, `tests/unit/carga-sql.test.ts`, `supabase/verificar.sh`
**Produces:** `validarRevision(fichas, criterios): void` (error con número de fila), `generarSql(fichas, laboratorios, correoRevisor, fecha): string`, comando `npm run carga:sql -- <revision.xlsx> <laboratorios.xlsx> --revisor <correo>`.
- [ ] Tests de validación y de escape de comillas → RED → GREEN.
- [ ] Ejecutar el SQL de una muestra real en Postgres local dos veces: mismas fichas, sin duplicados; revisor inexistente → error antes de escribir. Commit.
