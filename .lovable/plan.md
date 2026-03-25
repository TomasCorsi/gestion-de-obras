

## Plan: PDF compacto mejorado - sin tabla de rendimientos, con conductor y viajes por tipo

### Objetivo
Simplificar el PDF sacando la tabla de indicadores de rendimiento, moviendo el conductor principal a la sección de datos del equipo, y agregando un desglose de viajes por tipo de material/transporte.

### Cambios por archivo

**1. `src/utils/generateGastosMaquinariaPDF.ts`**
- **Eliminar** toda la sección "INDICADORES DE RENDIMIENTO" (tabla de 9 filas con costo/km, litros/hora, etc.)
- **Eliminar** la tabla separada de "CONDUCTORES DEL PERÍODO"
- **Agregar en "DATOS DEL EQUIPO"**: una 4ta fila con conductor(es) principal(es) y KM del período
- **Agregar nueva sección "ACTIVIDAD DEL PERÍODO"**: tabla con desglose de viajes por tipo de material (Desmonte, Cascote, Residuos, etc.), cantidad de movimientos internos, total de viajes, y cantidad de cargas de combustible
- **Mejorar el resumen de gastos**: incluir más detalle en cada fila (ej: "XX cargas" en combustible, viajes totales en remitos)
- Actualizar la interfaz `RendimientoData` para recibir datos de actividad (viajes por tipo, movimientos internos)
- Resultado: PDF más limpio, 1 página, fácil de leer

**2. `src/components/maquinarias/GastosMaquinaria.tsx`**
- Calcular desde `partesDiarios` filtrados: total `cantidad_viajes` y total `cantidad_movimiento_interno`
- Calcular desde `datosFiltrados.remitos`: agrupación por `tipo_material` con cantidad de viajes por cada tipo
- Pasar estos datos nuevos al generador de PDF en `rendimientoData`

### Estructura del PDF resultante

```text
┌─────────────────────────────────────┐
│  LOGO          CALAMINA SUR S.A.    │
├─────────────────────────────────────┤
│  LIQUIDACIÓN DE MAQUINARIA/VEHÍCULO │
│  Período: dd/mm/yyyy - dd/mm/yyyy   │
├─────────────────────────────────────┤
│  DATOS DEL EQUIPO                   │
│  Código | Nombre     | Patente      │
│  Tipo   | Marca      | Año          │
│  Estado | Horas acum | KM acum      │
│  Conductor(es): Juan P. (15 días)   │
│  KM Período: 2.350 km | Hs: 120    │
├─────────────────────────────────────┤
│  RESUMEN DE GASTOS                  │
│  Combustible  | 500 L (12 cargas)   │
│  Mantenimiento| 3 servicios         │
│  Remitos      | 8 rem - 45 viajes   │
│  ██ GASTO TOTAL: $XXX.XXX ██       │
├─────────────────────────────────────┤
│  ACTIVIDAD DEL PERÍODO             │
│  Desmonte        | 25 viajes        │
│  Cascote         | 12 viajes        │
│  Residuos        | 8 viajes         │
│  Mov. Internos   | 15               │
│  Cargas Comb.    | 12               │
│  Total Viajes    | 45               │
├─────────────────────────────────────┤
│  Firma / Fecha generación           │
└─────────────────────────────────────┘
```

### Detalle técnico
- Viajes por tipo de material: agrupar `datosFiltrados.remitos` por campo `tipo_material`, sumando `cantidad_viajes` de cada uno
- Movimientos internos: sumar `cantidad_movimiento_interno` de `partesDiarios` filtrados por período
- Conductor principal: tomar el de más días del array `conductores` existente y mostrarlo inline en datos del equipo
- Si hay múltiples conductores, listarlos todos en la sección de datos

