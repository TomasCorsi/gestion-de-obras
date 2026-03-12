

# Agregar búsqueda por número de obra en "Desde" y "Hasta" de Remitos

## Problema
Las opciones de obras en los campos "Desde" y "Hasta" solo muestran el nombre de la obra. No se puede buscar por número de obra.

## Solución
Modificar `obrasOptions` en `RemitosDataGrid.tsx` para incluir el número de obra en el label, permitiendo que el autocompletado de `GridSelectCell` lo encuentre al buscar.

### Cambio en `src/components/remitos/RemitosDataGrid.tsx` (líneas 150-156)

Actualizar la construcción de `obrasOptions` para incluir el número de obra en el label cuando exista:

```typescript
const obrasOptions = useMemo(() => {
  const options = obras.map((o) => ({
    value: o.nombre,
    label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
  }));
  return [{ value: "", label: "Seleccionar..." }, ...options];
}, [obras]);
```

El `value` sigue siendo `o.nombre` (lo que se guarda en la DB), pero el `label` muestra el número para facilitar la búsqueda. Cuando el usuario tipea un número de obra, el filtro del `GridSelectCell` lo encontrará en el label.

