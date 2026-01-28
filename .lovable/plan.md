
# Plan: Mejorar Filtros de Fecha y Agregar Buscador en Popovers

## Resumen

Voy a corregir el formato de las fechas en los filtros de columna para que se muestren como `dd/mm/yyyy` en lugar de `yyyy-mm-dd`, y voy a agregar un campo de búsqueda dentro de cada popover de filtro para que puedas encontrar valores específicos fácilmente cuando hay muchos.

## Cambios a Realizar

### 1. Formato de Fechas en Filtros

Las fechas se mostrarán correctamente como "27/01/2026" en lugar de "2026-01-27".

### 2. Buscador en Popovers de Filtro

Cada popover de filtro tendrá un campo de búsqueda arriba de la lista de opciones:
- Al escribir, la lista de opciones se filtra en tiempo real
- Búsqueda insensible a mayúsculas/minúsculas
- Se limpia automáticamente al cerrar el popover

## Detalles Técnicos

### `src/components/shared/GridFilterToolbar.tsx`

Modificar el componente `ColumnFilterHeader` para agregar:
- Un estado local para el término de búsqueda
- Un input de búsqueda compacto arriba de las opciones
- Filtrado de `uniqueValues` basado en el término de búsqueda
- Agregar una prop opcional `formatValue` para transformar el valor antes de mostrarlo

### `src/components/combustible/CombustibleDataGrid.tsx`

Actualizar el `filterConfig` de la columna `fecha`:
- Agregar `getValue` que formatee la fecha usando `formatDate()` de `@/lib/utils`

### `src/components/remitos/RemitosDataGrid.tsx`

Agregar la columna `fecha` al `filterConfigs`:
- Incluir `getValue` con formato `dd/mm/yyyy`

## Vista Previa del Filtro Mejorado

```
┌─────────────────────────────────┐
│ Filtrar por Fecha    [Limpiar] │
│ ┌─────────────────────────────┐ │
│ │ 🔍 Buscar...                │ │
│ └─────────────────────────────┘ │
│ ☑ 27/01/2026                    │
│ ☐ 26/01/2026                    │
│ ☐ 25/01/2026                    │
│ ...                             │
└─────────────────────────────────┘
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/shared/GridFilterToolbar.tsx` | Agregar buscador en popover + prop `formatValue` opcional |
| `src/components/combustible/CombustibleDataGrid.tsx` | Actualizar config de fecha con `getValue` formateado |
| `src/components/remitos/RemitosDataGrid.tsx` | Agregar fecha a filterConfigs con formato correcto |
