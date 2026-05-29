## Número de factura del proveedor + edición de número de OC

**1. Migración:** Agregar columna `numero_factura` (TEXT, nullable) a `ordenes_compra` para registrar el número de la factura del proveedor asociada a la OC.

**2. Hook `useOrdenesCompra.ts`:**
- Agregar `numero_factura` a `OrdenCompraDB` y `OrdenCompraForm`.
- Incluir `numero_factura` en `buildPayload` (sanitizado a `null` si vacío).
- Agregar mutación `updateNumero(id, numero)` para editar el número de OC manualmente, exponerla en el return.

**3. Form `OrdenCompraFormDialog.tsx`:**
- Cuando se está editando, agregar un campo "N° Orden de Compra" editable (input texto) al inicio del formulario, junto a Proveedor/Fecha.
- Agregar campo "N° Factura Proveedor" (input texto, opcional) visible siempre.
- Pasar `numero` y `numero_factura` en `onSubmit` (extender props para que el componente padre maneje también el número manual de OC al guardar).
- Persistir cambio de `numero` vía nueva mutación o incluirlo dentro de `buildPayload` (incluir solo si se proporcionó, para no sobreescribir el autogenerado al crear).

**4. UI `OrdenesCompraTab.tsx`:**
- Mostrar columna `N° Factura` en la tabla (al lado de `N° OC`).

**5. PDF `generateOrdenCompraPDF.ts`:**
- Mostrar "N° Factura Proveedor" en el encabezado cuando esté presente.

**Archivos:** migración SQL, `useOrdenesCompra.ts`, `OrdenCompraFormDialog.tsx`, `OrdenesCompraTab.tsx`, `generateOrdenCompraPDF.ts`.