El panel "Vehículos activos" (en Maquinarias → Gastos) hoy solo deja elegir el mes completo. Vamos a sumar un selector de **rango de fechas** (Desde / Hasta) que se pueda combinar con el selector de mes.

## Cambios en `src/components/maquinarias/VehiculosActivosMesPanel.tsx`

1. **Agregar dos `DatePicker` (Popover + Calendar)** al lado del selector de mes:
   - **Desde** (date) y **Hasta** (date), opcionales.
   - Si están vacíos: se sigue usando el rango del mes seleccionado (comportamiento actual, no cambia nada para quien no los use).
   - Si hay solo "Desde" o solo "Hasta": se usa ese día como límite y el otro extremo se toma del mes seleccionado.
   - Si hay ambos: manda el rango Desde/Hasta y el selector de mes pasa a ser informativo (se muestra el rango en el título en vez de "agosto 2026").
   - Botón pequeño "X" para limpiar las fechas y volver al mes.

2. **Recalcular `desdeStr` / `hastaStr`** a partir de ese rango efectivo. Todo lo demás (`partesMes` query, `inMonth`, agrupado de cargas/remitos/mantenimientos, totales) ya usa esas dos variables, así que no hay que tocar la lógica de cálculo.

3. **Actualizar `queryKey`** para que incluya el rango efectivo (ya lo hace porque depende de `desdeStr`/`hastaStr`).

4. **Título del panel**: si hay rango custom, mostrar `"Vehículos activos · 01/05/2026 → 14/05/2026"` en formato `dd/MM/yyyy`. Si no, dejar el `mesLabel` actual.

5. **`onSelect(id, mesYYYYMM)`**: se mantiene mandando el `mesSeleccionado` actual para no romper la integración con `GastosMaquinaria` (que llama `seleccionarMes(mes)`).

## Notas

- Cambio acotado a `VehiculosActivosMesPanel.tsx`, no toca `GastosMaquinaria.tsx` ni queries de otros componentes.
- Respeta el formato `dd/mm/yyyy` global vía `format(date, "dd/MM/yyyy")`.
- Validación simple: si `Desde > Hasta`, se ignora el rango y se vuelve a usar el mes (con un toast de aviso opcional).

## Verificación

- Abrir Maquinarias → tab Gastos.
- Sin fechas: ver que el panel sigue funcionando igual mes a mes.
- Elegir Desde = hoy y Hasta = hoy: confirmar que sólo aparecen los vehículos con parte diario en ese día y los costos coinciden.
- Limpiar fechas: vuelve al mes completo.