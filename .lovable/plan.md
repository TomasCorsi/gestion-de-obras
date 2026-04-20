

## Bug: el buscador de Cotizaciones se rompe por descripción nula

En `src/pages/Cotizaciones.tsx` (líneas 117-124), el filtro hace `cot.descripcion.toLowerCase()` y `cot.obra?.nombre?.toLowerCase()` sin proteger contra valores nulos. Confirmé en BD que hay 1 cotización con `descripcion = NULL`, lo que provoca un `TypeError: Cannot read properties of null` apenas se tipea en el input — por eso "no te deja buscar".

## Solución

### Cambio único en `src/pages/Cotizaciones.tsx` (líneas 117-124)

Agregar fallback a string vacío en cada campo y normalizar el término de búsqueda una sola vez:

```tsx
const filteredCotizaciones = cotizaciones.filter((cot) => {
  const term = searchTerm.toLowerCase();
  const matchesSearch =
    (cot.numero ?? "").toLowerCase().includes(term) ||
    (cot.obra?.nombre ?? "").toLowerCase().includes(term) ||
    (cot.descripcion ?? "").toLowerCase().includes(term);
  const matchesEstado = estadoFilter === "todos" || cot.estado === estadoFilter;
  return matchesSearch && matchesEstado;
});
```

### Resultado
El buscador vuelve a filtrar por número, obra o descripción sin romperse, incluso cuando alguna cotización tiene campos vacíos.

