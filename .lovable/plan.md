# Mejorar diseño del Excel de Liquidación por Cliente

Actualmente el Excel se genera con `xlsx` (SheetJS) sin estilos, ya que la versión community no soporta bordes/colores/fuentes. Para lograr tablas "lindas" hay que migrar la generación a **ExcelJS**, que sí soporta estilos completos.

## Cambios

### 1. Dependencia
- Instalar `exceljs` (ya soporta estilos: bordes, negritas, fills, alineación, formatos numéricos, anchos de columna).

### 2. Archivo: `src/components/remitos/LiquidacionClienteDialog.tsx`
Reemplazar la función `exportarExcel` para usar ExcelJS, manteniendo la misma lógica de datos (3 hojas: Liquidación, Liquidación General, Detalle Remitos).

**Estilo aplicado a las 3 hojas:**

- **Título de cliente** (hoja Liquidación): fila merge `A:E`, fondo rojo corporativo `#B00020`, texto blanco, negrita, tamaño 12, alineado a la izquierda con padding.
- **Encabezados de columnas**: fondo negro/gris oscuro `#0F0F0F`, texto blanco, negrita, centrado, bordes finos.
- **Filas de datos**: bordes finos grises en todas las celdas, alineación según tipo (texto izq., números der., unidad centro). Filas alternadas con fondo `#F7F7F7` (zebra).
- **Subtotal por cliente**: fondo gris claro `#E5E5E5`, negrita, borde superior grueso.
- **TOTAL GENERAL** / **TOTAL**: fondo rojo `#B00020`, texto blanco, negrita, borde superior grueso doble.
- **Formato numérico**:
  - Cantidad: `#,##0.00`
  - Viajes: `#,##0`
  - Precio Total / Precio Unitario: `"$"#,##0.00`
- **Anchos de columna** ajustados (más generosos que ahora).
- **Altura de filas** de encabezado y totales aumentada para respirar mejor.
- **Freeze panes**: congelar fila de encabezados en hojas "Liquidación General" y "Detalle Remitos".
- **AutoFilter** en la hoja "Detalle Remitos".

**Hoja "Liquidación General":**
- Encabezado estilizado, filas con bordes, fila TOTAL en rojo con texto blanco y negrita.

**Hoja "Detalle Remitos":**
- Encabezado oscuro con texto blanco, bordes en todas las celdas, zebra stripes, autofilter, freeze de la primera fila, formato de moneda en Precio Unitario y Precio Total, formato de fecha legible.

### 3. Sin cambios funcionales
- Misma estructura de hojas, mismos datos, mismo nombre de archivo.
- Sólo cambia el aspecto visual del Excel descargado.

## Notas técnicas
- `xlsx` se mantiene como dependencia (lo usan otros módulos: Remitos, Combustible, Vacaciones, etc.). Sólo este diálogo migra a ExcelJS.
- Descarga vía `workbook.xlsx.writeBuffer()` + `Blob` + link temporal.
