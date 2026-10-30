# Carga masiva desde el stock de Curie: especificación

Fecha: 30 de octubre de 2026. Estado: **para revisión del QF**.

Complementa a `2026-10-30-pildoras-v1-design.md`. Los criterios y su orden de evaluación vienen del documento "Píldoras · Criterios de partición", aprobado por el QF.

## 1. Objetivo

Crear las fichas de Píldoras a partir del stock de Farmacias Curie, que el QF considera confiable. El proceso asigna el criterio con reglas, deja revisar el resultado en una planilla y produce un SQL que el QF ejecuta en Supabase.

**Éxito:**

- De un stock de unos 6.000 productos salen unas 1.700 fichas de comprimidos y cápsulas, una por producto, con las cajas de distinto tamaño agrupadas.
- Cada ficha tiene criterio, veredicto y principio activo, o queda en borrador con una alerta que dice qué falta.
- El QF revisa todo en Excel, sin tocar código ni claves.
- Repetir la carga con un stock nuevo actualiza las fichas existentes y agrega las nuevas, sin duplicar.

## 2. Flujo

```
stock.xlsx ──► npm run carga:revision ──► revision.xlsx + laboratorios.xlsx
                                              │ (el QF revisa y corrige)
                                              ▼
                         npm run carga:sql ──► carga.sql ──► SQL Editor de Supabase
```

1. `npm run carga:revision -- <stock.xlsx>` lee el stock, aplica las reglas y escribe:
   - `revision.xlsx`, con una fila por ficha;
   - `laboratorios.xlsx`, con un código de laboratorio por fila y una columna para su nombre.
2. El QF corrige `revision.xlsx`: principio activo, ranura, criterio, estado o nota. También completa `laboratorios.xlsx`.
3. `npm run carga:sql -- <revision.xlsx> <laboratorios.xlsx> --revisor <correo>` valida la planilla y escribe `carga.sql`.
4. El QF ejecuta `carga.sql` en el SQL Editor. Corre como administrador, así que no hace falta ninguna clave en el repositorio.

**Privacidad:** el stock trae costos, precios y márgenes. Ni el stock ni las planillas ni el SQL se suben al repositorio público: se guardan en `privado/`, que está en `.gitignore`. El script descarta las columnas de costo y precio al leer.

## 3. Lectura del stock

- **Columnas usadas:** *Tipo de Producto*, *Producto*, *Variante* (principio activo) y *Código de barras*. El resto se ignora.
- **Tipos incluidos:** MEDICAMENTO, CENABAST y MEDICAMENTO CONTROLADO. CORTO VENCIMIENTO se excluye, porque repite productos con la marca "(CV)".
- **Patrón del nombre:** `<nombre y concentración> X <cantidad><sigla> <laboratorio>`. Ejemplo: `ACICLOVIR 200MG X 24C ML`.
  - El código de laboratorio es lo que sigue a la sigla. "(CEN)" es Cenabast.
  - Sin laboratorio, el campo queda vacío.
- **Agrupación:** una ficha por combinación de nombre con concentración, sigla y laboratorio. Las cajas de distinto tamaño son la misma ficha. Se guarda el primer código de barras.
- **Fuera de alcance:** las siglas que no son comprimidos ni cápsulas (ML, G, D, S, A, AMP, JER, SUP, F, etc.).

## 4. Clasificación

### 4.1 Siglas de unidad

| Sigla | Forma farmacéutica | Liberación | Criterio por sigla |
|---|---|---|---|
| C | comprimido | inmediata | SIN-RANURA-LI (ranura pendiente) |
| CR | comprimido_recubierto | inmediata | RECUB-ESTETICO |
| GR | gragea | inmediata | RECUB-ESTETICO |
| CRE | comprimido_recubierto | gastrorresistente | ENTERICO |
| CPRE | capsula_dura | gastrorresistente | ENTERICO |
| CLP | comprimido | prolongada | LIB-PROLONGADA |
| CLPO | comprimido_recubierto | osmotica | LIB-OSMOTICA |
| CP | capsula_dura | inmediata | NO-SOLIDA |
| CPB, CB | capsula_blanda | inmediata | NO-SOLIDA |
| CEF | comprimido_efervescente | efervescente | EFERVESCENTE |
| CSL | comprimido_sublingual | sublingual | SUBLINGUAL |
| CBD, CDB | comprimido_bucodispersable | bucodispersable | BUCODISPERSABLE |
| CM | comprimido_masticable | masticable | MASTICABLE |
| CD | comprimido_dispersable | inmediata | DISPERSABLE |
| OV | comprimido_vaginal | inmediata | VAGINAL |
| CV, CPV | capsula_blanda | inmediata | VAGINAL |
| Otras (U, UN, CF, CLR, CPR, X, ASC, L, MG, OPK…) | otra | inmediata | sin criterio: borrador |

### 4.2 Siglas en el nombre

Las siglas del nombre mandan sobre la sigla de la unidad. Se buscan como palabras completas, sin distinguir mayúsculas ni tildes.

| En el nombre | Criterio |
|---|---|
| OR, OROS | LIB-OSMOTICA |
| LP, SR, XR, XL, RETARD, "LIBERACION PROLONGADA" | LIB-PROLONGADA |
| EC, "GASTRORRESISTENTE" | ENTERICO |
| SL, "SUBLINGUAL" | SUBLINGUAL |
| ODT, BD, "BUCODISPERSABLE" | BUCODISPERSABLE (BDH es un laboratorio y no cuenta) |
| "EFERVESCENTE" | EFERVESCENTE |

### 4.3 Orden de evaluación

Gana la primera regla que coincide, como en el documento de criterios:

1. NO-SOLIDA por sigla (CP, CPB, CB). CPRE, CV y CPV no cuentan aquí.
2. PELIGROSO: principio activo en la lista de fármacos peligrosos.
3. SUBLINGUAL.
4. BUCODISPERSABLE.
5. EFERVESCENTE.
6. VAGINAL.
7. LIB-OSMOTICA.
8. LIB-PROLONGADA.
9. ENTERICO.
10. MTE: principio activo en la lista MTE de Curie.
11. DOSIS-MCG: concentración en MCG o µg.
12. MASTICABLE.
13. DISPERSABLE.
14. RECUB-ESTETICO.
15. SIN-RANURA-LI para C. Si el QF marca la ranura, pasa a RANURA-LI.

En los puntos 3 a 9, una regla coincide por la sigla de la unidad o por una sigla del nombre.

### 4.4 Confianza y estado

- **Publicado:** cualquier regla de alta confianza.
- **Borrador:** MTE y DOSIS-MCG (baja confianza), las siglas desconocidas y las fichas sin principio activo o sin concentración.

### 4.5 Principio activo y concentración

1. La *Variante*, sin las marcas "(BE)", "(GEN)", "RR*" ni "GENERICOS". Las asociaciones vienen separadas por "/", "+" o ",".
2. Si queda vacía: el nombre hasta el primer número, sin palabras de forma (OVULOS, BD, XL…), con la alerta "principio activo inferido". Si ese nombre coincide con una DCI conocida del mismo stock, la alerta no aparece.
3. Concentración: los números con su unidad (MG, MCG, G, UI, %) que aparecen en el nombre. En una asociación, "50/12,5MG" reparte las cantidades en orden. Si no se puede leer, la ficha queda en borrador con la alerta "concentración ilegible".

### 4.6 Dibujo

El stock no trae la forma del comprimido. Por defecto:
- capsular para las cápsulas;
- redonda para el resto.

En ambos casos va la alerta "forma pendiente". El QF la corrige en la planilla cuando la conozca.

## 5. Planilla de revisión

Tiene una fila por ficha y columnas editables con listas desplegables:

| Columna | Editable |
|---|---|
| Clave (estable, para actualizar sin duplicar) | No |
| Productos del stock (cajas agrupadas) | No |
| Nombre comercial | Sí |
| Laboratorio (código) | No |
| Principio activo (uno por línea: DCI, cantidad, unidad) | Sí |
| Forma farmacéutica, liberación | Sí |
| Forma geométrica, ranura | Sí |
| Criterio | Sí (lista de los 16) |
| Veredicto | No (se deriva del criterio) |
| Estado | Sí (publicado, borrador) |
| Nota del QF | Sí |
| Alertas | No |

**Filtros útiles:**
- "ranura pendiente" (las C que hay que revisar);
- "principio activo inferido";
- estado borrador.

Las listas de fármacos peligrosos y de MTE se proponen en el documento de criterios y el QF las aprueba allí. El script las lee desde `scripts/carga/listas.ts`.

## 6. SQL generado

- Un solo archivo, dentro de una transacción.
- **Principios activos:** `insert … on conflict (dci) do nothing`.
- **Medicamentos:** `insert … on conflict (slug) do update`.
  - El slug es fijo y sale de la clave: nombre, concentración y laboratorio.
  - Si el QF ya publicó una ficha y la planilla nueva la trae en borrador, la ficha se mantiene publicada. Un cambio de estado solo se hace a mano.
- **Medicamento y principios:** se reemplazan los de cada ficha cargada.
- **Revisor:** `revisado_por = (select id from auth.users where email = '<correo>')`. Si ese usuario no existe, el SQL se detiene con un mensaje claro antes de escribir nada. `revisado_en` es la fecha de la carga.
- **Laboratorio:** el nombre de `laboratorios.xlsx`, o vacío si falta.
- **Validación previa:** el script se niega a generar el SQL si la planilla tiene un criterio inexistente, un estado inválido o una ficha publicada sin principio activo. El mensaje dice la fila.

## 7. Componentes

```
scripts/carga/
  leer-stock.ts       stock.xlsx → filas (sin costos ni precios)
  analizar.ts         nombre del producto → nombre, concentración, sigla, laboratorio
  clasificar.ts       ficha → criterio, confianza, forma, liberación, alertas
  listas.ts           DCI peligrosas y MTE (aprobadas por el QF)
  planilla.ts         escribe y lee revision.xlsx y laboratorios.xlsx
  sql.ts              planilla validada → carga.sql
  revision.ts, generar-sql.ts   los dos comandos
```

- **Dependencias nuevas, solo de desarrollo:** `exceljs` para leer y escribir Excel con listas desplegables, y `tsx` para ejecutar TypeScript.
- **Lógica compartida:** `clasificar.ts` reutiliza los tipos y los 16 criterios de `src/`.

## 8. Pruebas

- **`analizar`:** todos los ejemplos del QF, entre ellos:
  - `ACICLOVIR 200MG X 24C ML` → C, ML, aciclovir 200 mg;
  - `PLANIDEN ODT 10MG X 30CD ABB (OF1)` → bucodispersable;
  - `MIRTAZAPINA BD 30MG X 30CBD GAD` y un producto de laboratorio BDH, que no es bucodispersable;
  - asociaciones con "/".
- **`clasificar`:** el orden de evaluación, con casos de conflicto:
  - un fármaco peligroso en C queda "No se debe partir";
  - CPRE es ENTERICO, no NO-SOLIDA;
  - OR en el nombre gana a CR;
  - levotiroxina en mcg queda como DOSIS-MCG en borrador.
- **`sql`:** el SQL generado se ejecuta en el PostgreSQL local de `supabase/verificar.sh` con una muestra de 20 productos reales. Se prueba también que repetirlo no duplica fichas.
- **Prueba completa:** el stock real produce unas 1.700 fichas, ninguna publicada sin criterio, y el resumen por criterio se informa al QF.

## 9. Fuera de alcance

- Fotos o dibujos reales del comprimido.
- Medidas.
- Productos que no son comprimidos ni cápsulas.
- El panel de administración.
- La sincronización automática con el sistema de stock.

## 10. Pendientes del QF

1. Aprobar las listas de fármacos peligrosos y de MTE, que propondré en el documento de criterios.
2. Completar `laboratorios.xlsx`.
3. Crear su usuario en Supabase (*Authentication → Add user*) con el correo que usará como revisor.
