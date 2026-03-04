

# Evitar títulos de sub categoría huérfanos en PDF

## Problema

Cuando una sub categoría (ej: "SEMANA 2") queda al final de una página, el título se renderiza solo sin sus filas de contenido, que pasan a la página siguiente. Esto es un problema clásico de "orphan header" en jsPDF-autotable.

## Solución

jsPDF-autotable tiene una opción `rowPageBreak: 'avoid'` pero no resuelve headers de grupo. La solución correcta es usar el callback `willDrawCell` de autoTable para detectar cuando una fila de encabezado de grupo (categoría o sub categoría) queda cerca del final de la página, y forzar un salto de página antes de dibujarla.

### Cambio en `generateServicioPDF` (`src/utils/generateCertificadoPDF.ts`)

Agregar la opción `didParseCell` o `willDrawCell` al `autoTable` call (línea ~442) para identificar las filas de encabezado de grupo (categoría y sub categoría) y usar `pageBreakBefore` para evitar que queden solas:

1. Marcar las filas de categoría y sub categoría en `tableData` con un flag (agregando metadata al array para saber cuáles son headers de grupo)
2. Usar el hook `willDrawCell` para verificar si la fila es un header de grupo y si queda menos de ~20mm hasta el final de la página. Si es así, forzar un salto de página.

Alternativa más simple: usar la propiedad `rowPageBreak: 'avoid'` junto con agrupar cada sub categoría header + sus items en un bloque que autoTable no separe. Pero la forma más confiable es trackear los índices de las filas header y usar `showHead: 'everyPage'` + el callback.

**Implementación concreta**: Guardar los índices de filas que son headers de grupo, y en el `willDrawPage` / `didDrawCell` callback, verificar si el header quedaría solo. La forma más directa en jsPDF-autotable es agregar `minCellHeight` o usar `rowPageBreak`. Sin embargo, lo más robusto es:

- Trackear los row indices de headers de categoría/sub categoría
- En `willDrawCell`, si es la primera celda de un header row y la posición Y + altura mínima necesaria (~15mm para header + al menos 1 fila) excede el límite de página, insertar un page break

### Archivo a modificar
1. `src/utils/generateCertificadoPDF.ts` — agregar lógica anti-orphan en `generateServicioPDF` y `generateObraPDF`

