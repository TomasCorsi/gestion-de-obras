

# Plan: Integrar Remitos y Próximo Mantenimiento en Gastos de Maquinaria

## Contexto

Actualmente el componente `GastosMaquinaria` usa la tabla `viajes` para mostrar los viajes de cada máquina. El usuario quiere que se usen los **remitos** (que tienen `maquinaria_id`) ya que representan los viajes reales. Además, quiere ver la **cantidad de mantenimientos** y el **próximo mantenimiento programado**.

## Cambios

### 1. `src/components/maquinarias/GastosMaquinaria.tsx`

- **Reemplazar `useViajes` por `useRemitos`**: Los remitos ya tienen `maquinaria_id` para filtrar por máquina, además de `cantidad_viajes`, `precio_total`, `desde`/`hasta`, `material`, etc.
- **Tarjeta de Viajes**: Mostrar cantidad de remitos, cantidad total de viajes (suma de `cantidad_viajes`), y precio total.
- **Tarjeta de Mantenimientos**: Agregar info de próximo mantenimiento (fecha `proximo_mantenimiento`, horas `proximo_service_hr`, km `proximo_service_km`).
- **Tabla unificada**: Los registros tipo "viaje" ahora vendrán de remitos con descripción tipo `"Remito #123 - Material (desde → hasta)"`.
- **Gráfico mensual**: Sin cambios conceptuales, sigue mostrando combustible + mantenimiento.
- **Exportaciones**: Actualizar Excel/PDF para reflejar remitos en lugar de viajes.

### 2. Tarjeta nueva: Próximo Mantenimiento

Debajo de las 3 tarjetas de resumen (o integrada en la de mantenimientos), mostrar:
- Fecha del próximo service programado
- Horas/km para el próximo service (de los campos `proximo_service_hr` / `proximo_service_km` del último mantenimiento completado)

### Detalle técnico

- `remitos` se filtra por `maquinaria_id === selectedMaquinariaId`
- El costo de remitos se toma de `precio_total`
- La cantidad de viajes se suma desde `cantidad_viajes` de cada remito
- El próximo mantenimiento se obtiene del último mantenimiento completado que tenga `proximo_mantenimiento` o `proximo_service_hr`/`proximo_service_km` definidos
- El tipo en `GastoUnificado` cambia de `"viaje"` a `"remito"`
- Se agrega el costo de remitos al gasto total: `gastoTotal = combustible + mantenimiento + remitos`

