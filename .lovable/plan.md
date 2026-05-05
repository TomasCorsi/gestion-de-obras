
# Mejoras en el módulo de Sueldos

Tres cambios en `src/components/personal/SueldosTab.tsx` (+ pequeños helpers en `src/hooks/useSueldos.ts`):

## 1. Mostrar quincena para empleados quincenales

En la tabla de detalle y en los KPIs:
- Si `modalidad_pago === 'quincenal'`, mostrar dos columnas extra (o un sub-renglón) con **Blanco/Quincena** = `sueldo_blanco / 2` y **Negro/Quincena** = `sueldo_negro / 2`. El total mensual se mantiene.
- KPIs nuevos: "Total quincena (1ra/2da)" mostrando la mitad del total quincenal + el mensual prorrateado si aplica.
- Misma lógica también en el preview de importación.

Sin cambios en la base: la división es solo visual (la base sigue guardando el sueldo mensual completo).

## 2. Edición inline de sueldos cargados

En la tabla de detalle:
- Convertir las celdas **Blanco**, **Negro** y **Modalidad** en editables (Input numérico / Select) con guardado al hacer blur (debounce).
- Botón "Guardar cambios" en el encabezado para aplicar pendientes (o auto-save por fila).
- Nuevo método `updateSueldo(id, patch)` en `useSueldos.ts` que hace un `update` directo a `sueldos` por id e invalida la query.
- Botón eliminar fila individual (`deleteSueldo(id)`).

## 3. Replicar sueldos a todos los meses del año

Nuevo botón **"Replicar a todos los meses"** junto a "Borrar período":
- Abre dialog con: año destino (default actual), checkbox "Sobrescribir si ya existe" y rango de meses (default Enero–Diciembre, excluyendo el actual).
- Toma los sueldos del período actualmente cargado y los inserta en cada uno de los meses seleccionados con el mismo `legajo`, `personal_id`, `nombre`, `apellido`, `puesto`, `modalidad_pago`, `sueldo_blanco`, `sueldo_negro`.
- Implementación en `useSueldos.ts`: nuevo `replicateToMonths(targetMonths: string[], overwrite: boolean)` que para cada período destino borra (si overwrite) y luego inserta en lote.

## 4. Subir Excel de aumento (actualizar montos manteniendo el resto)

Junto al dropzone actual, un segundo modo: **"Aplicar aumento desde Excel"**:
- Mismo formato de Excel (Legajo + Blanco/Negro/Total) pero NO reemplaza el período.
- En vez de eso, hace **match por legajo** contra los sueldos cargados del período actual y solo actualiza `sueldo_blanco` / `sueldo_negro` de las filas matcheadas. Las no matcheadas se reportan en preview pero no se insertan.
- Checkbox opcional **"Aplicar también a meses siguientes del año"** que ejecuta el mismo update sobre `mes+1..diciembre` del mismo año (útil si el aumento aplica desde determinado mes en adelante).
- Reutiliza el `parseRows` existente; el botón de confirmar en preview cambia a "Actualizar montos" en este modo.

## Archivos
- `src/components/personal/SueldosTab.tsx` — UI: columnas quincena, edición inline, dialog replicar, modo "aumento".
- `src/hooks/useSueldos.ts` — agregar `updateSueldo`, `deleteSueldo`, `replicateToMonths`, `applyIncrease(rows, periodos[])`.

## Sin cambios
- Esquema DB (la tabla `sueldos` ya tiene todo lo necesario, incluyendo `periodo`).
- RLS, edge functions.

## Resultado
Para quincenales se ve cuánto cobran por quincena de un vistazo, los sueldos cargados se pueden editar fila por fila, una sola carga se puede replicar a todo el año, y los aumentos se aplican subiendo otro Excel sin tener que recargar todo desde cero.
