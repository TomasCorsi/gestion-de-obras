
# Limpieza total de secciones no usadas en Gastos

## Resultado final
La página **Gastos** queda con una sola sección llamada **Combustible** (la actual "Repartidor"). Se elimina todo el código, hooks, componentes, página standalone y tablas de las otras tres secciones.

## Cambios en el frontend

### 1. `src/pages/Gastos.tsx` — reescritura simplificada
- Eliminar tabs *Maquinarias*, *Personal* y *Combustible* (la vieja, basada en `cargas_combustible`).
- Dejar una única pestaña/vista con `<CombustibleRepartidorTab>`, titulada **Combustible** (ícono Fuel).
- Como queda una sola sección, se puede quitar el `<Tabs>` y renderizar directo el componente.
- Quitar todo el estado, handlers, imports, filtros, dialogs, exports y vista full-screen relacionados a la vieja Combustible/Maquinarias/Personal.

### 2. Borrar página standalone y su ruta
- `src/pages/Combustible.tsx` → eliminar archivo.
- `src/App.tsx` → quitar `lazy(... Combustible)` y la ruta `/combustible` si existe.
- `src/components/layout/AppLauncher.tsx` y `Sidebar.tsx` → quitar entradas a `/combustible` si las hay.

### 3. Borrar hooks
- `src/hooks/useCombustible.ts`
- `src/hooks/useAsignacionesMaquinaria.ts`
- `src/hooks/useAsignacionesPersonal.ts`

### 4. Borrar componentes
- `src/components/combustible/` (carpeta completa: `CombustibleDataGrid.tsx`, `CSVImportDialog.tsx`)
- `src/components/maquinarias/AsignacionesMaquinariaObra.tsx`
- `src/components/personal/AsignacionesPersonalObra.tsx`

### 5. Limpiar referencias residuales
- `src/hooks/useDashboardData.ts` → quitar la query a `cargas_combustible` y el KPI/cálculo derivado.
- `src/hooks/useReporteObra.ts` → quitar el fetch y los cálculos basados en `cargas_combustible`.
- Buscar y eliminar cualquier import huérfano (`rg "useCombustible|useAsignaciones(Personal|Maquinaria)|AsignacionesMaquinariaObra|AsignacionesPersonalObra"`).

## Cambios en backend / Edge Functions

### 6. `supabase/functions/backup-database/index.ts`
- Quitar `"cargas_combustible"`, `"asignaciones_maquinaria_obra"`, `"asignaciones_personal_obra"` del array de tablas a respaldar.
- Redeploy automático.

### 7. `supabase/functions/chat-reportes/index.ts`
- Eliminar las menciones a `cargas_combustible` del prompt/esquema enviado al modelo (líneas 18 y 30).

## Cambios en base de datos (migración)

Tabla de drop con CASCADE para arrastrar políticas, índices, FKs y vistas dependientes:

```sql
DROP TABLE IF EXISTS public.cargas_combustible CASCADE;
DROP TABLE IF EXISTS public.asignaciones_maquinaria_obra CASCADE;
DROP TABLE IF EXISTS public.asignaciones_personal_obra CASCADE;
```

Sin export previo de datos (confirmado por el usuario).

> Nota: la tabla `cargas_combustible_repartidor` **se conserva** intacta, ya que es la fuente de la nueva pestaña "Combustible".

## Validación post-cambios
- Build sin errores TS (imports rotos).
- `/gastos` carga y muestra solo Combustible (ex-Repartidor).
- Dashboard y Reporte de Obra cargan sin errores (sin sección de combustible viejo).
- Backup de DB corre sin fallar por tablas inexistentes.
