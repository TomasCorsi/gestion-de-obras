# Mejoras a la tabla de Remitos

## 1. Scroll siempre visible con altura fija

Hoy la tabla crece con el contenido y la barra de scroll vertical aparece recién al final de la página. Vamos a fijar la altura del contenedor para que la barra de scroll esté visible siempre.

- En `src/components/remitos/RemitosSimpleGrid.tsx`, el contenedor `<div className="flex-1 overflow-auto border rounded-md">` se reemplaza por uno con altura fija calculada al estilo del resto de las grillas operativas: `style={{ height: 'calc(100vh - 280px)' }}` y `overflow-auto`.
- El header de la tabla queda **sticky** arriba (`<TableHeader className="sticky top-0 z-20 bg-muted">`) para que no se pierda al hacer scroll.
- La barra de scroll vertical va a estar visible desde el primer momento, sin tener que bajar la página.

## 2. Reordenar filas arrastrando (drag & drop persistente)

Se podrá tomar una fila desde un "handle" (ícono de agarre a la izquierda) y arrastrarla hacia arriba o abajo. El nuevo orden se guarda en la base y queda igual para todos los usuarios al recargar.

### Base de datos

Migración nueva:
- Agregar columna `orden numeric` a `remitos` (nullable).
- Backfill: `UPDATE remitos SET orden = EXTRACT(EPOCH FROM created_at)` para que el orden inicial respete el orden actual.
- Índice `CREATE INDEX idx_remitos_orden ON remitos(orden DESC NULLS LAST)`.
- Política RLS de UPDATE: ya existe la actual (admin/capataz pueden editar todos; cada remitero los suyos). El cambio de `orden` reutiliza esa misma política, no se agrega una nueva.

### Hook `useRemitos.ts`

- Cambiar el `order` del query principal a `.order('orden', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })`.
- Agregar `orden: number | null` a `RemitoDB`.
- Nueva mutación `reorderRemito({ id, newOrden })` que hace `UPDATE remitos SET orden = ? WHERE id = ?` y luego `invalidateQueries(['remitos'])`.

### UI con dnd-kit

Usar `@dnd-kit/core` y `@dnd-kit/sortable` (instalar como dependencia).

En `RemitosSimpleGrid.tsx`:
- Envolver `<TableBody>` en `<DndContext>` + `<SortableContext>` con los IDs de los remitos visibles.
- Cada `<TableRow>` se transforma en un componente `SortableRow` que usa `useSortable({ id })` y aplica `transform`/`transition`.
- Primera columna nueva: handle con ícono `GripVertical` (de `lucide-react`) y `{...attributes} {...listeners}`. Solo esta celda activa el drag, así no se rompe el click de Editar/Eliminar.
- Al soltar (`onDragEnd`), se calcula el nuevo `orden` para el ítem movido como el promedio entre el `orden` del vecino superior y el inferior (para no tener que reescribir todas las filas). Si cae en un extremo, se usa `vecino + 1` o `vecino - 1`.
- Se llama a `reorderRemito` con ese nuevo valor. React Query refresca la lista.

### Restricciones

- El drag & drop solo se habilita cuando **no hay filtros ni búsqueda activos** y el orden visible es el natural (orden DESC). Si el usuario filtra/busca, el handle se muestra deshabilitado con tooltip "Quitá los filtros para reordenar". Esto evita guardar un orden incoherente respecto a lo que el usuario realmente ve.
- En vista mobile (la grilla ya tiene `min-w` por columna y scroll horizontal), el handle queda igual a la izquierda y sigue siendo arrastrable con touch (dnd-kit lo soporta nativo).

## Archivos a tocar

- Nueva migración SQL en `supabase/migrations/`
- `src/hooks/useRemitos.ts`
- `src/components/remitos/RemitosSimpleGrid.tsx`
- `package.json` (deps `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)

## Verificación

1. Abrir Remitos como admin: la barra de scroll vertical es visible desde el inicio, el header queda fijo.
2. Sin filtros: arrastrar una fila desde el handle → al soltar, queda en la nueva posición y al recargar (F5) sigue ahí.
3. Como Franco (remitero): puede reordenar **solo sus propios remitos** (RLS).
4. Con un filtro activo: el handle aparece deshabilitado.
