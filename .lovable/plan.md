## Agregar percepciones y moneda a Órdenes de Compra

### 1. Base de datos — `ordenes_compra`
Agregar columnas:
- `percepcion_iva` numeric default 0 — monto en moneda de la orden
- `percepcion_iibb` numeric default 0 — monto en moneda de la orden
- `iva_porcentaje` numeric default 21 — alícuota IVA editable
- `moneda` text default 'ARS' — valores `ARS` o `USD`

El `total` se recalcula como: `subtotal + iva + percepcion_iva + percepcion_iibb`.

### 2. Formulario (`OrdenCompraFormDialog.tsx`)
- **Selector de moneda** arriba (al lado de la fecha): `Pesos (ARS)` / `Dólares (USD)`. Cambia el símbolo mostrado en todos los inputs/labels de monto.
- En la sección de totales:
  - Switch "Incluir IVA" (existente) + input "% IVA" (default 21, editable, solo si está activo)
  - Input **"Percepción IVA"** — monto absoluto en la moneda elegida (default 0)
  - Input **"Percepción IIBB"** — monto absoluto en la moneda elegida (default 0, lo carga el usuario según lo que indique el proveedor)
  - Resumen en vivo: Subtotal / IVA X% / Perc. IVA / Perc. IIBB / **TOTAL** — todo con el símbolo de la moneda elegida.

### 3. Hook (`useOrdenesCompra.ts`)
- Tipos: agregar `moneda`, `iva_porcentaje`, `percepcion_iva`, `percepcion_iibb` en `OrdenCompraDB` y `OrdenCompraForm`.
- `calcTotales()`: recibe `iva_porcentaje`, `percepcion_iva`, `percepcion_iibb`; devuelve subtotal, iva, total con todo sumado.
- `createOrden` / `updateOrden`: persistir los nuevos campos.

### 4. Listado (`OrdenesCompraTab.tsx`)
- Mostrar el total formateado según la moneda de la orden (US$ o $) en lugar de forzar ARS.
- (Opcional pequeño) badge "USD" al lado del número cuando la moneda es dólares para identificar visualmente.

### 5. PDF (`generateOrdenCompraPDF.ts`)
- `formatCurrency()` recibe la moneda y muestra `$` (ARS) o `US$` (USD).
- En el bloque de totales mostrar (solo si > 0):
  - Subtotal
  - IVA X%
  - Percepción IVA
  - Percepción IIBB
  - **TOTAL** (en rojo, como ya está)
- Indicar la moneda en el encabezado del PDF (ej: "Moneda: Dólares (USD)") para que el proveedor lo vea claro.

### Comportamiento
- Si `incluir_iva = false`, el % IVA se ignora pero las percepciones siguen siendo editables.
- La moneda no convierte montos: solo cambia el símbolo y el rótulo. Los valores se cargan ya en la moneda elegida.
