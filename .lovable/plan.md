

## Plan: Conectar columna Proveedor de Remitos con tabla Proveedores

### Cambio
Reemplazar la columna "Proveedor" de texto libre en la grilla de Remitos por un `GridSelectCell` que busque en la tabla `proveedores`, igual que ya se hace con Obras y Maquinarias.

### Archivos a modificar

**1. `src/components/remitos/RemitosDataGrid.tsx`**
- Importar `ProveedorDB` desde `useProveedores`
- Agregar prop `proveedores: ProveedorDB[]`
- Crear `proveedoresOptions` como `useMemo` mapeando `proveedores` a `{ value: nombre, label: nombre }`
- Cambiar la columna `proveedor` de `textColumn` a usar `GridSelectCell` con las opciones de proveedores (mismo patrón que "Desde"/"Hasta")

**2. `src/pages/Remitos.tsx`**
- Importar y llamar `useProveedores()`
- Pasar `proveedores` como prop a `RemitosDataGrid`

**3. `src/components/remitos/RemitoQuickFormDialog.tsx`** (si existe un campo proveedor en el formulario rápido)
- Verificar si tiene campo proveedor y también conectarlo

### Detalle técnico
- El valor almacenado sigue siendo el nombre del proveedor (string), no el ID, para mantener compatibilidad con datos existentes
- El `GridSelectCell` permite buscar por nombre con autocompletado

