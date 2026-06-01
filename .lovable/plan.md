## Objetivo

Que el importador con IA de Órdenes de Compra (facturas PDF/imagen/texto de proveedor) detecte automáticamente, además de los datos actuales:

- **Percepción IVA** (monto en $)
- **Percepción IIBB** (monto en $)
- **IVA discriminado** (ya se detecta, se refuerza el prompt para que siempre marque `incluir_iva` y `iva_porcentaje` cuando figure el monto del IVA en la factura)

Estos valores se precargan en los campos correspondientes del formulario de Orden de Compra.

## Cambios

### 1. `supabase/functions/parse-orden-compra/index.ts`
- Ampliar el **system prompt** con reglas para reconocer:
  - "Percepción IVA", "Perc. IVA", "Percep. IVA", "RG 3337", etiquetas tipo "IVA Percepción".
  - "Percepción IIBB", "Perc. IIBB", "IIBB", "Ingresos Brutos", percepciones provinciales (ARBA, AGIP, etc.). Tomar el monto, no la alícuota.
  - Aclarar que son **montos finales en la moneda de la factura**, normalizados a número (coma decimal AR → punto).
  - Si una percepción no aparece, devolver `0` (no inventar).
  - Reforzar detección de IVA: si en el comprobante figura "IVA 21%", "IVA Inscripto", monto de IVA discriminado → `incluir_iva = true` y `iva_porcentaje` = alícuota detectada (21, 10.5, 27).
- Agregar al `tool` `extract_orden_compra` dos propiedades nuevas en `parameters.properties`:
  - `percepcion_iva: { type: "number" }`
  - `percepcion_iibb: { type: "number" }`

### 2. `src/components/proveedores/ImportFacturaProveedorDialog.tsx`
- Extender la interfaz `ParsedOrdenCompra` con `percepcion_iva?: number` y `percepcion_iibb?: number`.
- En el bloque de preview (debajo de IVA), mostrar las percepciones cuando vienen > 0 (`Perc. IVA` y `Perc. IIBB` con `fmtMoney`).

### 3. `src/components/proveedores/OrdenCompraFormDialog.tsx`
- En `handleImport` (alrededor de línea 112), tras los campos de IVA, copiar al form:
  - `if (typeof parsed.percepcion_iva === "number" && parsed.percepcion_iva > 0) next.percepcion_iva = parsed.percepcion_iva;`
  - `if (typeof parsed.percepcion_iibb === "number" && parsed.percepcion_iibb > 0) next.percepcion_iibb = parsed.percepcion_iibb;`

## Fuera de alcance

- Cambios de UI en el formulario (los inputs Percepción IVA / IIBB ya existen).
- Cambios en la base de datos (las columnas `percepcion_iva` y `percepcion_iibb` ya existen en `ordenes_compra`).
