## Filtro por mes en el panel "Vehículos activos"

### Cambios en `src/components/maquinarias/VehiculosActivosMesPanel.tsx`

1. **Agregar selector de mes** en el header del panel (al lado del título), con los últimos 12 meses (igual lógica que `mesesDisponibles` de `GastosMaquinaria`). Default = mes actual.
2. **Estado local `mesSeleccionado`** (`yyyy-MM`). Calcular `desdeStr` / `hastaStr` a partir de ese mes en lugar de hardcodear `new Date()`.
3. **Query key** incluye el mes para refetch al cambiar.
4. **Título dinámico**: "Vehículos activos · {mes seleccionado}".
5. **Tarjeta total**: ya muestra "Total mes" — los montos se recalculan automáticamente al cambiar el mes porque dependen de `desdeStr`/`hastaStr`.
6. **Click en tarjeta**: cuando el usuario selecciona un vehículo, en `GastosMaquinaria.tsx` se aplica también el mes elegido (no el actual). Para esto el panel expone el mes vía callback: `onSelect(id, mesYYYYMM)` y el padre lo pasa a `seleccionarMes(mesYYYYMM)`.

### Cambios en `src/components/maquinarias/GastosMaquinaria.tsx`

- Ajustar `onSelect` del panel para recibir el mes y propagarlo a `seleccionarMes`:
  ```tsx
  onSelect={(id, mes) => { setSelectedMaquinariaId(id); seleccionarMes(mes); }}
  ```

### Resultado

El usuario puede elegir cualquier mes del último año en el panel y ver inmediatamente qué camiones estuvieron activos ese mes con su liquidación de combustible, remitos y mantenimientos. Al hacer click, el detalle inferior se filtra al mismo mes.
