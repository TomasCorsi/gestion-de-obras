

# Agregar edición y eliminación en Gastos > Repartidor

## Cambio

Agregar botones de editar y eliminar en cada fila de la tabla administrativa de `CombustibleRepartidorTab`, reutilizando el diálogo `CargaCombustibleRepartidorDialog` ya existente y el hook `useCargasRepartidor` para las mutaciones.

## Detalle técnico

### Archivo: `src/components/gastos/CombustibleRepartidorTab.tsx`

1. **Importar** `CargaCombustibleRepartidorDialog`, `DeleteConfirmDialog`, y las mutaciones de `useCargasRepartidor` (solo se necesitan `updateCarga` y `deleteCarga` — se puede instanciar el hook con `parteDiarioId=null, repartidorId=null` y usar las mutaciones directamente, o importar `supabase` directamente para las operaciones)

2. **Agregar estado local**:
   - `editingCarga` / `deletingCarga` para controlar qué registro se edita/elimina
   - `showEditDialog` para abrir/cerrar el diálogo

3. **Agregar columna "Acciones"** al final de la tabla con botones de lápiz (editar) y papelera (eliminar) en cada fila

4. **Renderizar** `CargaCombustibleRepartidorDialog` y `DeleteConfirmDialog` — requiere pasar listas de personal, maquinarias y obras (se importan los hooks `usePersonal`, `useMaquinarias`, `useObras`)

5. **Invalidar queries** después de editar/eliminar para refrescar la tabla

### Archivo: `src/hooks/useCargasRepartidorAll.ts`

Agregar mutaciones `updateCarga` y `deleteCarga` directamente en este hook (similar a `useCargasRepartidor`) para que `CombustibleRepartidorTab` no dependa de un `parteDiarioId`.

