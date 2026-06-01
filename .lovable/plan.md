## Objetivo

En el diálogo "Liquidación por Cliente" (Remitos), agregar la posibilidad de liquidar también por **Cliente Cantera**, y que todos los totales (viajes, cantidad, precio total) se recalculen según el filtro elegido.

## Cambios propuestos

Archivo: `src/components/remitos/LiquidacionClienteDialog.tsx`

1. **Nuevo selector "Tipo de cliente"** arriba del selector de cliente, con tres opciones:
   - Cliente (actual: campo `cliente`)
   - Cliente destino (actual: campo `cliente_destino`)
   - Cliente cantera (nuevo: campo `cliente_cantera`)
   
   Por defecto queda en "Cliente / Cliente destino" (comportamiento actual combinado) para no romper el flujo existente.

2. **Lista de clientes únicos** se arma desde el campo seleccionado (en vez de unir siempre `cliente` + `cliente_destino`).

3. **Filtrado de remitos** del cliente elegido usa el campo seleccionado:
   - Cliente → `r.cliente === selected`
   - Cliente destino → `r.cliente_destino === selected`
   - Cliente cantera → `r.cliente_cantera === selected`

4. **Resumen y totales** (viajes, cantidad, precio total) se recalculan automáticamente sobre el subconjunto filtrado, agrupado por `tipo_material`, igual que hoy.

5. **Export a Excel**: el nombre del archivo incluye el tipo de cliente, ej. `Liquidacion_Cantera_<nombre>_<fecha>.xlsx`.

6. Cambiar el título del diálogo a "Liquidación por Cliente" (se mantiene) y mostrar un subtítulo o badge con el tipo de cliente activo para claridad.

## Fuera de alcance

- No se tocan tablas, RLS ni hooks (`useRemitos`); el campo `cliente_cantera` ya viene en `RemitoDB`.
- No se modifica la lógica de precios ni la generación de remitos.
