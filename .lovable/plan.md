## Problema

En `src/pages/Remitos.tsx`, el buscador (searchTerm) filtra por número, remito tercero/local, tipo de material, transporte, proveedor, cliente, cliente_destino y maquinaria — **pero no busca dentro de los campos `desde` y `hasta`**. Por eso al escribir "Canteras del Gaucho" no aparecen resultados aunque haya remitos cargados con ese origen/destino.

## Cambio

Agregar `r.desde` y `r.hasta` al filtro de búsqueda en `filteredRemitos` (líneas 144-168 de `src/pages/Remitos.tsx`):

```ts
(r.desde?.toLowerCase() || "").includes(term) ||
(r.hasta?.toLowerCase() || "").includes(term) ||
```

Con eso, escribir "Canteras del Gaucho" matcheará remitos donde aparezca como origen o destino.

## Archivos afectados

- `src/pages/Remitos.tsx` (1 edit puntual en el bloque del buscador)
