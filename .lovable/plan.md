

# Unificar modo grilla dentro del modo tabla de Remitos

## Idea
En lugar de tener dos modos separados (tabla read-only con fullscreen toggle vs grilla editable), integrar la grilla simplificada (`RemitosSimpleGrid`) directamente dentro del layout principal (`MainLayout`) del modo tabla. Así todo queda en una sola vista con los filtros, stats y la grilla editable juntos.

## Cambios en `src/pages/Remitos.tsx`

1. **Eliminar el modo fullscreen** — Remover el bloque condicional `if (viewMode === "grid")` (líneas 300-373) que renderiza la grilla en pantalla completa con `fixed inset-0 z-50`.

2. **Reemplazar la tabla read-only** (líneas 465-560) por el `RemitosSimpleGrid` directamente dentro del `MainLayout`, debajo de los filtros y stats existentes.

3. **Eliminar el toggle Tabla/Grilla** — Ya no hacen falta dos modos. Queda una sola vista con:
   - `FilterBar` + barra de búsqueda (ya existentes)
   - Stats cards (ya existentes)  
   - `RemitosSimpleGrid` editable (reemplaza la tabla read-only)
   - Botones de Importar y Agregar fila (dentro del grid)

4. **Eliminar el botón "Nuevo Remito"** del header — La grilla ya tiene su propio botón "Agregar fila".

5. **Eliminar estados y lógica del form dialog** (`formOpen`, `handleNew`, `handleEdit`, `handleSubmit`, el `FormDialog` completo) ya que la edición se hace inline en la grilla.

6. **Mantener** el `DetailDialog` (ver detalle) y `DeleteConfirmDialog` por si se necesitan desde otro lugar, o eliminarlos si quedan sin uso.

El resultado es una sola pantalla con filtros arriba, KPIs, y la grilla editable inline abajo — todo integrado sin cambiar de modo.

