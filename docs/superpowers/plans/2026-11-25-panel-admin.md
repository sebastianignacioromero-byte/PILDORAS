# Panel de administración: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** página `/admin/` para que el QF edite fichas (forma, ranura, criterio, estado, datos y principios activos) directamente en Supabase.

**Architecture:** página estática de Astro con un script de navegador que usa supabase-js para la sesión, la lectura de `v_admin_fichas` y el guardado por la función `guardar_ficha` (transaccional, solo admin). La lógica pura (reglas, armado del pedido, formas predefinidas, dibujo) tiene pruebas unitarias; el SQL se prueba en el PostgreSQL local; la interfaz, en Playwright con Supabase simulado mediante `page.route`.

**Spec:** `docs/superpowers/specs/2026-11-25-panel-admin-design.md`

## Global Constraints

- El panel nunca guarda una clave distinta de la pública. Toda escritura pasa por `guardar_ficha`, que exige `es_admin()`.
- `/admin/` lleva `noindex`, no aparece en el sitemap y no tiene enlaces desde el sitio.
- Textos en español, trato de "usted". Mismo diseño (C · Blíster).

## Review Focus

- Un usuario sin rol admin no puede guardar aunque manipule el navegador (lo frena la función en la base).
- Cambiar de ficha con cambios sin guardar pide confirmación.
- Un error de validación en la base no deja la ficha a medio guardar.
- Una carga del stock posterior no toca fichas editadas en el panel.
- Las 3 ranuras paralelas dividen el rectángulo en 4 partes iguales.

### Task 1: Dibujo y formas predefinidas
`src/lib/comprimido.ts` (ranura `multiple` en cuartos de la silueta), `src/lib/formas-predefinidas.ts`; tests en `tests/unit/comprimido.test.ts` y `tests/unit/formas-predefinidas.test.ts`.

### Task 2: Base de datos
`supabase/migracion_panel.sql` (columnas `forma_revisada`, `editada_en_panel`, vista `v_admin_fichas`, función `guardar_ficha`); `supabase/verificar.sh` simula usuarios con `auth.uid()` configurable y prueba admin, no admin y rollback.

### Task 3: Carga respeta el panel
`scripts/carga/sql.ts`: no actualiza fichas con `editada_en_panel` ni reemplaza sus principios; test unitario y verificación en PostgreSQL.

### Task 4: Lógica del panel
`src/lib/admin/reglas.ts` (regla ranura↔criterio, validación), `src/lib/admin/fichas.ts` (pedido a `guardar_ficha`, filtros de lista); tests unitarios.

### Task 5: Interfaz
`src/pages/admin/index.astro`, `src/components/admin/*`, `src/lib/admin/sesion.ts`; tests Playwright `tests/e2e/admin.spec.ts` con Supabase simulado.

### Task 6: Publicación y entrega
Cron cada hora en `.github/workflows/deploy.yml`, README, SQL para el QF (migración + marcarse admin), publicar.
