## Actualización de precios de remitos

### 1. Regla nueva DESDE/HASTA (según imagen)
- **Campo el Tatu (202) → LOTE 306 - POLO EZEIZA (337)**: precio unitario **$2.500**, modo **Cantidad × Precio**.

### 2. Regla por material "Cascote"
- Todos los remitos con `tipo_material = 'Cascote'` (69 remitos detectados): precio unitario **$22.500**, modo **Cantidad × Precio**.

### 3. Ejecución
- Un único SQL con dos `UPDATE` sobre la tabla `remitos`:
  - `UPDATE` filtrando por `desde = 'Campo el Tatu'` y `hasta = 'LOTE 306 - POLO EZEIZA'` → setea `precio_unitario = 2500`, `precio_calc_mode = 'cantidad'`, `precio_total = COALESCE(cantidad,0) * 2500`.
  - `UPDATE` filtrando por `tipo_material = 'Cascote'` → setea `precio_unitario = 22500`, `precio_calc_mode = 'cantidad'`, `precio_total = COALESCE(cantidad,0) * 22500`.
- Sin cambios de schema ni de código — sólo datos.

### 4. Orden de aplicación
- Si un remito de cascote también coincide con DESDE/HASTA 202→337, **gana la regla de Cascote** ($22.500). Por eso se aplica primero la regla DESDE/HASTA y luego la de Cascote (sobrescribe si corresponde).

### 5. Verificación
- `SELECT` post-update agrupado mostrando: cantidad de remitos actualizados y suma de `precio_total` por cada regla.
