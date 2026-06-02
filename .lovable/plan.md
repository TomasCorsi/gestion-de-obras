## Exportación de liquidación por cliente: desglose por cliente + hoja resumen general

En `src/components/remitos/LiquidacionClienteDialog.tsx`, modificar `exportarExcel()` para que el workbook tenga **tres hojas**. La UI del diálogo no cambia.

### Hoja 1 — "Liquidación" (con desglose por cliente)

Por cada cliente seleccionado (ordenado alfabéticamente) se imprime un bloque con sus tipos de material:

```
Cliente: ACME S.A.
Tipo Material | Viajes | Cantidad | Unidad | Precio Total
Arena         |   12   |   180    |  M3    | $360.000
Piedra        |    5   |    75    |  M3    | $225.000
Subtotal ACME |   17   |   255    |        | $585.000
(fila en blanco)
```

Al final, fila **TOTAL GENERAL** sumando todos los clientes.

### Hoja 2 — "Liquidación General" (nueva)

Resumen compacto, solo dos columnas:

```
Cliente        | Precio Total
ACME S.A.      | $585.000
Otro Cliente   | $835.000
TOTAL          | $1.420.000
```

- Una fila por cliente seleccionado, ordenada alfabéticamente.
- Última fila TOTAL con la suma.
- Solo refleja los tipos de material incluidos en `selectedTypes`.

### Hoja 3 — "Detalle Remitos"

Sin cambios respecto a lo ya implementado (una fila por remito con todas las columnas detalladas).

### Detalles técnicos

- Calcular `resumenPorCliente`: para cada cliente en `selectedClientes`, filtrar `remitosCliente` que correspondan a ese cliente (según `tipoCliente`) y `selectedTypes`, y agrupar por `tipo_material` (misma lógica del `resumen` actual, pero scoped por cliente). Saltar clientes sin datos.
- Hoja "Liquidación": usar `XLSX.utils.aoa_to_sheet` (array of arrays) para permitir filas heterogéneas (encabezado de cliente, headers, datos, subtotal, fila vacía, TOTAL GENERAL). Columnas: `Tipo Material | Viajes | Cantidad | Unidad | Precio Total`. Anchos fijos (~22, 10, 12, 10, 16).
- Subtotal por cliente: suma de viajes, cantidad y precio total. Unidad queda vacía si los tipos mezclan unidades, sino la unidad común.
- Hoja "Liquidación General": `XLSX.utils.aoa_to_sheet` con header `["Cliente", "Precio Total"]`, una fila por cliente con su total, y fila final `["TOTAL", sumaTotal]`. Anchos ~30 y 16.
- Hoja "Detalle Remitos": mantener la generación actual sin cambios.
- Orden de hojas en el workbook: Liquidación → Liquidación General → Detalle Remitos.

### Archivos afectados

- `src/components/remitos/LiquidacionClienteDialog.tsx` (única edición, solo dentro de `exportarExcel`)
