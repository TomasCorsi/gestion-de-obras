

# Subtotales por categoría en los totales del PDF

## Cambio

Modificar las funciones de generación de totales en `src/utils/generateCertificadoPDF.ts` para que el bloque de totales muestre subtotales desglosados por categoría (ej: "Subtotal Ejecución de obra", "Subtotal Alquiler de Maquinas") en lugar de solo "Subtotal Obra" o "Subtotal Servicio".

## Detalle técnico

### Archivo: `src/utils/generateCertificadoPDF.ts`

**1. Función `generateMixtoPDF` (líneas 681-703)**
- En lugar de calcular un único `obraSubtotal` y `servicioSubtotal`, agrupar los ítems de cada sección por categoría usando `categoriaMap`
- Generar una línea de subtotal por cada categoría que tenga ítems (ej: "Subtotal Ejecución de obra:", "Subtotal Alquiler de Maquinas:")
- Mantener la línea de anticipo sobre obra después de los subtotales de categorías de obra
- Mantener "Subtotal General", "IVA" y "TOTAL" al final

**2. Función `generateServicioPDF` (líneas 478-485)**
- Agregar subtotales por categoría antes del subtotal general en el bloque de totales

**3. Función `generateObraPDF` (líneas 636-653)**
- Agregar subtotales por categoría antes de los totales de avance

El resultado visual será similar a la imagen de referencia pero con los nombres de categoría reales.

