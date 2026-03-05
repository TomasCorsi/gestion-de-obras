

# Guardado parcial para mecánicos en mantenimientos

## Problema actual

El formulario móvil de mecánicos (`MecanicoMantenimientoForm`) solo permite guardar cuando los campos obligatorios (máquina, técnico y descripcion/informe) están completos. Como los mecánicos van completando la información de a poco durante el día, necesitan poder hacer un guardado parcial con solo los datos mínimos (máquina + técnico).

## Solución

Agregar un flujo de "guardado parcial" que cree el mantenimiento en estado `pendiente` con validación mínima (solo máquina), y permita seguir editándolo después. Similar al patrón borrador/completado del Parte Diario.

### Cambios en `MecanicoMantenimientoForm.tsx`

1. **Aceptar prop `editData`** opcional para poder reabrir un mantenimiento pendiente y seguir editándolo
2. **Cambiar el botón de acción** del footer: en lugar de un solo "Guardar", mostrar dos botones:
   - "Guardar parcial" (outline): guarda con estado `pendiente`, requiere solo máquina seleccionada. Usa `createMantenimiento` o `updateMantenimiento` según si es nuevo o edición
   - "Finalizar" (primary): el guardado completo actual con todas las validaciones, pone estado `en_proceso` o `completado`
3. **Usar `useMantenimientos`** con `updateMantenimiento` cuando se edita un registro existente (hoy solo usa `createMantenimiento`)
4. **Relajar validación** para guardado parcial: `isValidParcial = !!maquinariaId` (solo máquina). Completar `tecnico` y `descripcion` con defaults si están vacíos ("Pendiente de completar")

### Cambios en la vista que invoca el formulario

5. **En `MecanicoObservacionesView.tsx` o la vista que liste mantenimientos pendientes del mecánico**: agregar la posibilidad de retomar un mantenimiento `pendiente` pasando `editData` al formulario. Esto permite al mecánico volver a abrir un mantenimiento que guardó parcialmente.

### Sin cambios de base de datos

La tabla `mantenimientos` ya soporta el estado `pendiente` y los campos de texto (`descripcion`, `tecnico`) no tienen restricciones NOT NULL en DB que impidan valores placeholder. El campo `descripcion` es NOT NULL pero acepta cualquier string, así que se usará un default como "Pendiente de completar".

