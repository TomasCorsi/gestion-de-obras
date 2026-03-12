

# Plan: Tabla de Remitos solo lectura con acciones Editar/Borrar

## Cambios principales

### 1. Reemplazar `RemitosSimpleGrid` con una tabla de solo lectura
- Eliminar toda la lógica de edición inline (inputs en celdas, `addRow`, `duplicateRow`, `updateRow`, estado local `LocalRow`).
- Renderizar una tabla HTML estática con los datos de cada remito.
- Agregar columna de acciones con botones **Editar** (lápiz) y **Borrar** (papelera).
- Borrar abre un `DeleteConfirmDialog` y ejecuta el delete via `batchSave`.

### 2. Adaptar `RemitoQuickFormDialog` para soportar edición
- Recibir un prop opcional `editingRemito` con los datos a pre-cargar.
- Si viene `editingRemito`, el título cambia a "Editar Remito" y al guardar se llama `onSubmit` con el id incluido.
- Actualizar `src/pages/Remitos.tsx` para manejar el estado de `editingRemito`.

### 3. Actualizar `src/pages/Remitos.tsx`
- Reemplazar `onSave` del grid por handlers individuales de editar/borrar.
- Pasar `editingRemito` al dialog de formulario.
- Eliminar el botón "Agregar fila" del grid (ya existe el botón "Nuevo" en la barra de acciones).

### Archivos a modificar
- `src/components/remitos/RemitosSimpleGrid.tsx` -- reescribir como tabla read-only con acciones
- `src/components/remitos/RemitoQuickFormDialog.tsx` -- agregar soporte para edición (prop `editingRemito`)
- `src/pages/Remitos.tsx` -- conectar edición y borrado

