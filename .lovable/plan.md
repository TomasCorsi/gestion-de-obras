

# Fix: Mantenimientos del mecánico no aparecen en el historial

## Problema
Los mantenimientos creados desde el formulario del mecánico no se muestran en el historial del día porque el campo `tecnico_id` nunca se guarda. El formulario `MecanicoMantenimientoForm` envía `tecnico` (nombre como texto) pero no incluye `tecnico_id` (UUID del empleado). El filtro en `ParteDiario.tsx` busca por `tecnico_id === empleado.id`, que siempre es `null` en los registros.

## Solución

### 1. `MecanicoMantenimientoForm.tsx`
- Agregar prop `empleadoId: string` a la interfaz
- Incluir `tecnico_id: empleadoId` en `buildPayload()`

### 2. `src/pages/ParteDiario.tsx`
- Pasar `empleadoId={empleado.id}` como prop al `MecanicoMantenimientoForm`

### 3. Migración: actualizar registros existentes
- Ejecutar un UPDATE para setear `tecnico_id` en los mantenimientos existentes que ya tienen el campo `tecnico` (nombre) pero `tecnico_id` es null, cruzando con la tabla `personal` por nombre completo. Esto corrige los datos históricos.

