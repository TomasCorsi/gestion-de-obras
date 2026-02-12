
## Vincular Mantenimiento completado con Reportes de Campo

### Problema
Cuando se crea un mantenimiento desde un reporte de campo y luego se marca como "completado", el reporte de campo queda pendiente. Deberian sincronizarse automaticamente.

### Solucion

**1. Agregar columna `observacion_reporte_id` a la tabla `mantenimientos`**
- Nueva columna nullable UUID que referencia a `observaciones_maquina_estado.id`
- Permite saber que mantenimiento fue creado a partir de que reporte

**2. Crear trigger en la base de datos**
- Cuando un mantenimiento cambia su estado a `completado`, el trigger automaticamente marca la observacion vinculada como `atendida`, registrando el tecnico y la fecha.

**3. Pasar el ID de la observacion al crear mantenimiento**
- Modificar `ObservacionesCampoTab.tsx` para incluir `observacion_reporte_id` en el evento `crear-mantenimiento-desde-reporte`
- Modificar `MantenimientoPage.tsx` para capturar ese ID y guardarlo en el formulario
- Modificar `useMantenimientos.ts` para incluir `observacion_reporte_id` en el tipo `MantenimientoForm` y en las operaciones de insert

### Detalle tecnico

| Paso | Archivo / Recurso | Cambio |
|---|---|---|
| Migracion DB | SQL migration | `ALTER TABLE mantenimientos ADD COLUMN observacion_reporte_id UUID REFERENCES observaciones_maquina_estado(id)` |
| Trigger DB | SQL migration | Trigger `on UPDATE` de mantenimientos: si `NEW.estado = 'completado'` y tiene `observacion_reporte_id`, actualiza la observacion como atendida |
| Hook | `useMantenimientos.ts` | Agregar `observacion_reporte_id?` al tipo `MantenimientoForm` y a `MantenimientoDB` |
| Evento | `ObservacionesCampoTab.tsx` | Incluir `observacion_id` en el dispatch del evento |
| Formulario | `MantenimientoPage.tsx` | Capturar `observacion_reporte_id` del evento y pasarlo al crear |

### Flujo resultante

1. Operador reporta observacion en parte diario -> se crea en `observaciones_maquina_estado`
2. Mecanico ve el reporte y presiona "Crear Mantenimiento" -> se abre formulario con `observacion_reporte_id` vinculado
3. Se crea el mantenimiento con la referencia al reporte
4. Cuando el mantenimiento se marca como "completado" -> el trigger marca automaticamente el reporte como atendido (con tecnico y fecha)
5. La lista de reportes de campo se actualiza via invalidacion de cache de React Query
