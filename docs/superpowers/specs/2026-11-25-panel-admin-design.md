# Panel de administración: especificación

Fecha: 25 de noviembre de 2026. Estado: **para revisión del QF**.

## 1. Objetivo

El QF edita las fichas desde una página privada del sitio en vez de usar la planilla. El uso principal es revisar en serie la forma y la ranura de cientos de comprimidos; también corrige cualquier otro dato.

**Éxito:**

- Asignar la forma y la ranura de una ficha toma un clic, con las formas predefinidas.
- Con "Guardar y siguiente", el QF recorre la lista de fichas con forma sin revisar sin volver a la lista.
- Lo guardado aparece en el sitio público en menos de una hora.
- Una carga posterior desde el stock no borra lo editado en el panel.

## 2. Acceso y seguridad

- La página vive en `/admin/`:
  - no tiene enlaces desde el sitio público;
  - lleva `noindex`;
  - no aparece en el sitemap.
- Se entra con correo y contraseña de Supabase Auth. El QF ya tiene usuario (sebastianignacioromero@gmail.com). La sesión queda guardada en ese navegador y hay un botón "Salir".
- Solo pueden editar los usuarios con `perfiles.rol = 'admin'`. El QF se marca como administrador una vez, con un SQL que se le entrega.
- La seguridad no depende de esconder la página: RLS y la función de guardado rechazan cualquier escritura de quien no sea administrador. La página usa la misma clave pública del sitio.
- Si entra un usuario que no es administrador, el panel lo indica y no muestra el editor.

## 3. Pantalla

La página es una sola aplicación que corre en el navegador y lee y escribe en Supabase en vivo, sin pasar por la construcción del sitio.

### 3.1 Lista (izquierda)

- **Buscador** por nombre comercial o principio activo, sin tildes, de al menos 2 caracteres.
- **Filtros:**
  - "Forma sin revisar" (activo al abrir);
  - estado (publicada o borrador);
  - criterio;
  - laboratorio.
- **Paginación:** 50 fichas por página.
- **Cada fila muestra:** miniatura del dibujo, nombre, laboratorio, etiqueta de veredicto y un punto que indica si la forma está revisada.
- La ficha abierta queda resaltada.

### 3.2 Editor (derecha)

De arriba hacia abajo:

1. **Dibujo en vivo**, con el mismo componente del sitio. Se actualiza con cada cambio, antes de guardar.
2. **Formas predefinidas**: botones con miniatura. Un clic asigna la forma geométrica y la ranura.

   | N.º | Nombre | Forma | Ranura |
   |---|---|---|---|
   | 1 | Redondo liso | redonda | sin_ranura |
   | 2 | Redondo, 1 ranura | redonda | simple |
   | 3 | Redondo, 2 ranuras en cruz | redonda | doble_cruz |
   | 4 | Cuadrado liso | cuadrada | sin_ranura |
   | 5 | Cuadrado, 1 ranura | cuadrada | simple |
   | 6 | Cuadrado, 2 ranuras en cruz | cuadrada | doble_cruz |
   | 7 | Rectangular, 3 ranuras paralelas (4 partes) | rectangular | multiple |

   Todas con orientación 0°. Para las cápsulas no se muestran las formas predefinidas, porque siempre se dibujan como cápsula.
3. **Forma y ranura por separado**, para lo que no está en la lista:
   - forma geométrica (10 opciones con miniatura);
   - ranura (5 opciones);
   - orientación (0°, 45°, 90°, 135°).
4. **Criterio**: lista agrupada por veredicto, con el veredicto a la vista.
   - **Regla automática:** si la sigla es `C` y el criterio es SIN-RANURA-LI o RANURA-LI, marcar una ranura funcional (simple, doble_cruz o multiple) lo cambia a RANURA-LI, y dejarla sin ranura o con ranura decorativa lo devuelve a SIN-RANURA-LI.
   - Los demás criterios nunca cambian solos.
5. **Estado**: publicada o borrador.
6. **Nota para el paciente**: texto opcional, que se publica.
7. **Datos del producto:** nombre comercial, laboratorio, forma farmacéutica y liberación.
8. **Principios activos:** filas con principio activo, cantidad y unidad (mg, mcg, g, UI o %).
   - Se pueden agregar y quitar filas.
   - El principio activo se elige con búsqueda entre los existentes. Si no existe, se crea uno nuevo al guardar.
   - La cantidad es opcional, porque algunos productos no declaran dosis.
9. **Botones:** "Guardar" y "Guardar y siguiente". El segundo abre la ficha siguiente de la lista filtrada.
   - Si hay cambios sin guardar y el QF cambia de ficha, el panel le pregunta antes de descartarlos.

### 3.3 Teléfono

El panel está pensado para computador. En pantallas angostas, la lista y el editor se muestran uno debajo del otro y se puede usar igual.

## 4. Datos

### 4.1 Migración `supabase/migracion_panel.sql`

- `medicamentos.forma_revisada boolean not null default false`. Se marca al guardar desde el panel.
- `medicamentos.editada_en_panel boolean not null default false`. Se marca al guardar desde el panel.
- **Función `guardar_ficha(p jsonb)`**, con `security definer` y comprobación `es_admin()`. En una sola transacción:
  1. valida: estado publicado exige criterio y al menos un principio activo; las cantidades, si vienen, son mayores que 0;
  2. actualiza la ficha y fija el veredicto a partir del criterio;
  3. registra `revisado_por = auth.uid()`, `revisado_en = now()`, `forma_revisada = true` y `editada_en_panel = true`;
  4. crea los principios activos nuevos;
  5. reemplaza los principios de la ficha.

  Ante cualquier error lanza una excepción con un mensaje en español y no guarda nada.
- **Vista `v_admin_fichas`**, con `security_invoker`, para la lista: incluye todas las fichas, también los borradores, porque las ve un administrador. Lleva los campos de la ficha, el código de criterio, sus principios (jsonb), `forma_revisada` y `editada_en_panel`.
- **SQL para marcar al QF como administrador:** `update perfiles set rol = 'admin' where id = (select id from auth.users where email = '<correo>')`.

### 4.2 Convivencia con la carga desde el stock

El SQL que genera `npm run carga:sql` pasa a respetar las fichas editadas en el panel:
- el `on conflict … do update` de `medicamentos` no las modifica (`where not medicamentos.editada_en_panel`);
- tampoco se reemplazan sus principios activos.

Las fichas nuevas y las no editadas se siguen actualizando como hasta ahora.

## 5. Dibujo

- Las 3 ranuras paralelas (`multiple`) se dibujan en los cuartos del ancho real de la silueta, no en posiciones fijas. Así, el rectángulo queda en 4 partes iguales.
- La función `svgComprimido` recibe el ancho de cada silueta y calcula las líneas.
- Las formas predefinidas viven en `src/lib/formas-predefinidas.ts`, con número, nombre, forma, ranura y orientación. Las usa solo el panel.

## 6. Publicación

El flujo de GitHub Actions cambia su cron de diario a cada hora (`17 * * * *`). Los repositorios públicos no pagan minutos de Actions.

## 7. Componentes

```
src/pages/admin/index.astro          página (noindex), sin datos de build
src/components/admin/                piezas de la pantalla (lista, editor, selector de formas)
src/lib/admin/sesion.ts              iniciar y cerrar sesión, comprobar el rol de administrador
src/lib/admin/fichas.ts              leer la lista y guardar mediante la función guardar_ficha
src/lib/admin/reglas.ts              regla automática de ranura y criterio, y validación previa al guardado
src/lib/formas-predefinidas.ts
supabase/migracion_panel.sql
```

La interfaz se arma con TypeScript en el navegador, igual que el buscador: sin framework nuevo y con el mismo diseño del sitio.

## 8. Pruebas

- **Unitarias:**
  - la regla de ranura y criterio, en todos sus casos;
  - la validación previa al guardado;
  - el armado del pedido a `guardar_ficha`;
  - las líneas de `multiple` dividen el rectángulo en 4 partes iguales;
  - las formas predefinidas usan valores válidos.
- **PostgreSQL local:**
  - `guardar_ficha` guarda como administrador y lo rechaza como usuario sin rol de administrador;
  - deshace todo ante un error de validación;
  - una carga posterior desde el stock no toca la ficha editada.
- **Navegador (Supabase simulado):**
  - inicio de sesión;
  - la lista con el filtro "forma sin revisar";
  - aplicar una forma predefinida actualiza el dibujo y el criterio;
  - "Guardar y siguiente";
  - el aviso de cambios sin guardar;
  - un usuario que no es administrador no ve el editor.

## 9. Fuera de alcance

- Fotos de comprimidos.
- Varios administradores con permisos distintos.
- Historial visible de cambios. El historial de veredictos ya se registra en la base.
- Botón "Publicar ahora".
- Edición de criterios desde el panel.
