

# Multi-selección de Modalidad de Pago en Liquidaciones

## Problema
Actualmente solo se puede elegir una modalidad (Mensual, Quincenal o Vacaciones). Al final de mes necesitan pagar a mensuales y quincenales juntos en una sola planilla.

## Solución
Cambiar el selector de modalidad de un `Select` simple a un sistema de **checkboxes/toggles** que permita seleccionar múltiples modalidades simultáneamente.

## Cambios en `src/components/personal/LiquidacionesTab.tsx`

1. **Estado**: Cambiar `modalidad` de `string` a `Set<ModalidadPago>` (o array), permitiendo múltiples selecciones.

2. **UI**: Reemplazar el `Select` de modalidad por un grupo de **ToggleGroup** (multi-select) o checkboxes con las 3 opciones: Mensual, Quincenal, Vacaciones. Se mostrarán como botones/chips seleccionables.

3. **Validación de modalidad**: Actualizar la lógica en `processExcel` y `processCSV` (líneas ~184-186 y equivalentes) para verificar si la modalidad del empleado está **incluida** en las modalidades seleccionadas:
   ```typescript
   const skipModalidadCheck = modalidades.has("vacaciones");
   if (!skipModalidadCheck && !modalidades.has(empleadoModalidad)) {
     status = "modalidad_incorrecta";
   }
   ```

4. **Nombre del archivo de salida**: Incluir las modalidades seleccionadas en el nombre (ej: `Pagos_Galicia_Mensual-Quincenal_2026-03-18.xlsx`).

5. **Condición de habilitación**: El upload se habilita cuando hay banco seleccionado Y al menos una modalidad seleccionada.

