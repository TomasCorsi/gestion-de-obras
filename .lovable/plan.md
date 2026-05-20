# Eliminar ordenamiento manual de remitos

## Resumen
Quitar la funcionalidad de drag-and-drop para ordenar remitos manualmente (campo `orden`) y dejar que se ordenen unicamente por fecha de creacion (`fecha DESC, created_at DESC`).

## Cambios

### 1. Hook `src/hooks/useRemitos.ts`
- Remover columna `orden` de la interface `RemitoDB`.
- Remover ` .order("orden", { ascending: false, nullsFirst: true })` de la query.
- Eliminar la funcion `reorderRemito` del objeto retornado.

### 2. Grid `src/components/remitos/RemitosSimpleGrid.tsx`
- Eliminar todo el codigo de `@dnd-kit/core` y `@dnd-kit/sortable` (sensores, DndContext, SortableContext, SortableRow).
- Reemplazar `SortableRow` por un `TableRow` estático simple.
- Eliminar la columna con el icono `GripVertical` de drag.
- Eliminar las props `reorderEnabled` y `onReorder`.
- Eliminar el mensaje "Quitá los filtros..." debajo del contador.

### 3. Pagina `src/pages/Remitos.tsx`
- Eliminar `reorderRemito` del destructuring de `useRemitos()`.
- Eliminar las props `reorderEnabled` y `onReorder` de `<RemitosSimpleGrid />`.

## Resultado
La tabla de remitos se renderiza como tabla estática, ordenada automaticamente por `fecha` descendente y luego `created_at` descendente, sin posibilidad de reordenar manualmente.
