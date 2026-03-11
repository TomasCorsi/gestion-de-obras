

# Protección contra cierre accidental de formularios

## Problema
Cuando un usuario está completando un formulario y hace clic fuera del diálogo (en el overlay) o presiona Escape, el formulario se cierra sin aviso y pierde los datos.

## Solución

### 1. Crear componente `UnsavedChangesAlert`
Un AlertDialog reutilizable que pregunta "¿Descartar cambios?" con opciones "Continuar editando" / "Descartar".

### 2. Modificar `FormDialog` (componente compartido)
Agregar prop `isDirty?: boolean`. Cuando `isDirty=true`:
- Bloquear cierre por clic en overlay (`onInteractOutside={e => e.preventDefault()}`)
- Bloquear cierre por Escape (`onEscapeKeyDown={e => e.preventDefault()}`)
- El botón X y "Cancelar" muestran el alert de confirmación antes de cerrar

Cuando `isDirty=false` o no se pasa, comportamiento normal (sin breaking changes).

### 3. Actualizar `DialogContent` (componente UI)
Pasar `onInteractOutside` y `onEscapeKeyDown` como props al `DialogPrimitive.Content` de Radix (ya los soporta nativamente, solo hay que exponerlos).

### 4. Actualizar los formularios principales
Pasar `isDirty` a `FormDialog` en las páginas que lo usan (~10 páginas): Personal, Maquinarias, Combustible, Cotizaciones, Obras, Clientes, Viajes, Presentismo, Vacaciones, Stock.

Para diálogos custom que no usan `FormDialog` (ej: `CargaCombustibleRepartidorDialog`, `RemitoQuickFormDialog`, `MecanicoMantenimientoForm`), agregar la misma lógica directamente con `onInteractOutside` y `onEscapeKeyDown`.

### Archivos a modificar
- `src/components/ui/dialog.tsx` -- exponer props de Radix
- `src/components/shared/FormDialog.tsx` -- lógica de dirty + alert
- `src/components/shared/UnsavedChangesAlert.tsx` -- nuevo componente
- ~10 páginas/componentes de formulario -- pasar `isDirty`
- Diálogos custom principales -- agregar protección directa

