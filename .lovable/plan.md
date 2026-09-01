# Gráficos estilo Power BI en el Tablero de Obras

Sumar una capa visual de gráficos al tablero, manteniendo los KPIs y los paneles por obra que ya existen.

## Qué se agrega

**1. Tendencia de los últimos 30 días (gráfico de área/líneas)**
- Una línea por obra seleccionada (hasta 3), con selector de métrica: Movimientos, m³ u Horas.
- Eje X por día, tooltip con los valores de todas las obras.

**2. Comparativa entre obras (barras)**
- Barras agrupadas comparando las obras del tablero en m³ del mes, horas del mes y movimientos del mes.

**3. Distribución de gastos del mes (dona)**
- Participación de cada obra sobre el gasto total del mes, con porcentaje y monto.

**4. Mini-gráfico dentro de cada panel de obra**
- Sparkline de los últimos 14 días de actividad, debajo de las métricas de la tarjeta.

**5. Estado de maquinaria (barra apilada horizontal)**
- Por obra: en uso vs. disponible vs. en mantenimiento.

## Comportamiento

- Los gráficos respetan las obras seleccionadas y se actualizan con el mismo refresco del tablero (incluido el auto-refresco de 60s en modo TV).
- En modo pantalla completa (TV): tipografía y trazos más grandes, leyendas visibles y sin controles administrativos; se muestran tendencia, comparativa y gastos.
- Paleta acorde a la identidad: rojo #B00020 como color principal y grises oscuros para las series secundarias, sobre fondo oscuro.
- Estados de carga con skeletons y mensaje claro cuando no hay datos en el período.

## Detalles técnicos

- Librería: `recharts` (ya usada en `ViajesChart`).
- Nuevo hook `useTableroSeries(obraIds)`: consulta `partes_diarios` y `remitos` de los últimos 30 días agrupando por obra y día; reutiliza el patrón de `useTableroObras` y comparte `queryKey` de refresco.
- Nuevos componentes en `src/components/dashboard/`: `TendenciaObrasChart.tsx`, `ComparativaObrasChart.tsx`, `GastosDistribucionChart.tsx`, `MaquinariaEstadoChart.tsx` y `ObraSparkline.tsx`.
- `Dashboard.tsx`: nueva sección de gráficos debajo de los KPIs, con grilla responsive (1 col en móvil, 2-3 en escritorio) y variante compacta para TV.
- `ObraPanel.tsx`: recibe la serie diaria de su obra para el sparkline.
- Sin cambios de esquema en la base de datos.
