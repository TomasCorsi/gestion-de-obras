## Reporte adaptado para Canteras

Cuando la obra seleccionada en la pestaña **"Por Obra"** sea **"Cantera San Vicente"** o **"Canteras del Gaucho"**, cambiar el modo de cálculo y visualización del reporte para reflejar un modelo de **cantera** (venta de material) en lugar de obra cotizada.

### Detección

En `useReporteObra.ts`, marcar `esCantera = true` cuando `obra.nombre` (normalizado, sin tildes, lowercase) incluya `"cantera san vicente"` o `"canteras del gaucho"`. Exponer el flag en el objeto retornado.

### Cambios en cálculos (`useReporteObra.ts`)

- Agregar `ingresosRemitos = remitosTotal` (suma de `precio_total` de los remitos de esa cantera en el rango).
- Agregar `costoPersonal`: sumar costo de empleados que aparecieron en `partes_diarios` de la cantera. Cálculo: por empleado, `dias * (sueldo + sueldo_negro) / 22` (jornal estimado mensual/22). Traer `sueldo` y `sueldo_negro` desde `personal`. Mostrar el costo por persona en la tabla de Personal.
- Recalcular totales cuando `esCantera`:
  - `gastosTotal = combustibleCosto + ordenesCompraTotal + otrosGastosTotal + costoPersonal`
  - `balance = ingresosRemitos - gastosTotal`
  - `rentabilidad = ingresosRemitos > 0 ? (balance / ingresosRemitos) * 100 : 0`
- Cuando NO es cantera, el comportamiento actual se mantiene (cotizado vs gastos, sin costo personal).

### Cambios en UI (`ReporteObraTab.tsx`)

- KPIs en modo cantera: **Ingresos (Remitos)**, **Gastos Totales**, **Balance**, **% Margen**. Ocultar el KPI "Cotizado".
- Encabezado: badge "Cantera" cuando aplica.
- Sección **Remitos**: renombrar a **"Ingresos por Remitos"** con subtítulo "Ventas de material".
- Sección **Personal**: agregar columna **"Costo estimado"** (solo en modo cantera) con total al pie.
- Sección **Resumen Final**: tabla con filas Ingresos Remitos, Combustible, Personal, Órdenes de Compra, Gastos Generales, Total Gastos, **Balance**. Sin fila "Cotizado".

### Cambios en export Excel (`exportReporteObraExcel.ts`)

- Hoja **Resumen**: si `esCantera`, reemplazar fila "Cotizado" por "Ingresos Remitos" y agregar fila "Costo Personal"; mantener estilos.
- Hoja **Personal**: agregar columna "Costo estimado" en modo cantera con formato moneda y total resaltado.
- Hoja **Remitos**: encabezado "Ingresos por Remitos".

### Archivos a tocar

- `src/hooks/useReporteObra.ts` — detección de cantera, costo personal, totales adaptados.
- `src/components/reportes/ReporteObraTab.tsx` — KPIs/secciones/resumen condicionales.
- `src/utils/exportReporteObraExcel.ts` — hojas Resumen y Personal adaptadas.

### Notas / a confirmar

- **Costo de personal** asumo `(sueldo + sueldo_negro) / 22 * días trabajados` como costo diario estimado. Si preferís usar sueldo proporcional al mes calendario o un valor fijo por día, decímelo y lo ajusto.
- Las dos canteras se detectan por nombre exacto (insensible a mayúsculas/tildes). Si querés que sea por una marca explícita en la tabla `obras` (ej. campo `tipo`), avísame y lo cambio.
