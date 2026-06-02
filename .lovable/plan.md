## Objetivo
Modificar el diálogo de "Liquidación por Cliente" en el módulo Remitos para permitir búsqueda rápida de clientes y selección múltiple (algunos o todos), en lugar del actual dropdown de selección única.

## Cambios a realizar

### 1. Reemplazar selector de cliente único por lista multi-seleccionable con búsqueda

En `src/components/remitos/LiquidacionClienteDialog.tsx`:

- **Estado**: Cambiar `selectedCliente` (string único) a `selectedClientes` (Set<string>).
- **Buscador**: Agregar un `<Input>` con ícono `Search` sobre la lista de clientes para filtrar en tiempo real por nombre.
- **Lista de clientes**: Reemplazar el `<Select>` por un contenedor scrollable con checkboxes:
  - Cada cliente se muestra con un `<Checkbox>` + nombre.
  - Altura fija con scroll para manejar listas largas.
  - Texto "No se encontraron clientes" cuando el filtro no coincide.
- **Botones de selección masiva**: Agregar al lado del título "Clientes" dos botones compactos:
  - "Seleccionar todos" — marca todos los clientes visibles (o todos los del tipo actual).
  - "Deseleccionar todos" — limpia la selección.

### 2. Adaptar la lógica de resumen a múltiples clientes

- **`remitosCliente`**: Filtrar remitos que correspondan a **cualquiera** de los clientes seleccionados.
- **`tiposUnicos`**: Extraer tipos de material de los remitos de todos los clientes seleccionados.
- **`resumen`**: Agrupar y sumarizar por `tipo_material` cruzando todos los clientes seleccionados.
- **Exportación Excel**: Incluir los datos consolidados de todos los clientes seleccionados. El nombre del archivo usará "Multiple" o el primer cliente + "_y_otros" cuando haya más de uno.

### 3. UI/UX

- Mantener la sección de "Tipos de material a incluir" con sus checkboxes de selección parcial (sin cambios).
- La tabla de resumen y el botón "Exportar Excel" se mantienen igual, pero ahora reflejan el total de todos los clientes seleccionados.
- Resetear `selectedTypes` cada vez que cambia la selección de clientes o el tipo de cliente.

## Archivo afectado
- `src/components/remitos/LiquidacionClienteDialog.tsx` (único archivo)
