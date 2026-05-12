## Objetivo

Agregar un módulo de **Órdenes de Compra** dentro de la sección de Proveedores para registrar compras a proveedores destinadas a obras, con generación de PDF para enviar al proveedor.

## Decisiones acordadas

- **IVA**: separado, con switch "Incluye IVA 21%" (igual que cotizaciones/certificados).
- **Estado**: solo a nivel orden general (`borrador`, `emitida`, `recibida`, `cancelada`). Sin recepción parcial por ítem.
- **Stock**: no se integra ahora (se evalúa más adelante).
- **PDF**: imprimible y enviable al proveedor (logo, datos del proveedor, ítems, totales, condiciones).

## Cambios

### 1. Base de datos

**`ordenes_compra`**
- `numero` text (auto OC-0001 vía trigger)
- `fecha` date (default hoy)
- `proveedor_id` uuid → proveedores
- `obra_id` uuid → obras (nullable)
- `estado` text default `borrador` (`borrador` | `emitida` | `recibida` | `cancelada`)
- `incluir_iva` boolean default true
- `subtotal`, `iva`, `total` numeric
- `condiciones_pago` text, `fecha_entrega_estimada` date, `observaciones` text
- RLS: admin y capataz gestionan todo.

**`orden_compra_items`**
- `orden_id` uuid → ordenes_compra (ON DELETE CASCADE)
- `descripcion` text, `unidad` text, `cantidad` numeric, `precio_unitario` numeric, `subtotal` numeric
- `orden` integer (para ordenamiento manual)
- RLS: igual que la orden.

Trigger `BEFORE INSERT` en `ordenes_compra` para auto-numerar (OC-0001, OC-0002, …).

### 2. Página Proveedores con tabs

Convertir `src/pages/Proveedores.tsx` en página con dos pestañas (sincronizadas con URL):
- **Proveedores** (lo actual)
- **Órdenes de Compra** (nuevo)

### 3. Módulo Órdenes de Compra

Archivos nuevos:

- `src/hooks/useOrdenesCompra.ts` — CRUD react-query con items anidados.
- `src/components/proveedores/OrdenesCompraTab.tsx` — listado con filtros (proveedor, obra, estado, búsqueda por número), badges de estado.
- `src/components/proveedores/OrdenCompraFormDialog.tsx`:
  - Combobox proveedor, combobox obra (opcional), fecha, fecha entrega, condiciones de pago, estado.
  - Switch "Incluye IVA 21%".
  - Tabla de ítems editable (descripción, unidad, cantidad, precio unit., subtotal calculado, botón eliminar).
  - Botón "Agregar ítem".
  - Totales: subtotal, IVA (si corresponde), total — recalculados automáticamente.
- `src/components/proveedores/OrdenCompraDetailDialog.tsx` — vista de detalle con botones "Editar", "Cambiar estado" y "Generar PDF".
- `src/utils/generateOrdenCompraPDF.ts` — PDF jsPDF/autoTable con:
  - Logo + encabezado "Orden de Compra N° OC-XXXX"
  - Datos del proveedor (nombre, CUIT, dirección, contacto)
  - Datos de la empresa emisora
  - Obra destino (si aplica)
  - Tabla de ítems
  - Subtotal, IVA 21% (si incluir_iva), Total
  - Condiciones de pago, fecha de entrega, observaciones
  - Estilo coherente con cotizaciones.

## Resumen de archivos

```text
supabase migration                                  → 2 tablas + RLS + trigger numeración
src/pages/Proveedores.tsx                           → tabs Proveedores / Órdenes de Compra
src/hooks/useOrdenesCompra.ts                       → CRUD órdenes + items
src/components/proveedores/OrdenesCompraTab.tsx     → listado + filtros
src/components/proveedores/OrdenCompraFormDialog.tsx
src/components/proveedores/OrdenCompraDetailDialog.tsx
src/utils/generateOrdenCompraPDF.ts                 → PDF para enviar al proveedor
```
