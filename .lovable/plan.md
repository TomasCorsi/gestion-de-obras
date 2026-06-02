## Desglose de "Liquidación" por Cliente y Tipo de Material

En `src/components/remitos/LiquidacionClienteDialog.tsx`, modificar la hoja "Liquidación" del Excel para que muestre el detalle agrupado **por cliente y por tipo de material**, en vez de consolidar todo en un único total general.

### Estructura propuesta de la hoja "Liquidación"

Columnas:
- Cliente
- Tipo Material
- Viajes
- Cantidad
- Unidad
- Precio Total

Filas:
- Por cada cliente seleccionado, una fila por cada `tipo_material` con sus totales.
- Una fila **Subtotal** por cliente (Cliente = "Subtotal [Nombre]", Tipo Material vacío).
- Al final, una fila **TOTAL GENERAL** con la sumatoria de todos los clientes.

Ejemplo:

```text
Cliente            | Tipo Material | Viajes | Cantidad | Unidad | Precio Total
-------------------|---------------|--------|----------|--------|-------------
Cliente A          | Arena         |  10    |  120     | M3     |  240.000
Cliente A          | Piedra        |   5    |   60     | M3     |  150.000
Subtotal Cliente A |               |  15    |  180     |        |  390.000
Cliente B          | Arena         |   8    |   96     | M3     |  192.000
Subtotal Cliente B |               |   8    |   96     |        |  192.000
TOTAL GENERAL      |               |  23    |  276     |        |  582.000
```

### Detalles técnicos

- Agregar un nuevo memo `resumenPorCliente` que agrupe `remitosCliente` (filtrados por `selectedTypes`) primero por cliente (según `tipoCliente` activo: `cliente`, `cliente_destino` o `cliente_cantera`; en modo `cliente_o_destino` usar el cliente que coincide con la selección, priorizando `cliente`) y luego por `tipo_material`.
- Construir `data` de `exportarExcel` recorriendo cada cliente ordenado alfabéticamente, agregando sus filas por tipo, su subtotal y al final el total general.
- Mantener formato numérico actual (sin formateo especial — Excel los toma como números).
- La hoja "Detalle Remitos" no se modifica.

### UI de la tabla resumen en pantalla

Aplicar el mismo desglose por cliente y tipo dentro del `<Table>` del diálogo (con filas de subtotal y total general en `bg-muted/50 font-bold`) para que lo visto coincida con lo exportado.

### Archivos afectados

- `src/components/remitos/LiquidacionClienteDialog.tsx` (única edición)
