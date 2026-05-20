# Remitero calaminasur@hotmail.com: ver solo sus propios remitos

## Objetivo
El usuario `calaminasur@hotmail.com` (id `73236f17-0602-41aa-8959-ee14be48f477`), con rol **remitero**, debe ver únicamente los remitos que él mismo cargó — igual que ya ocurre con Sergio y Franco.

## Comportamiento actual
- El hook `useRemitos` filtra por `created_by = currentUserId` sólo si el usuario es Sergio o Franco (`isOwnOnly`). El remitero Calaminasur ve **todos** los remitos de la base.
- La RLS actual permite a cualquier usuario con rol `remitero` (excepto Franco) gestionar todos los remitos, sin restricción por `created_by`.

## Cambios

### 1. Frontend (`src/hooks/useRemitos.ts`)
- Agregar la constante `CALAMINASUR_USER_ID = "73236f17-0602-41aa-8959-ee14be48f477"`.
- Incluirla en el flag `isOwnOnly` para que la consulta filtre por `created_by = currentUserId` también para este usuario.

### 2. Frontend (`src/pages/Remitos.tsx`)
- Tratar al usuario Calaminasur igual que Sergio/Franco: ocultar botones de Importar, Liquidar, Asignar Precios y Recalcular Clientes (`isOwnOnly` ya cubre eso si se agrega la misma constante).

### 3. Base de datos (RLS sobre `remitos`)
- Reemplazar la policy `Remiteros can manage remitos` para que, además de excluir a Franco, **también restrinja a cualquier remitero a filas con `created_by = auth.uid()`**. Así, aunque alguien intente saltarse el filtro de UI, no podrá ver/modificar remitos ajenos.
- Nueva expresión: `has_role(auth.uid(), 'remitero') AND auth.uid() <> '<franco>' AND created_by = auth.uid()` (tanto en USING como en WITH CHECK).

## Fuera de alcance
- No se cambian roles ni se agregan nuevos.
- No se modifica el comportamiento para admin/capataz (siguen viendo todo).
- Sergio y Franco mantienen sus policies actuales.

## Verificación
- Login con `calaminasur@hotmail.com`: la grilla de Remitos sólo muestra los remitos creados por él.
- Cargar un remito nuevo: aparece arriba en su vista.
- Otro usuario remitero (si existiera) tampoco vería los remitos de Calaminasur.
- Admin/capataz siguen viendo todos los remitos.
