# Compras: separar Órdenes de Compra y Registro de Compras

## Para qué sirve cada una
- **Órdenes de Compra**: el pedido al proveedor, armado con su **cotización/presupuesto**. Todavía no hay factura.
- **Registro de Compras**: la **factura** del proveedor que llega después. Es lo que entra a la contabilidad (IVA, percepciones, asiento).

Hoy la carga con IA está solo en la Orden de Compra y pide datos de factura. Se invierte.

## Cambios

### 1. Orden de Compra (desde cotización)
- El botón de IA pasa a llamarse **«Importar cotización con IA»** y lee presupuestos del proveedor: proveedor, CUIT, fecha, moneda, ítems, precios e IVA.
- Se quitan del formulario los campos de factura: **N° de factura del proveedor, Percepción IVA y Percepción IIBB**.
- Se agrega un campo opcional **«N° de cotización del proveedor»** en las observaciones/encabezado.
- Las órdenes ya cargadas conservan su dato de factura (se sigue viendo en el detalle y el PDF si existe); no se borra nada.

### 2. Registro de Compras (desde factura)
- Nuevo botón **«Importar factura con IA»** en el formulario de comprobante de compra (PDF, foto o texto).
- Precarga: tipo (Factura A/B/C, NC), punto de venta y número, fecha y vencimiento, proveedor (buscado por CUIT entre los proveedores con ficha fiscal), ítems con neto e IVA, y percepciones IVA/IIBB/otras.
- Si el CUIT no coincide con ningún proveedor, avisa y deja elegirlo a mano. Todo queda editable y se guarda con las reglas actuales (borrador, asiento, repartos).
- Opcional: seleccionar la **Orden de Compra** de ese proveedor para traer sus ítems cuando no se quiere usar la IA.

## Detalles técnicos
- Edge function `parse-orden-compra`: prompt orientado a cotización; quitar `numero_factura`/percepciones del esquema.
- Nueva edge function `parse-factura-compra` (misma autenticación, gateway Lovable AI con salida estructurada) que devuelve tipo, pv, número, fechas, CUIT, ítems con alícuota y percepciones.
- `ComprobanteDialog.tsx` (solo compras): diálogo de importación reutilizando el patrón de `ImportFacturaProveedorDialog`; mapeo CUIT → maestro/tercero existente, nunca por nombre.
- `OrdenCompraFormDialog.tsx`: ocultar campos de factura sin migración (columnas quedan en la tabla).
- Vincular OC → comprobante: cargar ítems de la OC elegida; sin cambio de esquema en esta etapa.
