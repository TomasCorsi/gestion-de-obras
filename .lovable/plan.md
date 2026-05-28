# Agregar columna "Artículo" en Órdenes de Compra

Sumar una columna **Artículo** (código/nombre corto del ítem) antes de la Descripción en la grilla de ítems de Órdenes de Compra. Queda como campo opcional de texto libre para identificar el material (ej: "HC-200", "Cemento Loma Negra 50kg").

## 1. Base de datos
Agregar columna `articulo TEXT` (nullable) en `orden_compra_items`. No requiere backfill ni cambios de RLS/grants.

## 2. Tipos y hook (`useOrdenesCompra.ts`)
- Agregar `articulo?: string | null` a `OrdenCompraItem` y `OrdenCompraItemForm`.
- Incluir `articulo` en los inserts/updates de items (create y update de OC).

## 3. Formulario (`OrdenCompraFormDialog.tsx`)
Nueva grilla de items con 7 columnas en `grid-cols-12`:

```text
Artículo (2) | Descripción (4) | Unidad (1) | Cantidad (2) | P.Unit (2) | Subtotal (1) | × (—)
```

- Header con la etiqueta nueva "Artículo".
- Input de texto para `articulo` antes del de descripción.
- `emptyItem()` incluye `articulo: ""`.
- Carga al editar mapea `articulo`.
- Importación con IA (`handleImport`) mapea `it.articulo` si viene.
- Botón eliminar mantiene su tamaño; ajustar `col-span` para que sume 12 (eliminar fila como icon button absoluto al final o reducir descripción a 4).

## 4. PDF (`generateOrdenCompraPDF.ts`)
Agregar columna "Artículo" en `autoTable`:
- Head: `["#", "Artículo", "Descripción", "Unidad", "Cantidad", "P. Unitario", "Subtotal"]`.
- Body incluye `it.articulo || "-"`.
- Ajustar `columnStyles` (ancho de artículo ~22mm, reducir descripción).

## 5. Importación con IA (`parse-orden-compra/index.ts` + dialog)
- Extender el JSON schema del tool calling con `articulo` (string, opcional) en cada item.
- Actualizar system prompt: "si el documento trae código/SKU/N° de artículo del proveedor, mapealo a `articulo`; el nombre largo va en `descripcion`".
- Tipar `ParsedOrdenCompra.items[].articulo?: string` en `ImportFacturaProveedorDialog.tsx` y propagar.

## Fuera de alcance
- Catálogo de artículos / autocomplete contra una tabla maestra.
- Validaciones de unicidad de código.
- Cambios en cotizaciones, remitos, certificados.

## Archivos
**Migración:** nueva (`ALTER TABLE orden_compra_items ADD COLUMN articulo TEXT`).
**Modificar:**
- `src/hooks/useOrdenesCompra.ts`
- `src/components/proveedores/OrdenCompraFormDialog.tsx`
- `src/components/proveedores/ImportFacturaProveedorDialog.tsx`
- `src/utils/generateOrdenCompraPDF.ts`
- `supabase/functions/parse-orden-compra/index.ts`
