

# Rendimiento por Obra en Partes Diarios

## Objetivo
Agregar una nueva pestaña "Por Obra" en la vista admin de Partes Diarios que muestre el rendimiento operativo de cada obra, con filtros por período (día, semana, mes, rango personalizado).

## Ubicación
Nueva pestaña en `ParteDiarioAdminView.tsx` (junto a Listado, Rendimiento, Faltantes). La grilla de tabs pasa de 3 a 4 columnas.

## Datos a mostrar por obra
Agrupando los `partes_diarios` por `obra_id`:
- **Partes completados / borradores**
- **Horas máquina totales** (horometro_fin - horometro_inicio)
- **Viajes totales** (cantidad_viajes)
- **Movimiento interno** (cantidad_movimiento_interno)
- **Combustible total** (combustible)
- **Empleados únicos** que trabajaron en esa obra
- **Tareas reportadas** (lista de tareas únicas)

## Filtros de período
Selector con opciones: Hoy, Esta semana, Este mes, Mes anterior, Rango personalizado (date pickers). Al cambiar el período se re-filtran los partes.

## Vista
1. **KPIs globales** del período: total partes, total horas máquina, total viajes, total combustible
2. **Tabla de obras** con columnas: Obra, Partes, Empleados, Hs Máquina, Viajes, Mov. Interno, Combustible
3. **Expandir obra** (click en fila) → detalle con tabla de empleados que trabajaron en esa obra y sus métricas individuales

## Archivos a crear/modificar

### Nuevo: `src/hooks/useRendimientoObras.ts`
Hook que recibe fechaDesde/fechaHasta, consulta `partes_diarios` con joins a personal/obras/maquinarias, y agrupa por obra calculando los totales.

### Nuevo: `src/components/parte-diario/ParteDiarioRendimientoObras.tsx`
Componente con:
- Selector de período (presets + rango custom)
- KPIs del período
- Tabla de obras con métricas agregadas
- Fila expandible con detalle por empleado

### Modificar: `src/components/parte-diario/ParteDiarioAdminView.tsx`
- Agregar 4ta pestaña "Por Obra" con ícono `Building2`
- TabsList grid-cols-3 → grid-cols-4
- Importar y renderizar `ParteDiarioRendimientoObras`

