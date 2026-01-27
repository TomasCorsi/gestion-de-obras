
# Plan: Estandarizar Formato de Fechas a dd/mm/yyyy

## Resumen
Cambiar todas las fechas de la aplicación para que se muestren en formato **dd/mm/yyyy** (ej: 27/01/2026), creando una función centralizada para evitar inconsistencias.

## Situación Actual

La aplicación tiene **múltiples formatos de fecha** en diferentes lugares:
- Algunos usan `dd/MM/yyyy` (correcto)
- Otros muestran la fecha "cruda" de la base de datos en formato `yyyy-MM-dd`
- En FilterBar se usa `dd/MM/yy` (año corto)
- En algunos lugares se usa `dd MMM yyyy` (con nombre del mes)

## Solución Propuesta

### 1. Crear función utilitaria centralizada

Agregar en `src/lib/utils.ts` una función `formatDate` que:
- Acepta una fecha (string, Date, null o undefined)
- Retorna la fecha formateada como `dd/mm/yyyy`
- Maneja casos de fecha vacía devolviendo "-"

```text
Archivo: src/lib/utils.ts

Nueva función:
- formatDate(date: string | Date | null | undefined): string
  - Si no hay fecha -> devuelve "-"
  - Si es string tipo "2026-01-27" -> convierte y formatea
  - Si es Date -> formatea directamente
  - Formato de salida: "27/01/2026"
```

### 2. Actualizar componentes que muestran fechas

Los siguientes archivos serán actualizados para usar `formatDate()`:

**Páginas principales:**
- `src/pages/Obras.tsx` - Fechas en detalle (fecha_inicio, fecha_fin_estimada)
- `src/pages/Personal.tsx` - Fecha ingreso, vencimiento licencia en tabla y detalle
- `src/pages/Cotizaciones.tsx` - fecha_creacion, fecha_vencimiento en cards
- `src/pages/MantenimientoPage.tsx` - fecha en cards
- `src/pages/Gastos.tsx` - fechas en tabla y detalle
- `src/pages/Combustible.tsx` - fechas en tabla
- `src/pages/Presentismo.tsx` - fechas en tabla y detalle
- `src/pages/Viajes.tsx` - fechas
- `src/pages/Remitos.tsx` - fechas
- `src/pages/Stock.tsx` - fechas de movimientos

**Componentes del Dashboard:**
- `src/components/dashboard/RecentObras.tsx` - Ya usa dd/MM/yyyy (verificar)
- `src/components/dashboard/CotizacionesPendientes.tsx` - Ya usa dd/MM/yyyy (verificar)

**Componentes compartidos:**
- `src/components/shared/FilterBar.tsx` - Cambiar `dd/MM/yy` a `dd/MM/yyyy`
- `src/components/configuracion/UserManagement.tsx` - Cambiar `dd MMM yyyy` a `dd/MM/yyyy`
- `src/components/maquinarias/GastosMaquinaria.tsx` - Ya usa dd/MM/yyyy (verificar)
- `src/components/personal/CalendarioVacaciones.tsx` - Formateo de rangos de fechas

**Data Grids:**
- `src/components/remitos/RemitosDataGrid.tsx` - fechas en grilla
- `src/components/combustible/CombustibleDataGrid.tsx` - fechas en grilla

### 3. Patrón de cambio

**Antes (fecha cruda de DB):**
```text
<DetailRow label="Fecha" value={selectedCarga.fecha} />
// Muestra: "2026-01-27"
```

**Después (con formatDate):**
```text
<DetailRow label="Fecha" value={formatDate(selectedCarga.fecha)} />
// Muestra: "27/01/2026"
```

**Antes (con date-fns ya usando formato):**
```text
format(new Date(fecha), "dd MMM yyyy", { locale: es })
// Muestra: "27 ene 2026"
```

**Después:**
```text
formatDate(fecha)
// Muestra: "27/01/2026"
```

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/lib/utils.ts` | Agregar función `formatDate` |
| `src/pages/Obras.tsx` | Formatear fecha_inicio y fecha_fin_estimada en DetailRow |
| `src/pages/Personal.tsx` | Formatear fecha_ingreso y vencimiento_licencia en tabla y detalle |
| `src/pages/Cotizaciones.tsx` | Formatear fechas en cards (ya usa formato, verificar consistencia) |
| `src/pages/MantenimientoPage.tsx` | Formatear fecha en cards y detalle |
| `src/pages/Gastos.tsx` | Formatear fechas en tabla y DetailRow |
| `src/pages/Combustible.tsx` | Formatear fechas en tabla |
| `src/pages/Presentismo.tsx` | Formatear fechas en tabla y detalle |
| `src/pages/Viajes.tsx` | Formatear fechas en tabla y detalle |
| `src/pages/Remitos.tsx` | Formatear fechas |
| `src/pages/Stock.tsx` | Formatear fechas de movimientos |
| `src/components/shared/FilterBar.tsx` | Cambiar `dd/MM/yy` a `dd/MM/yyyy` |
| `src/components/configuracion/UserManagement.tsx` | Cambiar formato de created_at |
| `src/components/personal/CalendarioVacaciones.tsx` | Usar formato consistente |
| `src/components/remitos/RemitosDataGrid.tsx` | Formatear fechas |
| `src/components/combustible/CombustibleDataGrid.tsx` | Formatear fechas |

## Detalles Técnicos

### Función formatDate

```text
// En src/lib/utils.ts

import { format, parseISO } from "date-fns";

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, "dd/MM/yyyy");
  } catch {
    return "-";
  }
}
```

### Beneficios
- **Consistencia**: Todas las fechas se muestran igual en toda la app
- **Mantenibilidad**: Si se necesita cambiar el formato, se hace en un solo lugar
- **Seguridad**: La función maneja fechas nulas o inválidas graciosamente
- **Legibilidad**: El formato dd/mm/yyyy es más natural para usuarios hispanohablantes

### Notas
- Los inputs `type="date"` seguirán usando el formato nativo del navegador (yyyy-MM-dd internamente)
- Solo cambia la **visualización**, no el almacenamiento en la base de datos
- Las exportaciones a Excel/PDF también usarán este formato consistente
