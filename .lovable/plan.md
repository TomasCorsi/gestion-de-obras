## Objetivo
Que las tarjetas de totales (Total Remitos, Viajes, Cantidad, Precio) muestren los valores correspondientes al filtro activo — incluyendo el filtro por obra — en lugar de todos los remitos.

## Cambio
Archivo: `src/pages/Remitos.tsx` (líneas 355-358)

Reemplazar el cálculo de stats para que use `filteredRemitos` en vez de `remitos`:

```ts
const totalRemitos = filteredRemitos.length;
const totalViajes = filteredRemitos.reduce((sum, r) => sum + (r.cantidad_viajes || 1), 0);
const totalCantidad = filteredRemitos.reduce((sum, r) => sum + r.cantidad, 0);
const totalPrecio = filteredRemitos.reduce((sum, r) => sum + (r.precio_total || 0), 0);
```

Con esto los totales se actualizan automáticamente al filtrar por obra, fecha, mes, tipo de material, creador o búsqueda.

## Fuera de alcance
No se modifica la lógica de filtros existentes ni la grilla; el resumen interno de la grilla ya usa los remitos filtrados.
