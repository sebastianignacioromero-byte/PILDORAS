# Píldoras: decisiones de diseño (traspaso)

Estado al 30 de octubre de 2026. Este documento resume lo acordado en la primera sesión de trabajo y sirve de punto de partida para la siguiente.

## Proyecto

- **Nombre público:** Píldoras. Firma: "Un proyecto de Farmacias Curie".
- **Qué es:** web informativa para pacientes. Indica por medicamento la forma del comprimido, si tiene ranura y si se puede partir, con un criterio estandarizado.
- **Contexto completo:** `docs/contexto/RESUMEN_PROYECTO_partibilidad.md`. El esquema de Supabase está en `docs/contexto/schema_partibilidad.sql` y `docs/contexto/migracion_web_seo.sql`.
- **Responsable clínico:** Seba, químico farmacéutico de Farmacias Curie.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Repositorio | `sebastianignacioromero-byte/PILDORAS` (público), separado de los demás repositorios de Curie |
| Framework | Astro, con generación estática |
| Hosting | GitHub Pages. Cloudflare Pages se descartó porque no se pudo asociar al dominio de Curie |
| Datos | Supabase, consultado al construir el sitio. Búsqueda en el navegador con la clave `anon` y `buscar_medicamentos(q)` |
| Orden de trabajo | Primero la maqueta con datos de ejemplo. Después se conecta Supabase |
| Dirección visual | **Opción C · Blíster** (ver abajo) |

## Dirección visual elegida: C · Blíster

La maqueta comparativa está en `docs/diseno/direcciones-de-diseno.html` (pestaña C). Ábrala en el navegador para verla.

- **Concepto:** cada comprimido se muestra dentro de un alvéolo de blíster. Tarjetas blancas redondeadas sobre un fondo verde muy claro. Letra grande, pensada para adultos mayores.
- **Tipografía:** Bricolage Grotesque (títulos, peso 800 y espaciado negativo) y Atkinson Hyperlegible (texto, base de 16,5 px).
- **Paleta:**
  - Marca Curie `#0b6f68`, tinta `#14302d`, fondo `#f3f7f6`, tarjeta `#ffffff`, alvéolo `#e2ecea`
  - Veredictos: partible `#157a55`, condicional `#b86a00`, no partible `#c42c2c`
  - Botón de contacto `#7fe0c4` sobre bloque en tinta
- **Sello de veredicto:** bloque sólido del color del veredicto, con texto blanco, ícono en un cuadrado translúcido, título y subtítulo. Siempre lleva ícono + texto + color.
  - Textos: "Sí, se puede partir", "Solo con indicación profesional", "No se debe partir".
  - Etiquetas cortas: "Se puede partir", "Con indicación", "No partir".
- **Dibujo del comprimido:** SVG con trazo grueso, sombra desplazada y ranura marcada, dentro de un alvéolo. Siempre con el rótulo "Representación ilustrativa, no a escala".
- **Pantallas maquetadas:** inicio con buscador y ficha de medicamento. La estructura de la ficha sigue la sección 5 del resumen del proyecto.

## Pendiente para la próxima sesión

1. Confirmar si se ajusta algo de la opción C (colores, logo, textos del sello).
2. Diseñar las pantallas que faltan: página de principio activo (`/dci/[slug]`), criterios, listas, aviso legal y "sobre el proyecto".
3. Definir los íconos SVG para todas las formas (`forma_geometrica`) y tipos de ranura (`tipo_ranura`) del esquema.
4. Escribir la especificación técnica del proyecto Astro y el plan de implementación: maqueta con datos de ejemplo y despliegue a GitHub Pages.
