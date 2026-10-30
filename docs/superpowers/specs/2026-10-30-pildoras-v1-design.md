# Píldoras v1: especificación técnica

Fecha: 30 de octubre de 2026. Estado: **para revisión de Seba (QF)**.

Complementa a `2026-10-30-pildoras-diseno-visual.md` (dirección visual C · Blíster). Donde ambos documentos difieran, manda este. En particular, los veredictos de este documento reemplazan a los tres anteriores (`partible`, `condicional`, `no_partible`).

## 1. Objetivo

Web informativa para pacientes que responde, por marca comercial, si un comprimido se puede partir. El paciente busca por DCI o por marca. Una DCI lleva a sus marcas, porque la forma del comprimido cambia según el laboratorio. La ficha final siempre es por marca.

**Éxito de la v1:**

- Un paciente escribe "losartan" o "Cozaar" (con o sin tildes, con errores leves), llega a la ficha de la marca y ve en pantalla el dibujo del comprimido y un veredicto claro con su fundamento.
- Cada ficha y cada DCI tiene una página HTML propia e indexable por Google.
- El sitio se publica solo en GitHub Pages: al hacer *push* a `main`, una vez al día y a pedido.

**Orden de trabajo:** primero la maqueta con datos de ejemplo, publicada en Pages. Después se conecta Supabase sin tocar las páginas.

## 2. Veredictos y criterios

### 2.1 Veredictos

| Código (`veredicto_particion`) | Texto del sello | Etiqueta corta | Color | Ícono |
|---|---|---|---|---|
| `se_puede_partir` | Sí, se puede partir | Se puede partir | `#157a55` | visto bueno ✓ |
| `no_debe_partir` | No se debe partir | No se debe partir | `#c42c2c` | signo de advertencia (!) |
| `no_puede_partir` | No se puede partir | No se puede partir | `#4a5b63` | círculo tachado |

- **No se debe partir:** hay una razón farmacéutica. Partirlo altera la liberación, la protección o la exactitud de la dosis, o expone a riesgo.
- **No se puede partir:** hay un impedimento físico, como una cápsula u otra forma no sólida.
- El sello siempre lleva ícono, texto y color. Nunca se indica el veredicto solo con color.
- El ámbar `#b86a00` de la maqueta deja de usarse para veredictos.

### 2.2 Criterios iniciales

Los textos de fundamento son **borrador**. Seba los redacta y aprueba antes de publicar fichas reales.

| Código | Título | Veredicto |
|---|---|---|
| `RANURA-LI` | Ranurado, liberación inmediata | se_puede_partir |
| `SIN-RANURA-LI` | Sin ranura, liberación inmediata | se_puede_partir |
| `RECUB-ESTETICO` | Recubrimiento solo estético o de sabor | se_puede_partir |
| `LIB-PROLONGADA` | Liberación prolongada | no_debe_partir |
| `LIB-OSMOTICA` | Liberación osmótica | no_debe_partir |
| `ENTERICO` | Recubrimiento entérico o gastrorresistente | no_debe_partir |
| `SUBLINGUAL` | Comprimido sublingual | no_debe_partir |
| `BUCODISPERSABLE` | Comprimido bucodispersable | no_debe_partir |
| `MTE` | Margen terapéutico estrecho | no_debe_partir |
| `DOSIS-MCG` | Dosis muy pequeña (microgramos) | no_debe_partir |
| `PELIGROSO` | Fármaco peligroso o citotóxico | no_debe_partir |
| `NO-SOLIDA` | Cápsula u otra forma no partible | no_puede_partir |

- El fundamento de `SIN-RANURA-LI` advierte que se use partidor, porque la división puede ser desigual.
- El criterio de comprimidos efervescentes se elimina.
- El tipo `tipo_liberacion` suma el valor `osmotica`. El valor `efervescente` se mantiene porque describe la forma, no un veredicto.

### 2.3 Cambios en el SQL

Supabase todavía no tiene datos, así que se corrigen directamente los archivos de `docs/contexto/` sin escribir una migración nueva. Se trasladan a `supabase/` en la raíz del repositorio:

- `schema_partibilidad.sql`:
  - nuevo tipo `veredicto_particion`;
  - `osmotica` en `tipo_liberacion`;
  - los 12 criterios de la tabla anterior.
- `migracion_web_seo.sql`:
  - las vistas cuentan los nuevos veredictos (`n_se_puede`, `n_no_debe`, `n_no_puede`);
  - se redefine `buscar_medicamentos` para que devuelva `slug` y `principios` (jsonb con `dci`, `slug`, `cantidad`, `unidad`), que la web necesita para enlazar los resultados.

## 3. Páginas

Todas se generan al construir el sitio.

| Ruta | Contenido |
|---|---|
| `/` | Buscador grande, explicación breve de los 3 veredictos y aviso informativo |
| `/dci/` | Índice alfabético de todas las DCI publicadas |
| `/dci/[slug]` | "¿Se puede partir el/la [DCI]?". Resumen del QF si existe y lista de marcas (nombre, laboratorio, concentración, dibujo pequeño y etiqueta de veredicto), ordenadas por nombre |
| `/medicamentos/[slug]` | Ficha por marca (ver 3.1) |
| `/criterios` | Lista de los criterios agrupados por veredicto |
| `/criterios/[codigo]` | Título, fundamento, veredicto y marcas que lo usan. La ruta usa el código en minúsculas, por ejemplo `/criterios/lib-prolongada` |
| `/sobre-el-proyecto` | Autoría, metodología y cómo se asigna el veredicto |
| `/aviso-legal` | Texto provisional |
| `/privacidad` | Texto provisional |
| `/contacto` | Enlace a WhatsApp y a la web de Farmacias Curie |
| `404` | Página de no encontrado con el buscador |

Los textos institucionales llevan la marca visible "Texto provisional, pendiente de revisión" hasta que Seba los apruebe.

### 3.1 Ficha de medicamento

Elementos, de arriba hacia abajo:

1. Título: "¿Se puede partir [nombre comercial] [concentración]?" y laboratorio debajo.
2. Sello de veredicto, con "Revisado por [nombre], QF · [fecha]".
3. Dibujo del comprimido en su alvéolo, con el rótulo "Imagen ilustrativa, no a escala".
4. Tabla de características: forma, ranura, forma farmacéutica y liberación. No se muestran medidas.
5. Criterio: título, fundamento y nota opcional, con enlace a `/criterios/[codigo]`.
6. Aviso de uso informativo.
7. Otras marcas de la misma DCI, con enlace a la página de la DCI.
8. Bloque "¿Dudas con su tratamiento? Consulte a un químico farmacéutico", con WhatsApp y web de Curie.
9. Enlace "Reportar un error". En la v1 abre un correo con el nombre de la ficha en el asunto. El formulario de aportes queda fuera de la v1.

## 4. Arquitectura

### 4.1 Tecnología

- Astro (última versión estable al implementar), salida estática y TypeScript.
- Node 22 en GitHub Actions.
- Sin framework de interfaz. El buscador es un componente Astro con un `<script>` en TypeScript.
- `@supabase/supabase-js`, que solo se carga en el código del buscador.
- `@astrojs/sitemap`.
- Tipografías Bricolage Grotesque y Atkinson Hyperlegible, alojadas en el propio sitio con `@fontsource` para no depender de Google Fonts.

### 4.2 Estructura del repositorio

```
supabase/                 esquema y migración SQL
src/
  config.ts               nombre del QF, enlaces de WhatsApp y Curie, correo de errores
  tipos.ts                tipos Ficha, Dci, Criterio, ResultadoBusqueda
  lib/
    datos.ts              única puerta de acceso a datos en build
    fuente-ejemplo.ts     lee src/datos/ejemplo/*.json
    fuente-supabase.ts    lee las vistas públicas (etapa 2)
    buscar.ts             interfaz buscar(q) → ResultadoBusqueda[]
    buscar-local.ts       sustituto de la maqueta
    buscar-supabase.ts    llama a buscar_medicamentos (etapa 2)
    normalizar.ts         minúsculas, sin tildes, espacios
    textos.ts             etiquetas de enums en español (forma, ranura, liberación, veredicto)
  datos/ejemplo/          fichas.json, dcis.json, criterios.json
  components/
    Comprimido.astro      dibujo SVG por forma y ranura
    SelloVeredicto.astro
    EtiquetaVeredicto.astro
    Buscador.astro
    BloqueContacto.astro
    AvisoInformativo.astro
  layouts/Base.astro      cabecera, pie con firma Curie, metadatos y JSON-LD
  pages/                  rutas de la sección 3
public/                   favicon y, más adelante, CNAME
.github/workflows/deploy.yml
tests/                    Vitest y Playwright
```

### 4.3 Datos

- `datos.ts` expone `obtenerFichas()`, `obtenerDcis()` y `obtenerCriterios()`. Los tipos son los de las vistas `v_fichas_publicas` y `v_dci_publicas`.
- La fuente se elige con la variable `DATOS_FUENTE` (`ejemplo` por defecto, o `supabase`).
- Si `DATOS_FUENTE=supabase` y faltan `PUBLIC_SUPABASE_URL` o `PUBLIC_SUPABASE_ANON_KEY`, la construcción falla con un mensaje claro. Nunca se publica un sitio vacío por error.
- Los datos de ejemplo son unas 12 fichas **ficticias**, marcadas como tales en la web con una franja "Datos de ejemplo". Cubren:
  - los 3 veredictos;
  - al menos 6 formas geométricas y los 5 tipos de ranura;
  - una DCI con 3 marcas de laboratorios distintos;
  - una asociación de dos DCI;
  - una cápsula.

### 4.4 Validación al construir

La construcción falla si una ficha:

- no tiene veredicto, criterio o fecha de revisión;
- tiene un veredicto que no coincide con el de su criterio;
- comparte `slug` con otra.

Así se replican en la web las mismas reglas que impone el esquema.

### 4.5 Búsqueda

- La interfaz es `buscar(q): Promise<ResultadoBusqueda[]>`. Cada resultado incluye `slug`, nombre, laboratorio, `principios`, forma, ranura y veredicto.
- **Maqueta:** `buscar-local.ts` busca sobre las fichas de ejemplo, incrustadas en el script. Normaliza tildes y mayúsculas y busca coincidencias por subcadena en nombre y DCI.
- **Etapa 2:** `buscar-supabase.ts` llama por RPC a `buscar_medicamentos(q)` con la clave `anon`. Se elige automáticamente si existen las variables públicas de Supabase.
- **Presentación:**
  - arriba, las DCI que coinciden con la consulta, con enlace a `/dci/[slug]`;
  - debajo, las marcas, con su etiqueta de veredicto y enlace a la ficha.
- **Comportamiento:**
  - la búsqueda empieza a partir de 2 caracteres y espera 250 ms después de la última tecla;
  - mientras busca muestra el estado "Buscando…";
  - si no encuentra nada, muestra "No encontramos ese medicamento" con enlace a contacto;
  - si Supabase falla, muestra "La búsqueda no está disponible en este momento" y sugiere navegar por los criterios.
- **Accesibilidad:** campo con `label`, resultados en una lista con `aria-live="polite"` y navegación con teclado.
- **Sin JavaScript:** el formulario sigue siendo útil. Hay una página `/dci/` con el índice alfabético de todas las DCI.

### 4.6 Dibujo del comprimido

- Formas: las 10 de `forma_geometrica` (redonda, ovalada, oblonga, capsular, cuadrada, rectangular, triangular, romboidal, hexagonal y otra). "Otra" usa una silueta redonda genérica.
- Ranuras: las 5 de `tipo_ranura`.
  - `simple`: una línea.
  - `doble_cruz`: dos líneas cruzadas.
  - `multiple`: tres líneas paralelas.
  - `solo_decorativa`: línea punteada, con la nota "ranura decorativa: no indica que se pueda partir".
  - `sin_ranura`: no se dibuja línea.
- La orientación de la ranura (`ranura_orientacion`) rota la línea.
- Las cápsulas (`capsula_dura`, `capsula_blanda`) se dibujan como cápsula de dos mitades, cualquiera sea la forma geométrica registrada.
- Estilo de la maqueta C: trazo grueso, sombra desplazada, dentro del alvéolo `#e2ecea` y con relleno blanco. `color_hex` no se usa en la v1.
- Cada dibujo lleva `role="img"` y un `aria-label` descriptivo, por ejemplo "Comprimido oblongo con ranura simple".

### 4.7 SEO

- `site` y `base` se configuran en `astro.config.mjs` desde variables:
  - mientras no haya subdominio: `https://sebastianignacioromero-byte.github.io` con base `/PILDORAS`;
  - después: el subdominio de Curie, por ejemplo `pildoras.farmaciascurie.cl`, con base `/` y `public/CNAME`.
- Todos los enlaces internos se construyen con la base, sin rutas absolutas escritas a mano.
- Cada página tiene título y meta descripción únicos y su URL canónica.
- La ficha y la página de DCI incluyen JSON-LD `MedicalWebPage` con `reviewedBy`, `lastReviewed` y `publisher` (Farmacias Curie).
- Se genera el sitemap con `@astrojs/sitemap`.
- Llevan `noindex`:
  - las páginas de DCI sin resumen del QF;
  - todo el sitio mientras use datos de ejemplo.

### 4.8 Despliegue

`.github/workflows/deploy.yml` hace build y despliegue a GitHub Pages con las acciones oficiales.

- **Disparadores:**
  - *push* a `main`;
  - `workflow_dispatch` (manual);
  - cron diario a las 06:17 UTC;
  - `repository_dispatch` de tipo `supabase-publicado`, que queda listo para el webhook de la etapa 2.
- Las variables `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` se cargan desde las *variables* del repositorio, no desde secretos, porque son públicas por diseño. La `service_role` nunca se usa.
- La construcción corre las pruebas unitarias antes de desplegar.
- **Acción manual de Seba (una vez):** en *Settings → Pages*, elegir como origen "GitHub Actions".

## 5. Pruebas

- **Vitest:**
  - `normalizar`: tildes, mayúsculas y espacios;
  - `buscar-local`: por marca, por DCI, sin tildes y sin resultados;
  - validación de fichas (sección 4.4);
  - `textos`: todos los valores de cada enum tienen etiqueta.
- **Componente `Comprimido`:** se renderizan las 50 combinaciones de forma y ranura más las cápsulas, y cada SVG tiene `aria-label`.
- **Playwright** sobre el sitio construido:
  - buscar "losartan", entrar a la DCI y abrir una ficha;
  - en la ficha se ven el sello, el rótulo "no a escala" y el bloque de contacto.
- **Revisión visual:** capturas de inicio, DCI y ficha a 375 px y 1280 px de ancho.

## 6. Fuera de la v1

- Medidas en mm y dibujo a escala.
- Color real del comprimido.
- Aportes de usuarios y login.
- Guías en MDX.
- Listas por veredicto.
- PWA y apps.
- Código de barras.
- Webhook de Supabase. El disparador queda preparado, pero la función que lo llama es de la etapa 2.

## 7. Pendientes de Seba que no bloquean la maqueta

1. Redactar los fundamentos de los 12 criterios.
2. Textos de aviso legal, privacidad y "sobre el proyecto".
3. Número de WhatsApp, URL de Curie y correo para "Reportar un error" (en `src/config.ts`).
4. Elegir el subdominio final.
5. Cargar las primeras DCI y marcas en Supabase.
