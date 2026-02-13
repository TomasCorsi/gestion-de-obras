

## Mejora del selector de Obra en Certificados

### Cambio propuesto

Reemplazar el `Select` actual (que solo muestra un listado plano sin búsqueda) por el componente `Combobox` que ya existe en el proyecto (`src/components/ui/combobox.tsx`). Esto permite buscar obras por nombre, facilitando la selección cuando hay muchas obras cargadas.

### Detalle técnico

**Archivo: `src/pages/Certificados.tsx`**

1. Importar el componente `Combobox` desde `@/components/ui/combobox`.
2. Reemplazar el bloque `<Select>` de selección de obra (líneas 463-480) por un `<Combobox>` configurado con:
   - `options`: obras activas mapeadas a `{ value: id, label: nombre }`.
   - `placeholder`: "Seleccionar obra..."
   - `searchPlaceholder`: "Buscar obra..."
   - `value` / `onValueChange`: vinculados a `selectedObraId` / `setSelectedObraId`.
3. Mantener el filtro existente que solo muestra obras con estado "activa".
4. Eliminar las importaciones de `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` solo si ya no se usan en otro lugar del archivo (se usan en otros selects del mismo archivo, así que se mantienen).

