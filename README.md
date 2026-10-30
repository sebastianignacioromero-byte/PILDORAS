# Píldoras

Web informativa para pacientes: ¿se puede partir este comprimido? Un proyecto de Farmacias Curie.

Sitio estático hecho con [Astro](https://astro.build), publicado en GitHub Pages. Los datos vienen de Supabase al construir el sitio; mientras no esté conectado, se usan fichas ficticias de ejemplo.

## Documentación

- Especificación vigente: `docs/superpowers/specs/2026-10-30-pildoras-v1-design.md`
- Dirección visual (C · Blíster): `docs/superpowers/specs/2026-10-30-pildoras-diseno-visual.md` y `docs/diseno/direcciones-de-diseno.html`
- Plan de implementación: `docs/superpowers/plans/2026-10-30-pildoras-v1.md`
- Contexto histórico: `docs/contexto/`

## Trabajar en local

Requiere Node 22.12 o superior.

```bash
npm install
```

```bash
npm run dev
```

El sitio queda en `http://localhost:4321/PILDORAS/`.

```bash
npm test
```

```bash
npm run test:e2e
```

## Variables de entorno

| Variable | Para qué | Valor por defecto |
|---|---|---|
| `DATOS_FUENTE` | `ejemplo` o `supabase` | `ejemplo` |
| `PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | — |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave `anon` (pública, protegida por RLS) | — |
| `SITIO_URL` | Dominio del sitio | `https://sebastianignacioromero-byte.github.io` |
| `SITIO_BASE` | Ruta base | `/PILDORAS` |

Nunca use la clave `service_role` en este repositorio: es público.

## Base de datos (Supabase)

1. Cree un proyecto en Supabase.
2. En el SQL Editor ejecute, en este orden, `supabase/schema_partibilidad.sql`, `supabase/migracion_web_seo.sql` y `supabase/migracion_criterios.sql`. Si ya había ejecutado los dos primeros, basta con el tercero (se puede repetir sin problemas).
3. Regístrese en el sitio de Supabase con su correo y conviértase en administrador: `update perfiles set rol = 'admin' where id = '<su uuid>';`

Para probar el SQL en local (requiere PostgreSQL 16): `supabase/verificar.sh`.

## Publicación

GitHub Actions (`.github/workflows/deploy.yml`) prueba, construye y publica en cada push a `main`, todos los días a las 06:17 UTC y a pedido desde la pestaña *Actions*.

- **Conectar Supabase:** en *Settings → Secrets and variables → Actions → Variables*, cree `DATOS_FUENTE=supabase`, `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.
- **Pasar al subdominio de Curie:** cree `public/CNAME` con el dominio (por ejemplo `pildoras.farmaciascurie.cl`), defina las variables `SITIO_URL=https://pildoras.farmaciascurie.cl` y `SITIO_BASE=/`, y configure el registro CNAME en el DNS de Curie apuntando a `sebastianignacioromero-byte.github.io`.

## Datos editables

Nombre del QF, WhatsApp, web de Curie y correo para reportar errores: `src/config.ts` (los valores marcados `PROVISIONAL` deben confirmarse).

## Carga masiva desde el stock de Curie

Especificación: `docs/superpowers/specs/2026-10-30-carga-stock-design.md`. Los archivos del stock, las planillas y el SQL van en `privado/`, que nunca se sube al repositorio.

1. Generar la planilla de revisión:

   ```bash
   npm run carga:revision -- privado/stock.xlsx
   ```

   Crea `privado/revision.xlsx` (una fila por ficha, con criterio asignado y alertas) y `privado/laboratorios.xlsx` (códigos de laboratorio para completar con su nombre).
2. El QF revisa y corrige ambas planillas en Excel.
3. Generar el SQL:

   ```bash
   npm run carga:sql -- privado/revision.xlsx privado/laboratorios.xlsx --revisor <correo del QF en Supabase>
   ```

4. En el SQL Editor de Supabase: ejecutar una vez `supabase/migracion_carga.sql` y luego `privado/carga.sql`. Se puede repetir con un stock nuevo: actualiza las fichas sin duplicarlas y nunca vuelve a borrador una ficha ya publicada.
