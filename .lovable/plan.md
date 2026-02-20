

## Reemplazar grilla por tabla editable simple

### Problema
La libreria `react-datasheet-grid` tiene problemas persistentes con el menu contextual (click derecho) dentro de dialogos, impidiendo eliminar filas.

### Solucion
Reemplazar `CertificadoServiceGrid` con una tabla HTML editable simple (igual que ya funciona la seccion "Obra"), usando inputs inline y un boton de eliminar por fila. Este patron ya esta probado y funciona perfectamente en el mismo dialogo.

### Cambios

**Archivo: `src/components/certificados/CertificadoServiceGrid.tsx`** - Reescritura completa

- Eliminar toda dependencia de `react-datasheet-grid`
- Usar componentes `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (ya usados en la seccion Obra)
- Cada fila tiene:
  - **Descripcion**: `<Input>` de texto
  - **Categoria**: `<Select>` con las categorias existentes
  - **Sub Categoria**: `<Input>` de texto
  - **Unidad**: `<Select>` con las unidades
  - **Cantidad**: `<Input type="number">`
  - **P. Unitario**: `<Input type="number">`
  - **Subtotal**: campo calculado (solo lectura)
  - **Eliminar**: boton con icono Trash2 (igual que en seccion Obra)
- Boton "+ Agregar fila" al final de la tabla
- Total general al pie

### Ventajas
- Mismo patron que la seccion Obra, que ya funciona sin problemas
- Sin dependencias externas complejas
- Eliminar filas funciona con un simple boton, sin depender de menus contextuales
- Codigo mas simple y mantenible

### Detalle tecnico
- Se mantiene la misma interfaz (`CertificadoServiceGridProps`) para no tocar `Certificados.tsx`
- La logica de `onItemsChange` se invoca en cada cambio de campo individual
- Se usa `useCallback` para las funciones de update/delete/add
