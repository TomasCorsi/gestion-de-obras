## Cambios para Franco Buceta en Remitos (sin afectar a otros remiteros)

**User ID Franco:** `2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a`

### Garantía clave
Todo lo que sigue se aplica **únicamente cuando el usuario logueado es Franco** (chequeo por `user.id === FRANCO_USER_ID`). Los demás remiteros (rol `remitero`) y admins/capataces siguen viendo y operando exactamente como hoy.

### 1. Acceso restringido a sus propios remitos (solo Franco)
- En `src/hooks/useRemitos.ts`: agregar `FRANCO_USER_ID` y, análogo a `isSergio`, filtrar la query por `created_by = currentUserId` solo si `currentUserId === FRANCO_USER_ID`. El resto de usuarios mantiene `filterUserId = null` (ven todo lo que su rol permite).
- En `src/pages/Remitos.tsx`: agregar `isFranco` y aplicar las mismas restricciones de UI que ya existen para Sergio (ej. ocultar el bloque controlado por `!isSergio` también para `!isFranco`).
- Migración SQL: agregar política RLS nueva en `remitos`:
  - **"Franco can manage own remitos"**: `USING ((auth.uid() = '2184b0ef-…') AND (created_by = auth.uid()))` con el mismo `WITH CHECK`. Igual al patrón de Sergio.
  - **No se modifica ni elimina** la política `Remiteros can manage remitos`, así que los demás remiteros siguen viendo todo. Sin embargo, para que Franco quede limitado, **debe quitarse a Franco del rol `remitero`** o, alternativamente, **reemplazar la política `Remiteros can manage remitos` por una versión que excluya el id de Franco** (`AND auth.uid() <> 'franco_id'`). Propongo la 2ª opción porque no requiere tocar roles.

### 2. Valores por defecto al crear remito (solo Franco)
En `RemitoQuickFormDialog.tsx` (modo "nuevo"), cuando `user.id === FRANCO_USER_ID`, prellenar:
- `desde` = **"Cantera San Vicente"**
- `tipo_material` = **"Tosca"**
- `precio_calc_mode` = **"cantidad"** (Cantidad × Precio)

Editable: Franco puede cambiarlos. Para los demás usuarios el formulario abre vacío como hoy.

### 3. Nuevo campo: Forma de pago (visible para todos)
- Migración: agregar columna `forma_pago text` (nullable) a `remitos` con check `IN ('efectivo','transferencia','cuenta_corriente')`.
- `useRemitos.ts`: incluir `forma_pago` en `RemitoDB` y `RemitoForm`.
- `RemitoQuickFormDialog.tsx`: agregar `Select` "Forma de pago" con las 3 opciones. Visible para todos los usuarios (no solo Franco), así sirve a todo el equipo. Es opcional: si no se elige, queda en `null`.
- `RemitosSimpleGrid.tsx` / `RemitosDataGrid.tsx`: agregar columna "Forma de pago" para mostrar y editar (badge en la tabla).

### 4. Verificación
- Login como Franco → solo ve sus remitos, formulario abre con los 3 defaults, puede elegir forma de pago.
- Login como otro remitero → ve **todos** los remitos como hoy (incluidos los de Franco), formulario abre vacío, puede usar forma de pago.
- Login como admin/capataz → sin cambios, ve todo.

### Archivos a modificar
- Nueva migración Supabase (columna `forma_pago` + política RLS Franco + ajuste a política de remiteros para excluir a Franco).
- `src/hooks/useRemitos.ts`
- `src/pages/Remitos.tsx`
- `src/components/remitos/RemitoQuickFormDialog.tsx`
- `src/components/remitos/RemitosSimpleGrid.tsx` (y/o `RemitosDataGrid.tsx`)
