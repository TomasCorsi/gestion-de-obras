## Objetivo

Agregar filtros por **Obra** y por **rango de fechas** en Rendimiento de Partes Diarios (subtabs Resumen General y Por Empleado). El rango de fechas reemplaza al actual selector de mes, permitiendo elegir cualquier período (un día, una semana, varios meses, o todo el año).

## Cambios

### 1. Hook `useParteDiarioResumenGeneral.ts`
- Cambiar firma: `(fechaDesde: Date, fechaHasta: Date, obraId?: string)` en vez de `(mes, anio)`.
- `queryKey` con `['partes_diarios_resumen_general', fechaDesde.toISOString(), fechaHasta.toISOString(), obraId]`.
- Reemplazar `startOfMonth/endOfMonth` por los parámetros recibidos.
- Agregar `obra_id` al `select` y aplicar `.eq('obra_id', obraId)` cuando esté definido.

### 2. Hook `useParteDiarioRendimiento.ts`
- Cambiar firma: `(empleadoId, fechaDesde: Date, fechaHasta: Date, obraId?: string)`.
- `queryKey` incluye fechas y obraId.
- `diasDelMes` pasa a ser `diasDelRango`: usar `eachDayOfInterval({ start: fechaDesde, end: fechaHasta })`. La estructura `DiaRendimiento` no cambia.
- Aplicar `.eq('obra_id', obraId)` cuando esté definido.

### 3. `ParteDiarioResumenGeneral.tsx`
- Eliminar `selectedMes/selectedAnio` y `monthOptions`. Reemplazar por estado `fechaDesde: Date` (default: primer día del mes actual) y `fechaHasta: Date` (default: hoy).
- Agregar **dos DatePickers** (shadcn Popover + Calendar, formato dd/mm/yyyy via `formatDate()`) — "Desde" y "Hasta".
- Validar `hasta >= desde` (si no, mostrar toast y revertir).
- Agregar **Combobox de Obra** (usa `useObras()`), con opción "Todas las obras" al tope, ancho ~240px.
- Atajos rápidos (botones pequeños tipo `variant="outline" size="sm"`): "Mes actual", "Mes anterior", "Últimos 30 días", "Año actual".
- Pasar `(fechaDesde, fechaHasta, selectedObraId || undefined)` al hook.

### 4. `ParteDiarioRendimientoTab.tsx` (subtab Por Empleado)
- Mismas modificaciones que el resumen general: `fechaDesde`, `fechaHasta`, `selectedObraId`, dos DatePickers, Combobox de obras, atajos rápidos.
- Eliminar el `<Select>` de mes y `monthOptions`.
- Pasar los nuevos parámetros al hook `useParteDiarioRendimiento`.

### 5. PDF (`generateParteDiarioPDF.ts`)
- Cambiar firma: aceptar `fechaDesde, fechaHasta` y opcional `obraNombre` en vez de `mes, anio`.
- Encabezado del PDF: "Período: dd/mm/yyyy al dd/mm/yyyy" y, si hay obra seleccionada, "Obra: {nombre}".
- Nombre del archivo: `parte-diario-{apellido}-{desde}_{hasta}.pdf`.

## UX

```
[ Empleado ▼ ] [ Obra ▼ ] [ Desde 01/06/2026 ] [ Hasta 18/06/2026 ]  [ Descargar PDF ]
[ Mes actual ] [ Mes anterior ] [ Últimos 30 días ] [ Año actual ]
```

DatePicker sigue el patrón shadcn (Popover + Calendar con `pointer-events-auto`), formato visual dd/mm/yyyy en el botón.

## Qué NO se toca
- BD, RLS, ni otros tabs (Listado/Admin/Home).
- Cálculo de checklist, horas o totales (la lógica deriva del array `partes`, que ahora viene filtrado por fecha+obra).

## Validación
- Resumen General: elegir rango "01/03/2024 a 31/03/2024" + obra X → tabla muestra solo empleados con partes en obra X en marzo 2024.
- Por Empleado: elegir rango de 60 días + obra → tabla diaria muestra los 60 días, totales y PDF reflejan solo esa obra.
- Sin obra ("Todas") + rango = año entero → muestra todo el año del empleado.
- Atajos rápidos actualizan correctamente ambos DatePickers.
