# Proyecto: Web informativa de partibilidad de comprimidos (Chile)

> **Nota (30-10-2026):** documento histórico. Los veredictos vigentes son `se_puede_partir`, `no_debe_partir` y `no_puede_partir`, y el SQL vive ahora en `supabase/`. Lo vigente está en `docs/superpowers/specs/2026-10-30-pildoras-v1-design.md`.

Documento de traspaso para continuar el desarrollo en Claude Code.

## 1. Contexto

- **Autor / responsable clínico:** Seba, Químico Farmacéutico (QF) en Farmacias Curie (Viña del Mar / Valparaíso, Chile). Redacta y aprueba todos los veredictos.
- **Objetivo:** sitio web informativo para pacientes que indica, por medicamento, la forma del comprimido, si tiene ranura y **si se puede o no partir**, con el fundamento estandarizado.
- **Naturaleza:** herramienta informativa de apoyo, no prescriptiva. No reemplaza al profesional de salud.
- **Sin fines de lucro directos.** Se descartaron anuncios, suscripciones, B2B y auspicios. El beneficio esperado es **tráfico orgánico hacia Farmacias Curie** (marca, enlaces, contacto farmacéutico).
- **Tono de trabajo:** respuestas técnicas/clínicas en español, tratamiento de "usted".

## 2. Decisiones tomadas (vigentes)

| Tema | Decisión |
|---|---|
| Público | Pacientes |
| Plataforma inicial | **Web estática** (no app en tiendas por ahora; PWA posible a futuro) |
| Hosting | **GitHub Pages**, luego asociado a un **subdominio de Farmacias Curie** (ej. `partir.farmaciascurie.cl`) con CNAME |
| Framework | **Astro** (generación estática). Next.js en modo servidor/ISR descartado por incompatibilidad con Pages |
| Backend | **Supabase** (Postgres + Auth + RLS). El autor ya lo conoce |
| Datos en la web | Se consultan **en tiempo de build** (GitHub Actions) y se generan páginas HTML estáticas |
| Búsqueda | En el navegador, con `supabase-js` (clave `anon`) llamando a la función `buscar_medicamentos(q)`; por nombre comercial y por DCI, sin tildes y tolerante a errores |
| Fundamento del veredicto | **Estandarizado**: cada ficha usa un criterio codificado (tabla `criterios_particion`) + nota opcional. No se respalda con folleto por ahora |
| Imágenes | **Sin fotografías**. Ícono digital ilustrativo por forma |
| Aportes de usuarios | Etapa posterior. El usuario propone datos; **solo el admin (Seba) asigna veredicto y publica** |

## 3. Alcance

### Versión 1 (incluida)
- Forma geométrica del comprimido (redonda, ovalada, oblonga, capsular, etc.).
- Tipo de ranura (sin ranura, simple, doble/cruz, múltiple, solo decorativa).
- Forma farmacéutica y tipo de liberación (inmediata, prolongada, modificada, retardada, gastrorresistente, bucodispersable, sublingual, efervescente, masticable). Incluye todos los tipos.
- Veredicto: `partible` / `condicional` / `no_partible` + criterio fundamentado.
- Búsqueda por nombre comercial y DCI.
- Dibujo SVG **ilustrativo, de tamaño uniforme**, con la ranura marcada. Rotular: "Representación ilustrativa, no a escala".

### Futuro (explícitamente fuera de la v1)
- **Tamaños / dimensiones en mm** (se consideran complejos) y dibujo a escala real.
- App en App Store / Play Store.
- Escaneo de código de barras, búsqueda por imagen.
- Aportes de usuarios (puede iniciar con un formulario simple antes de usar login).

## 4. Archivos ya generados (copiar al repositorio)

1. `schema_partibilidad.sql`: esquema base. Ejecutar primero en el SQL Editor de Supabase.
2. `migracion_web_seo.sql`: ejecutar después. Agrega slugs, campos editoriales y vistas públicas.

### Modelo de datos (resumen)
- `perfiles` (rol `usuario`/`admin`), creado por trigger al registrarse; función `es_admin()`.
- `principios_activos`: `dci`, `dci_norm` (generada, sin tildes), `slug`, `resumen` (texto editorial del QF), `resumen_revisado_en`.
- `medicamentos` (por presentación comercial): nombre, laboratorio, `forma_farmaceutica`, `liberacion`, `recubrimiento`, `recubrimiento_funcional`, `forma_geometrica`, `ranura`, `ranura_orientacion`, `grabado`, `veredicto`, `criterio_id`, `nota_veredicto`, `estado` (`borrador`/`publicado`/`archivado`), `revisado_por`, `revisado_en`, `slug`, `meta_descripcion`.
  - Columnas `largo_mm`, `ancho_mm`, `espesor_mm` y `color_hex` **existen pero son opcionales y no se usarán en la v1**.
  - Restricción: una ficha `publicado` exige veredicto, criterio y revisor.
  - Trigger valida que el veredicto coincida con el del criterio y congela `version_criterio`.
- `medicamento_principios` (N:M con `cantidad` y `unidad`; soporta asociaciones).
- `criterios_particion`: 9 criterios iniciales **en borrador** (a revisar por Seba): `RANURA-LI`, `SIN-RANURA-LI`, `RECUB-ESTETICO`, `LIB-PROLONGADA`, `ENTERICO`, `BUCODISPERSABLE`, `MTE`, `PELIGROSO`, `NO-SOLIDA`.
- `aportes`: cola de revisión (sin campo de veredicto), límite de 10 pendientes por usuario, función `resolver_aporte()` solo admin.
- `historial_veredictos`: trazabilidad por trigger.
- Vistas públicas (`security_invoker`): `v_dci_publicas`, `v_fichas_publicas`, `v_sitemap`.
- RLS activo: el público solo lee fichas `publicado`; escritura solo admin; el usuario ve solo sus aportes.
- Para quedar como admin: `update perfiles set rol = 'admin' where id = '<uuid>';`

## 5. Estructura de la web

Rutas (todas pre-generadas en build):
- `/`: buscador, accesos rápidos, aviso informativo.
- `/dci/[slug]`: **página de mayor valor SEO** ("¿Se puede partir el X?"): resumen del QF, tabla de presentaciones con veredicto, preguntas frecuentes.
- `/medicamentos/[slug]`: ficha comercial.
- `/criterios` y `/criterios/[codigo]`: explicación de cada criterio y fichas afectadas.
- `/listas/partibles`, `/listas/no-partibles`, `/listas/liberacion-prolongada`.
- `/guias/...`: artículos en MDX (cómo partir correctamente, qué es la liberación prolongada).
- `/sobre-el-proyecto` (autoría, metodología), `/aviso-legal`, `/privacidad`, `/contacto`.
- `/aportar` y `/mis-aportes`: etapa posterior (login por email + código).

### Plantilla de ficha (de arriba hacia abajo)
1. Título en forma de pregunta: "¿Se puede partir [nombre] [concentración]?"
2. Sello de veredicto con **icono + texto + color** (nunca solo color) y "Revisado por [Seba], QF · fecha".
3. Ícono ilustrativo del comprimido y tabla: forma, ranura, liberación, forma farmacéutica (sin medidas).
4. Criterio fundamentado + nota opcional.
5. Aviso de uso informativo.
6. Otras presentaciones de la misma DCI.
7. Bloque "¿Dudas con su tratamiento? Consulte a un químico farmacéutico" con enlace a WhatsApp / web de Farmacias Curie.
8. Botón "Reportar un error".

## 6. Estructura de repositorio sugerida (Astro)

- `src/pages/`: rutas anteriores
- `src/components/`: `Comprimido.astro` (SVG ilustrativo), `SelloVeredicto`, `Buscador` (isla interactiva), `FormAporte` (etapa posterior)
- `src/lib/supabase.ts`: cliente y consultas de build
- `.github/workflows/deploy.yml`: build y despliegue a Pages
- `public/CNAME`

### Despliegue y actualización
- Build con **GitHub Actions** (el límite de 10 builds/hora de Pages no aplica con workflow propio).
- Reconstrucción: cron diario, manual, y **webhook de Supabase al publicar/cambiar un veredicto** (el veredicto es información de seguridad; no debe quedar desactualizado por horas).
- Repositorio público (plan gratuito): **nunca** subir la `service_role`. Solo la clave `anon` (pública por diseño, protegida por RLS).
- Configurar `site` de Astro con el dominio final; registrar ese dominio como URL de redirección en Supabase Auth.
- Límites de Pages a vigilar: sitio publicado ≤ 1 GB, despliegue ≤ 10 min, ancho de banda blando 100 GB/mes.

## 7. SEO y tráfico hacia Farmacias Curie

- Marca visible y honesta: "Un proyecto de Farmacias Curie · revisado por [Seba], QF".
- Enlaces cruzados entre la web de Curie y el proyecto (menú/pie en ambos sentidos).
- JSON-LD: `MedicalWebPage` (con `reviewedBy`, `lastReviewed`), `FAQPage`; `publisher` = Farmacias Curie, `author` = Seba; enlace al perfil de Google Business para SEO local.
- Sitemap generado en build (integración de Astro; la vista `v_sitemap` es opcional), canónicas y títulos únicos.
- `noindex` para páginas con contenido escaso; las páginas de DCI necesitan su texto editorial antes de publicarse.

## 8. Precauciones regulatorias y de contenido

- Sin precios, ofertas, carrito ni llamados a comprar medicamentos específicos en las fichas (la promoción de medicamentos al público tiene restricciones en Chile, sobre todo los de receta). La derivación a Curie va en términos generales: orientación farmacéutica y despacho. Validar con asesoría legal o Seremi de Salud antes de publicar.
- Aviso legal claro: información de apoyo, no reemplaza indicación médica ni farmacéutica.
- Minimizar datos personales (revisar Ley 21.719 si se recolectan).

## 9. Pendientes

1. Revisar y ajustar los 9 criterios iniciales (especialmente `MTE` y `RECUB-ESTETICO`).
2. Cargar las primeras DCI/medicamentos (idea: 100–200 de mayor rotación en Curie) y redactar el `resumen` de cada DCI.
3. Definir texto del aviso legal y si se pedirá aceptación de términos.
4. Definir el subdominio final.

## 10. Siguiente paso para Code

Generar el proyecto Astro completo con el alcance de la v1:
- configuración (`astro.config`, `site`, integración de sitemap),
- cliente Supabase y consultas de build,
- componente SVG ilustrativo del comprimido (formas + ranura),
- páginas `/dci/[slug]` y `/medicamentos/[slug]`,
- buscador (isla) usando `buscar_medicamentos`,
- bloque de contacto farmacéutico y sello de autoría,
- workflow de despliegue a GitHub Pages con cron y disparo manual.

**Preferencia del autor:** entregar siempre el código **completo** de cada archivo, no fragmentos ni parches.
