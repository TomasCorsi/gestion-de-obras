

## Plan: Eliminar columnas "Categoría" y "Cant. Tot." del PDF de certificados

### Cambios en `src/utils/generateCertificadoPDF.ts`

**En `generateObraPDF` (~líneas 558-670):**

1. **Header row** (línea 558): Quitar "Categoría" y "Cant. Tot." del array → quedan 11 columnas: `["Concepto", "V. Unit.", "Cant.", "V. Total", "% Ant.", "% Act.", "% Acum.", "Av. Ant.", "Av. Act.", "Av. Acum.", "Obs."]`

2. **Category/etapa colSpan** (líneas 566-580): Cambiar `colSpan: 13` → `colSpan: 11`

3. **Data rows** (líneas 608-622): Eliminar la celda de categoría (índice 1) y la celda de cantTotal (índice 3)

4. **Subtotal row** (líneas 626-632): Cambiar `colSpan: 9` → `colSpan: 7`

5. **columnStyles** (líneas 642-656): Reindexar quitando los índices de Categoría (1) y Cant.Tot. (3), ajustar anchos de las 11 columnas restantes

**En `generateServicioPDF`:** Esta función no tiene "Categoría" ni "Cant. Tot." como columnas separadas, así que no requiere cambios.

**En `generateMixtoPDF`:** Usa `generateObraPDF` internamente, se hereda automáticamente.

