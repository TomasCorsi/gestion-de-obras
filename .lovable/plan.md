# Mejora de importación con IA en Órdenes de Compra

Hoy la IA detecta ítems, fecha, moneda y nombre del proveedor (texto libre). Falta:
1. Extraer el **N° de factura** del PDF/imagen y precargarlo en el campo "N° Factura Proveedor".
2. Asociar automáticamente el resultado a un **proveedor existente** por similitud de nombre/CUIT (en vez de quedar solo como texto).

## Cambios

### 1. Edge function `parse-orden-compra`
- Agregar campo `numero_factura` al schema de la tool `extract_orden_compra` (string, opcional).
- Actualizar el system prompt para que la IA reconozca:
  - "Factura N°", "Comprobante N°", "Nº", formato AFIP `0001-00012345` (punto de venta + número), letras A/B/C.
  - Distinguir N° de factura vs N° de remito / N° de pedido / CAE.
  - Normalizar al formato `PPPP-NNNNNNNN` cuando sea posible.
- También pedir `proveedor_cuit` (opcional, 11 dígitos sin guiones) para matching más confiable.

### 2. `ImportFacturaProveedorDialog.tsx`
- Agregar `numero_factura` y `proveedor_cuit` a `ParsedOrdenCompra`.
- Mostrarlos en la pantalla de preview ("Datos detectados").
- Pasarlos al `onImport`.

### 3. Matching de proveedor por similitud (en `OrdenCompraFormDialog.tsx`)
Cuando llega un `ParsedOrdenCompra` desde la IA:
- **Prioridad 1**: si `proveedor_cuit` coincide exacto con algún proveedor → seleccionarlo.
- **Prioridad 2**: similitud de nombre con la lista de `proveedores` activos:
  - Normalizar (minúsculas, sin tildes, sin "S.A."/"SRL"/"S.R.L."/"SA"/puntos/comas).
  - Calcular score con **distancia de Levenshtein normalizada** + bonus si uno contiene al otro.
  - Si el mejor score ≥ 0.75 → autoseleccionar proveedor.
  - Si está entre 0.5 y 0.75 → seleccionar pero mostrar toast "Proveedor sugerido: X (verificá)".
  - Si < 0.5 → no autoseleccionar, mostrar toast "No se encontró proveedor similar a '...'. Seleccionalo manualmente".
- Precargar `numero_factura` en el form.

### 4. Helper nuevo `src/utils/stringSimilarity.ts`
- `normalizeProveedorName(s: string)`: quita tildes, sufijos societarios, puntuación, espacios extra.
- `similarity(a, b)`: Levenshtein normalizado → 0..1.
- `findBestProveedorMatch(query, proveedores)`: devuelve `{ proveedor, score, byCuit }`.

## Archivos a modificar
- `supabase/functions/parse-orden-compra/index.ts` — schema + prompt.
- `src/components/proveedores/ImportFacturaProveedorDialog.tsx` — campos nuevos + preview.
- `src/components/proveedores/OrdenCompraFormDialog.tsx` — lógica de matching al recibir parsed.
- `src/utils/stringSimilarity.ts` — nuevo helper.

## Detalles técnicos
- No requiere migración de base de datos (la columna `numero_factura` ya existe).
- No cambia la UI principal del form, solo precarga campos.
- El matching corre 100% en cliente con la lista de proveedores ya cacheada por React Query.
