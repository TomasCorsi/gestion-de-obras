

## Plan: Corregir PDF de Certificados — cantidad y items fantasma

### Problemas detectados

1. **Items fantasma**: Al generar el PDF de tipo "obra", el código (línea 657-679 de `Certificados.tsx`) inserta TODOS los conceptos activos de la obra, incluso los que el usuario no agregó al certificado. Crea items virtuales con cantidad=0 para rellenar.

2. **Cantidad no visible**: En el PDF tipo "obra", la tabla muestra "Cant. Tot." (cantidad total del concepto) pero NO la cantidad que el usuario ingresó para este período. Solo aparece como porcentaje (% Act.) pero no el número concreto.

### Cambios

**1. `src/pages/Certificados.tsx` — Eliminar merge de conceptos fantasma**
- Eliminar el bloque que crea items virtuales para todos los conceptos activos (líneas 657-679)
- Solo pasar al PDF los items reales del certificado
- Esto aplica al tipo "obra"; los acumulados se siguen calculando normalmente

**2. `src/utils/generateCertificadoPDF.ts` — Agregar columna "Cant." al PDF tipo obra**
- En la función `generateObraPDF`, agregar una columna "Cant." que muestre `item.cantidad` (la cantidad del período actual)
- Actualizar el header de la tabla para incluir esta columna
- Ajustar anchos de columnas para que entre la nueva columna

### Archivos a modificar
- `src/pages/Certificados.tsx` — quitar merge de items virtuales
- `src/utils/generateCertificadoPDF.ts` — agregar columna cantidad en PDF obra

