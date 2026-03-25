

## Plan: Mejorar el PDF de Gastos por Maquinaria/Vehículo

### Objetivo
Rediseñar el PDF para que sea un documento de liquidación claro, mostrando conductor/operador por registro, KM del período, y totales bien organizados y fáciles de leer.

### Datos nuevos a incorporar

1. **Conductor/Operador**: Ya disponible en `cargasRepartidor` (campo `operador`) y en `partes_diarios` (vía `personal_id`). Para combustible del repartidor, el operador ya viene en la query. Para remitos necesitamos cruzar con partes_diarios por maquinaria+fecha para obtener quién operaba ese día.

2. **KM recorridos**: Consultar `partes_diarios` filtrados por `maquinaria_id` en el período para sumar `km_camion`. Mostrar KM inicio/fin del período y total recorrido.

### Cambios por archivo

**1. `src/components/maquinarias/GastosMaquinaria.tsx`**
- Agregar query a `partes_diarios` filtrados por la maquinaria seleccionada para obtener:
  - Operador de cada día (nombre + apellido del personal)
  - KM por día (`km_camion`)
- Enriquecer `gastosUnificados` con campo `operador` cruzando fecha+maquinaria con partes_diarios
- Pasar datos de operadores y KM al PDF generator
- Agregar KM totales en las cards de resumen

**2. `src/utils/generateGastosMaquinariaPDF.ts`**
- Agregar interfaces nuevas: `OperadorPeriodo`, `KMData`
- **Sección "DATOS DEL VEHÍCULO"**: agregar fila con KM acumulados y KM del período
- **Tabla COMBUSTIBLE/INSUMOS**: agregar columna "Operador" con nombre del conductor
- **Tabla REMITOS**: agregar columna "Operador/Conductor"
- **Resumen de gastos**: incluir KM totales del período, mejorar layout con recuadros más claros
- **GASTO TOTAL**: hacerlo más prominente con fondo de color y fuente grande
- Mejorar estética general: mejor espaciado, totales destacados, categorías con colores más claros

### Estructura del PDF resultante

```text
┌─────────────────────────────────────┐
│  LOGO          CALAMINA SUR S.A.    │
│                CUIT / Dirección      │
├─────────────────────────────────────┤
│  REPORTE DE GASTOS POR MAQUINARIA   │
├─────────────────────────────────────┤
│  DATOS DEL VEHÍCULO                 │
│  Código | Nombre | Tipo | Marca     │
│  Patente | Año | Estado | Horas     │
│  KM Acumulados | KM del Período     │
├─────────────────────────────────────┤
│  RESUMEN DE GASTOS (recuadro)       │
│  Combustible:  $XXX  (XX L)         │
│  Remitos:      $XXX  (X remitos)    │
│  Mantenimiento:$XXX  (X servicios)  │
│  ─────────────────────────         │
│  ██ GASTO TOTAL: $XXX.XXX ██       │
├─────────────────────────────────────┤
│  COMBUSTIBLE / INSUMOS              │
│  Fecha|Producto|Litros|Operador|... │
│  Subtotal combustible: $XXX         │
├─────────────────────────────────────┤
│  MANTENIMIENTOS                     │
│  Fecha|Tipo|Descripción|Costo       │
│  Subtotal mantenimiento: $XXX       │
├─────────────────────────────────────┤
│  REMITOS / VIAJES                   │
│  Fecha|Nro|Material|Viajes|Oper|$   │
│  Subtotal remitos: $XXX             │
├─────────────────────────────────────┤
│  RESUMEN FINAL                      │
│  Tabla con totales por categoría    │
│  TOTAL GENERAL destacado            │
└─────────────────────────────────────┘
```

### Detalle técnico

- Se necesita una nueva query en `GastosMaquinaria.tsx` para traer partes_diarios por maquinaria:
  ```sql
  SELECT fecha, km_camion, personal:personal(nombre, apellido)
  FROM partes_diarios
  WHERE maquinaria_id = :id AND fecha BETWEEN :desde AND :hasta
  ```
- El cruce operador-gasto se hace por fecha (mismo día = mismo operador)
- Las tablas del PDF se separan por categoría (combustible, mantenimiento, remitos) cada una con sus columnas específicas en lugar de una tabla genérica
- Los totales se resaltan con fondos de color y fuentes más grandes

