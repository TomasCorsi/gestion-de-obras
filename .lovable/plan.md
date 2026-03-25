

# Agregar selección de Moneda (ARS/USD) en Cotizaciones

## Cambios

### 1. Migración de base de datos
Agregar columna `moneda` a la tabla `cotizaciones`:
```sql
ALTER TABLE cotizaciones ADD COLUMN moneda text NOT NULL DEFAULT 'ARS';
```

### 2. `src/hooks/useCotizaciones.ts`
- Agregar `moneda` al tipo `CotizacionForm` y `CotizacionDB` (tipo `string`, default `"ARS"`)
- Incluir `moneda` en las operaciones de create/update

### 3. `src/components/cotizaciones/CotizacionFormContent.tsx`
- Agregar un `Select` de moneda (ARS / USD) en la grilla de campos generales
- Actualizar `formatCurrency` para usar la moneda seleccionada (`ARS` → `$`, `USD` → `US$`)
- El formato se aplica a los totales de ítems, subtotal, IVA y total

### 4. `src/components/cotizaciones/CotizacionTable.tsx`
- Recibir `moneda` como prop y usar el formato correcto en todas las celdas de montos

### 5. `src/utils/generateCotizacionPDF.ts`
- Recibir `moneda` desde `cotizacion.moneda`
- Actualizar `formatCurrency` para formatear en ARS o USD según corresponda
- El PDF mostrará `$` o `US$` en todos los montos (precios unitarios, totales, subtotal, IVA, total)

