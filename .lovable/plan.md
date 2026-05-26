## Diagnóstico

La sección Remitos hoy carga **~2.064 registros** en memoria y los renderiza todos a la vez en una tabla HTML de **22 columnas** (≈ 45.000 celdas en el DOM). Esa es la causa principal del "trabado". Otros factores que se suman:

1. **Sin virtualización**: `RemitosSimpleGrid` mapea todos los `remitos` a `<TableRow>` reales. Cada scroll/render recorre miles de nodos.
2. **Fetch completo siempre**: `useRemitos` trae los 2.000+ remitos paginando de a 1.000, sin filtros server-side. A medida que crezcan, peor.
3. **Búsqueda sin debounce**: cada tecla en el input recomputa `filteredRemitos` y re-renderiza la grilla entera.
4. **Realtime agresivo**: cualquier `INSERT/UPDATE/DELETE` invalida la query y vuelve a traer todo (aunque ya hay un debounce de 500 ms, sigue siendo "todo o nada").
5. **`XLSX` cargado eager**: `import * as XLSX from "xlsx"` infla el bundle inicial de la página aunque casi nunca se use.
6. **Stats y mapas** se recalculan sobre todo el array en cada render (menor impacto, pero suma).

## Objetivo

Que abrir Remitos, scrollear, buscar y filtrar se sienta **instantáneo** incluso con 5.000+ registros, sin cambiar la lógica de negocio.

## Cambios propuestos

### 1. Virtualizar la grilla (impacto mayor)
Reemplazar el renderizado actual de `RemitosSimpleGrid` por una versión virtualizada con **`@tanstack/react-virtual`** (ya es el estándar liviano, sin agregar dependencias pesadas). Sólo se montan ~30-40 filas visibles + buffer; el resto son alturas reservadas.
- Mantener exactamente las mismas columnas, sticky header, sort y acciones.
- Memoizar la fila (`React.memo`) y los handlers para evitar re-renders.

### 2. Debounce en búsqueda y filtros
- Debounce 250 ms sobre `searchTerm` antes de aplicarlo al `useMemo` de `filteredRemitos`.
- El input sigue siendo "controlado" para que se vea fluido al tipear, pero el filtrado pesado se difiere.

### 3. Paginación / ventana por defecto (server-side)
En `useRemitos`, en vez de traer **todo** siempre:
- Por defecto, traer los **últimos N meses** (ej. 3 meses) ordenados por fecha desc → cubre el caso típico de uso diario y reduce drásticamente la carga inicial.
- Cuando el usuario cambia los filtros de fecha (`fechaDesde`/`fechaHasta`/`mes`) o presiona un botón "Cargar histórico completo", se dispara la query ampliada.
- El filtro por fecha se aplica en Postgres (`gte/lte` sobre `fecha`), no en el cliente.
- Mantener compatibilidad: si el usuario es Sergio/Franco/Calaminasur (own-only) la misma lógica aplica.

### 4. Realtime más quirúrgico
- Subir el debounce de invalidación a 1.500 ms y limitar el alcance: en vez de invalidar y refetch completo, hacer `setQueryData` aplicando el `payload.new/old` cuando el row entra/sale del rango de fecha actual. Si no se puede aplicar localmente (ej. cambio masivo), recién ahí refetch.

### 5. Lazy-load de XLSX y diálogos pesados
- `exportarExcel`: importar `xlsx` con `await import("xlsx")` dentro de la función. Mejora TTI de la página.
- Convertir a `lazy()` los diálogos que casi nunca se abren al inicio: `RemitosCSVImportDialog`, `LiquidacionClienteDialog`, `LiquidacionObraDialog`, `AsignarPreciosMasivosDialog`, `RemitoQuickFormDialog`. Se envuelven en `<Suspense fallback={null}>`.

### 6. Pequeñas optimizaciones de render
- `React.memo` en `Row` con comparación por `r.id + r.updated_at`.
- Calcular stats (totales por unidad, total precio, total viajes) en un único `useMemo` (hoy son 4 reduces separados, no es crítico, pero queda más limpio).
- Eliminar `(r as any)` repetidos extendiendo el type `RemitoWithRelations` con `cliente_destino`, `cliente_cantera`, `forma_pago`, `created_by` (ya están en la tabla).

## Archivos a tocar

- `src/components/remitos/RemitosSimpleGrid.tsx` → virtualización + `memo`.
- `src/pages/Remitos.tsx` → debounce de búsqueda, lazy imports de diálogos y de `xlsx`.
- `src/hooks/useRemitos.ts` → fetch acotado por rango de fechas + realtime quirúrgico.
- `src/hooks/useRemitos.ts` (mismo archivo) → exponer un flag/acción "cargar histórico completo".
- (opcional) `src/types` → tipar correctamente las columnas extra.

## Lo que **no** se cambia

- Reglas de negocio (liquidaciones, recálculo de clientes, precios, importación CSV).
- Diseño visual (colores, layout, columnas, stats cards).
- Lógica de roles (Sergio/Franco/Calaminasur ven sólo lo suyo).
- Botones de acción ni sus permisos.

## Resultado esperado

- Apertura inicial de Remitos: de varios segundos con bloqueo a < 500 ms.
- Tipeo en la búsqueda y scroll: 60 fps incluso con miles de remitos.
- Bundle de la página más liviano (XLSX + diálogos diferidos).
- Realtime sigue funcionando pero sin "freezar" la UI ante cambios menores.

```text
Antes:                         Después:
─────────────────────          ──────────────────────────
Fetch ALL (~2k rows)           Fetch últimos 3 meses
   │                              │
   ▼                              ▼
Render 2k × 22 celdas          Virtual: ~40 filas visibles
   │                              │
   ▼                              ▼
Filter en cada tecla           Filter con debounce 250 ms
```
