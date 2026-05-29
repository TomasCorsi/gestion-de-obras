## Cambios

### 1. Base de datos (migración)
- `ordenes_compra`: agregar `maquinaria_id` (uuid, opcional, FK → `maquinarias(id)` ON DELETE SET NULL) y `sector` (text, opcional).
- `otros_gastos`: agregar `sector` (text, opcional).

### 2. Sector como desplegable
Opciones fijas en un `Select`:
- Taller
- Obra
- Oficina
- Depósito
- Vehículos
- Otros

Se guarda como texto. Constante compartida en `src/components/proveedores/sectores.ts` para reutilizar en OC y Gastos Generales.

### 3. Órdenes de compra
- `OrdenCompraFormDialog`: agregar selector **Maquinaria** (combobox con código + patente + nombre, opcional, igual estilo que en Gastos Generales) y desplegable **Sector**.
- `useOrdenesCompra`: incluir `maquinaria_id` y `sector` en tipos, payload y query (embed `maquinaria:maquinarias(id, codigo, nombre, patente, tipo)`).
- `OrdenesCompraTab` / detalle: mostrar Maquinaria y Sector.
- `generateOrdenCompraPDF`: agregar Maquinaria y Sector en el encabezado.

### 4. Gastos Generales
- `GastosGeneralesTab`: agregar desplegable **Sector** al lado del selector de Maquinaria, mostrar el sector en la grilla/detalle.
- `useOtrosGastos`: incluir `sector` en tipos y payload.

### 5. Sin filtros nuevos por ahora
Solo carga y visualización; el filtro por sector se puede sumar luego si hace falta.

## Archivos
- Migración SQL nueva.
- `src/components/proveedores/sectores.ts` (nuevo, lista compartida).
- `src/hooks/useOrdenesCompra.ts`
- `src/hooks/useOtrosGastos.ts`
- `src/components/proveedores/OrdenCompraFormDialog.tsx`
- `src/components/proveedores/OrdenesCompraTab.tsx`
- `src/components/proveedores/GastosGeneralesTab.tsx`
- `src/utils/generateOrdenCompraPDF.ts`