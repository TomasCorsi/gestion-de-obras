## Objetivo

Agregar un botón en la vista de parte diario de **SERGIO GARCIA** (capataz, legajo 178, user_id `c92028bd-dd42-416d-8892-f00b5ef90f8f`) que lo lleve a la sección de Remitos, donde solo verá y podrá editar los remitos que él mismo cargue. Arranca con lista vacía (los remitos viejos no son suyos).

## Cambios

### 1. Base de datos — columna `created_by` y RLS específica

- Agregar columna `created_by uuid` a `public.remitos` (nullable, indexada).
- Trigger `BEFORE INSERT` que setee `created_by = auth.uid()` cuando viene null.
- **Backfill**: dejar todos los existentes en `null` → Sergio arranca con lista vacía.

### 2. Políticas RLS de `remitos`

Mantener todas las políticas actuales (admin/capataz/maquinista global SELECT/remitero) sin cambios, y **agregar** políticas específicas solo para el user_id de Sergio:

- `Sergio can manage own remitos` (ALL): `USING (auth.uid() = 'c92028bd-dd42-416d-8892-f00b5ef90f8f' AND created_by = auth.uid())`.
- `Sergio can insert remitos` (INSERT): `WITH CHECK (auth.uid() = 'c92028bd-dd42-416d-8892-f00b5ef90f8f')`.

Esto le da permiso de cargar/editar/borrar sus propios remitos sin afectar a los demás maquinistas (que siguen con SELECT global).

### 3. Botón en el parte diario

`src/components/parte-diario/ParteDiarioHomeView.tsx`

- Agregar props `showRemitosButton?: boolean` y `onIrRemitos?: () => void`.
- Renderizar tarjeta destacada "Cargar Remitos" (icono `Receipt`, color primario) cuando esté activa.

`src/pages/ParteDiario.tsx`

- Constante `SERGIO_USER_ID = "c92028bd-dd42-416d-8892-f00b5ef90f8f"`.
- `const showRemitosButton = user?.id === SERGIO_USER_ID;`
- `onIrRemitos = () => navigate('/remitos')`.

### 4. Filtrado en la vista de Remitos para Sergio

`src/hooks/useRemitos.ts`

- Si el `auth.uid()` es el de Sergio (chequeo client-side por UX), filtrar el query con `.eq("created_by", user.id)`. La RLS de todos modos lo enforza.
- En `createMutation` y `batchSave.created`, incluir `created_by: user.id` defensivo.

`src/pages/Remitos.tsx`

- Si el user es Sergio, ocultar acciones administrativas (importación CSV, asignación masiva de precios, liquidación cliente). Mantener: agregar / editar / borrar fila.

## Resumen de archivos

```text
supabase migration                                  → columna + trigger + 2 policies
src/pages/ParteDiario.tsx                           → detectar Sergio + handler navegación
src/components/parte-diario/ParteDiarioHomeView.tsx → botón "Cargar Remitos"
src/hooks/useRemitos.ts                             → filtro por created_by + insert con created_by
src/pages/Remitos.tsx                               → ocultar acciones admin para Sergio
```
