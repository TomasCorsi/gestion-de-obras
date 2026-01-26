
# Plan: Mejoras a la Seccion de Gastos por Maquinaria

## Objetivo
Agregar tres nuevas funcionalidades a la seccion de Gastos de Maquinarias:
1. Exportacion a Excel del detalle de gastos
2. Grafico de evolucion de gastos mensuales
3. Filtro por tipo de maquinaria

## Cambios Tecnicos

### Archivo modificado: `src/components/maquinarias/GastosMaquinaria.tsx`

#### 1. Exportacion a Excel

Se agregara un boton "Exportar" que generara un archivo Excel (.xlsx) con:
- Hoja con el resumen de totales
- Hoja con el detalle de todos los gastos

Se utilizara la libreria `xlsx` ya instalada en el proyecto (usada en LiquidacionesTab).

```text
Estructura del Excel:
+------------------------------------------+
| Hoja 1: Resumen                          |
| - Maquinaria seleccionada                |
| - Periodo de fechas                      |
| - Total Combustible ($X - Y litros)      |
| - Total Viajes (N viajes - Z km)         |
| - Total Mantenimientos ($M)              |
| - GASTO TOTAL                            |
+------------------------------------------+
| Hoja 2: Detalle                          |
| Fecha | Tipo | Descripcion | Obra | Costo|
+------------------------------------------+
```

#### 2. Grafico de Evolucion Mensual

Se agregara un grafico de barras apiladas mostrando la evolucion de gastos por mes:
- Eje X: Meses
- Eje Y: Costo total
- Barras apiladas: Combustible (amber), Mantenimiento (purple)

Se utilizara `recharts` (ya instalado) igual que en Reportes.tsx.

```text
+------------------------------------------+
|  Evolucion de Gastos Mensuales           |
|                                          |
|  |||     |||                             |
|  |||     |||  |||                        |
|  |||     |||  |||  |||                   |
|  ___________________________________     |
|  Ene   Feb   Mar   Abr                   |
|                                          |
|  [===] Combustible  [===] Mantenimiento  |
+------------------------------------------+
```

#### 3. Filtro por Tipo de Maquinaria

Se agregara un dropdown para filtrar las maquinarias del selector por tipo:
- Posicion: Antes del selector de maquinaria
- Opciones: Todos los tipos (cargadora, camion, compactador, etc.)
- Al cambiar el tipo, se filtra la lista de maquinarias disponibles

```text
+--------------------------------------------------+
|  [Tipo: Camion v]  [Maquinaria: 501-Camion v]    |
|  [Fecha desde]     [Fecha hasta]     [Limpiar]   |
+--------------------------------------------------+
```

## Estructura del Componente Actualizado

```text
GastosMaquinaria.tsx
|
+-- Estado nuevo: tipoFilter (string)
|
+-- Nuevo useMemo: maquinariasFiltradas (filtro por tipo)
|
+-- Nuevo useMemo: datosGraficoMensual (agrupacion por mes)
|
+-- Nueva funcion: exportarExcel()
|
+-- UI:
    +-- Fila de filtros
    |   +-- Select tipo maquinaria
    |   +-- Combobox maquinaria (filtrado)
    |   +-- Calendarios fecha
    |   +-- Boton Exportar Excel
    |
    +-- Tarjetas de resumen (existentes)
    |
    +-- NUEVO: Grafico de evolucion mensual
    |
    +-- Tarjeta gasto total (existente)
    |
    +-- Tabla detallada (existente)
```

## Logica de Agrupacion Mensual

```typescript
const datosGraficoMensual = useMemo(() => {
  const mesesMap = new Map<string, { combustible: number; mantenimiento: number }>();
  
  datosFiltrados.combustible.forEach((c) => {
    const mes = format(new Date(c.fecha), "yyyy-MM");
    const actual = mesesMap.get(mes) || { combustible: 0, mantenimiento: 0 };
    actual.combustible += c.costo_total || 0;
    mesesMap.set(mes, actual);
  });
  
  datosFiltrados.mantenimientos.forEach((m) => {
    const mes = format(new Date(m.fecha), "yyyy-MM");
    const actual = mesesMap.get(mes) || { combustible: 0, mantenimiento: 0 };
    actual.mantenimiento += m.costo_total || 0;
    mesesMap.set(mes, actual);
  });
  
  // Ordenar por mes y retornar array para recharts
  return Array.from(mesesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, data]) => ({
      mes: format(parseISO(mes + "-01"), "MMM yyyy", { locale: es }),
      combustible: data.combustible,
      mantenimiento: data.mantenimiento,
    }));
}, [datosFiltrados]);
```

## Logica de Exportacion Excel

```typescript
import * as XLSX from "xlsx";

const exportarExcel = () => {
  const maquinaria = maquinarias.find(m => m.id === selectedMaquinariaId);
  const workbook = XLSX.utils.book_new();
  
  // Hoja resumen
  const resumenData = [
    ["Gastos por Maquinaria"],
    [""],
    ["Maquinaria:", maquinaria?.nombre || ""],
    ["Codigo:", maquinaria?.codigo || ""],
    ["Periodo:", `${fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio"} - ${fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual"}`],
    [""],
    ["Combustible", `$${totales.totalCombustible.toLocaleString()}`, `${totales.totalLitros.toLocaleString()} L`],
    ["Viajes", `${totales.totalViajes}`, `${totales.totalKm.toLocaleString()} km`],
    ["Mantenimientos", `$${totales.costoMantenimientos.toLocaleString()}`, `${totales.totalMantenimientos} servicios`],
    [""],
    ["GASTO TOTAL", `$${totales.gastoTotal.toLocaleString()}`],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");
  
  // Hoja detalle
  const detalleData = [
    ["Fecha", "Tipo", "Descripcion", "Obra", "Costo"],
    ...gastosUnificados.map(g => [
      g.fecha ? format(new Date(g.fecha), "dd/MM/yyyy") : "",
      tipoConfig[g.tipo].label,
      g.descripcion,
      g.obra || "-",
      g.costo,
    ])
  ];
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
  XLSX.utils.book_append_sheet(workbook, wsDetalle, "Detalle");
  
  const fileName = `Gastos_${maquinaria?.codigo || "Maquinaria"}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
```

## Tipos de Maquinaria para el Filtro

Se reutiliza el objeto `tiposConfig` existente en el archivo:

```typescript
const tiposConfig: Record<TipoMaquinaria, string> = {
  cargadora: "Cargadora",
  compactador: "Compactador",
  camion: "Camion",
  camioneta: "Camioneta",
  // ... etc
};
```

## Resultado Visual

```text
+------------------------------------------------------------------+
|  GASTOS POR MAQUINARIA                              [Exportar v] |
+------------------------------------------------------------------+
|  [Tipo: Todos v]  [Maquinaria: 501-Camion v]                     |
|  [Desde]          [Hasta]           [Limpiar]                    |
+------------------------------------------------------------------+
|  +------------+  +------------+  +------------+                  |
|  | COMBUSTIBLE|  | VIAJES     |  | MANTENIM.  |                  |
|  | $123,456   |  | 45 viajes  |  | $56,789    |                  |
|  +------------+  +------------+  +------------+                  |
+------------------------------------------------------------------+
|  Evolucion de Gastos Mensuales                                   |
|  [Grafico de barras apiladas con Combustible y Mantenimiento]    |
+------------------------------------------------------------------+
|  GASTO TOTAL: $180,245                                           |
+------------------------------------------------------------------+
|  Detalle de Gastos (tabla existente)                             |
+------------------------------------------------------------------+
```

## Dependencias

- `xlsx` - Ya instalado (usado en LiquidacionesTab)
- `recharts` - Ya instalado (usado en Reportes y Dashboard)
- `date-fns` - Ya instalado

## Archivos a Modificar

- `src/components/maquinarias/GastosMaquinaria.tsx` - Agregar las 3 funcionalidades
