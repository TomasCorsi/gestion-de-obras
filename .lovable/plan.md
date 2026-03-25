

## Plan: PDF compacto con totales y rendimientos

### Objetivo
Reemplazar las tablas detalladas (línea por línea de cada carga, remito, mantenimiento) por un PDF de 1 página con resumen ejecutivo, totales por categoría y métricas de rendimiento.

### Estructura del nuevo PDF

```text
┌─────────────────────────────────────┐
│  LOGO          CALAMINA SUR S.A.    │
├─────────────────────────────────────┤
│  LIQUIDACIÓN DE MAQUINARIA/VEHÍCULO │
│  Período: dd/mm/yyyy - dd/mm/yyyy   │
├─────────────────────────────────────┤
│  DATOS DEL EQUIPO                   │
│  Código | Nombre | Tipo | Patente   │
│  Marca | Año | Estado               │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ RESUMEN DE GASTOS (tabla)   │    │
│  │ Combustible  | XX L | $XXX  │    │
│  │ Mantenimiento| X srv| $XXX  │    │
│  │ Remitos      | X rem| $XXX  │    │
│  │ ██ TOTAL         $XXX.XXX ██│    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  INDICADORES DE RENDIMIENTO (tabla) │
│  KM recorridos           | X.XXX   │
│  Horas máquina           | X.XXX   │
│  Costo por KM            | $XX     │
│  Costo por hora          | $XX     │
│  Litros por KM           | X.X     │
│  Litros por hora         | X.X     │
│  Costo combustible/km    | $XX     │
│  Promedio litros/carga   | XX L    │
│  Cant. cargas combustible| XX      │
├─────────────────────────────────────┤
│  CONDUCTORES DEL PERÍODO (tabla)    │
│  Nombre | Días operados             │
├─────────────────────────────────────┤
│  Firma / Fecha generación           │
└─────────────────────────────────────┘
```

### Cambios por archivo

**1. `src/utils/generateGastosMaquinariaPDF.ts`**
- Eliminar las 3 tablas detalladas (combustible línea por línea, mantenimientos línea por línea, remitos línea por línea)
- Convertir el "Resumen de gastos" en una tabla autoTable prolija con colores por categoría
- Agregar nueva sección "INDICADORES DE RENDIMIENTO" con métricas calculadas:
  - KM recorridos en el período
  - Horas máquina en el período (calculadas desde partes_diarios)
  - Costo por KM (gastoTotal / totalKm)
  - Costo por hora máquina (gastoTotal / horasMaquina)
  - Litros por KM, Litros por hora
  - Costo combustible por KM
  - Promedio litros por carga
  - Cantidad de cargas de combustible
- Agregar sección "CONDUCTORES DEL PERÍODO" con tabla compacta: nombre del conductor y cantidad de días operados
- Mantener el bloque GASTO TOTAL prominente con fondo rojo
- Actualizar la interfaz de la función para recibir datos de rendimiento (horas máquina, lista de conductores)

**2. `src/components/maquinarias/GastosMaquinaria.tsx`**
- Calcular horas máquina del período desde `partesDiarios` (horometro_fin - horometro_inicio)
- Calcular lista de conductores con días operados desde `partesDiarios`
- Pasar estos datos nuevos al generador de PDF
- Simplificar los datos que se pasan (ya no necesita arrays detallados de combustible/remitos/mantenimientos para el PDF, solo totales)

### Datos de rendimiento a calcular
- `horasMaquinaPeriodo`: suma de (horometro_fin - horometro_inicio) de partes_diarios filtrados
- `conductores`: mapa de nombre → cantidad de días únicos operados
- Ratios calculados en el PDF: costo/km, costo/hora, litros/km, litros/hora

