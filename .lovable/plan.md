# Fix: Error al descargar PDF de cotización

## Causa

La cotización `2026-049` (la del screenshot) tiene el campo `responsable` vacío en la base de datos. El generador de PDF (`src/utils/generateCotizacionPDF.ts`) lo pasa directamente a jsPDF:

```ts
doc.text(cotizacion.responsable, margin + 102, yPos + 3);
```

`jsPDF.text()` lanza una excepción cuando recibe `null` o `undefined`, lo que dispara el `catch` en `Cotizaciones.tsx` y muestra el toast "Error al generar el PDF".

Otros campos opcionales tienen el mismo riesgo latente (`cotizacion.descripcion`, `cat.nombre`, `item.unidad`, `item.numero`, fechas, etc.) — basta que cualquiera sea `null` para romper la descarga.

## Cambio

Editar **solo** `src/utils/generateCotizacionPDF.ts`:

1. Agregar un helper `safeText(v) => String(v ?? "")` y usarlo en todas las llamadas `doc.text(...)` que reciban un campo de la cotización (responsable, descripcion, obraNombre, fechas, número).
2. Defaultear los campos de items/categorías antes de armar la tabla:
   - `cat.nombre ?? ""` antes de `.toUpperCase()`
   - `item.unidad ?? ""` antes de `.toUpperCase()`
   - `item.numero ?? ""`
   - `item.total ?? item.subtotal ?? 0` (evita `NaN` en subtotales).
3. Mostrar `"-"` cuando `responsable` esté vacío, en lugar de string vacío, para que el PDF quede prolijo.

No se tocan datos, hooks ni RLS. No hay migración.

## Verificación

- Descargar PDF de la cotización 2026-049 (sin responsable) → debe funcionar.
- Descargar PDF de una cotización completa (ej. 2026-010) → sigue funcionando igual que antes.
