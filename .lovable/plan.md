## 1. Botón "Liquidar Obra"
Crear nuevo componente `src/components/remitos/LiquidacionObraDialog.tsx` (basado en `LiquidacionClienteDialog`) con estos cambios:
- Selector de **Obra** (en lugar de Cliente). Lista las obras únicas que aparecen en `desde` o `hasta` de los remitos filtrados.
- Filtra remitos donde `r.desde === obra || r.hasta === obra`.
- El resto (checkboxes por tipo de material, tabla resumen agrupada, totales, exportar Excel) se mantiene idéntico.
- Nombre de archivo Excel: `Liquidacion_Obra_<nombre>_<fecha>.xlsx`.

En `src/pages/Remitos.tsx`:
- Agregar estado `liquidacionObraOpen`.
- Añadir botón **"Liquidar Obra"** junto al botón "Liquidar" existente (dentro del bloque `!isOwnOnly`), con ícono `FileText`.
- Renderizar `<LiquidacionObraDialog>` pasando `remitos={filteredRemitos}` y `obras={obras}`.

## 2. Card "Cantidad Total" desglosada por unidad
Reemplazar el cálculo único `totalCantidad` por un agrupado por `unidad` (TN, M2, M3, etc.) sobre `filteredRemitos`:

```ts
const cantidadPorUnidad = filteredRemitos.reduce<Record<string, number>>((acc, r) => {
  const u = (r.unidad || "M3").toUpperCase();
  acc[u] = (acc[u] || 0) + (r.cantidad || 0);
  return acc;
}, {});
```

En la card "Cantidad Total" mostrar una lista compacta de líneas tipo `1.234 M3`, `560 TN`, `89 M2`, etc., ordenadas alfabéticamente. Si no hay datos, mostrar `0`. El ícono `Package` se mantiene.

## Fuera de alcance
- No se toca la lógica de filtros, RLS, ni el diálogo de Liquidación por Cliente existente.
- No se cambia el comportamiento de exportar Excel general ni del PDF.
