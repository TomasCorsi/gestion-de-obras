# Importar Orden de Compra desde Cotización/Factura con IA

Agregar un botón "Importar con IA" en el formulario de Orden de Compra que permita subir una cotización o factura de proveedor (PDF prioritariamente, también imagen y Excel) y prellenar automáticamente los ítems y datos generales.

## 1. Edge Function nueva: `parse-orden-compra`
Modelada a partir de `parse-computo`. Usa `google/gemini-2.5-flash` vía Lovable AI Gateway con **tool calling** para devolver JSON estructurado.

Recibe:
- `content`: data URL base64 (PDF/imagen) o texto plano (Excel).
- `type`: `"pdf" | "image" | "text"`.
- `instrucciones` (opcional).

Para `type: "pdf"`, mandar el PDF como `image_url` con data URL `data:application/pdf;base64,...` — Gemini multimodal lo procesa nativamente (igual que imágenes).

Estructura devuelta:
```
{
  proveedor_nombre?: string,
  fecha?: "YYYY-MM-DD",
  moneda?: "ARS" | "USD",
  incluir_iva?: boolean,
  iva_porcentaje?: number,
  condiciones_pago?: string,
  observaciones?: string,
  items: [{ descripcion, unidad, cantidad, precio_unitario }]
}
```

System prompt: experto en cotizaciones/facturas de proveedores en Argentina. Reglas: detectar IVA discriminado vs incluido, moneda (US$/USD vs $/ARS), unidades válidas (un, kg, m, m², m³, tn, hr, lt, gl, ml), normalizar números con coma decimal argentina.

Manejo de 429/402 con mensaje claro. CORS estándar.

## 2. Nuevo componente `ImportFacturaProveedorDialog.tsx`
Modelado a partir de `ImportComputoDialog`. Acepta:
- **PDF** (.pdf) → base64 → `type: "pdf"`. **Foco principal.**
- **Imagen** (.jpg/.png/.webp) → base64 → `type: "image"`.
- **Excel/CSV** (.xlsx/.xls/.csv) → parseo con SheetJS → texto → `type: "text"`.

UI:
- Drop zone + file input (acepta `.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv`, prioriza PDF en el copy).
- Textarea de instrucciones opcionales ("ignorá flete", "el IVA está incluido", etc.).
- Botón "Procesar con IA" con loader.
- Vista previa: proveedor detectado + tabla editable mínima de items para que el usuario confirme/corrija antes de importar.
- Botón "Usar estos datos" → callback `onImport(parsed)`.

Validar tamaño máximo (~10 MB) antes de mandar para no reventar la edge function.

## 3. Integración en `OrdenCompraFormDialog.tsx`
- Botón **"Importar con IA"** (icono `Sparkles`) en el header del dialog, al lado del título.
- Handler `onImport(parsed)`:
  - Match difuso de `proveedor_nombre` contra `proveedores` (normalizado, case-insensitive). Si matchea → setea `proveedor_id`. Si no → toast "Proveedor no encontrado, seleccionalo manualmente".
  - Setea `fecha`, `moneda`, `incluir_iva`, `iva_porcentaje`, `condiciones_pago`, `observaciones` **solo si el campo del form está vacío** (no pisa lo cargado).
  - **Reemplaza** la lista de items con los importados, recalculando `subtotal = cantidad * precio_unitario`.
- No toca `numero`, `estado` (queda `borrador`) ni `obra_id`.

## 4. UX y errores
- Loader durante procesamiento, botón deshabilitado.
- Errores específicos: 402 ("créditos de IA agotados"), 429 ("límite alcanzado, intentá en un momento"), archivo no soportado, archivo muy grande.
- Toast de éxito: "Se importaron N ítems desde la cotización".

## Archivos
**Crear:**
- `supabase/functions/parse-orden-compra/index.ts`
- `src/components/proveedores/ImportFacturaProveedorDialog.tsx`

**Modificar:**
- `src/components/proveedores/OrdenCompraFormDialog.tsx` (botón + handler de importación)

## Fuera de alcance
- Lógica de numeración, estados, RLS, PDF de OC.
- Módulo de cotizaciones (flujo análogo pero independiente).
- Crear proveedor nuevo si no matchea (queda manual en v1).
