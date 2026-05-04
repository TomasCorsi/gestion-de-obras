## Objetivo

Reemplazar el buscador general "todo en uno" de la pestaña **Cargas del Repartidor** (Gastos → Combustible Repartidor) por **filtros dedicados por columna**, para que cada criterio filtre exactamente lo que dice (no haya cruces ambiguos entre operador, máquina, obra, etc.).

## Archivo a modificar

- `src/components/gastos/CombustibleRepartidorTab.tsx`

## Cambios de UI

Quitar el `Input` de "Buscar por operador, máquina, obra o repartidor..." y reemplazarlo por una barra de filtros con los siguientes controles independientes:

1. **N° Remito** — `Input` numérico/texto (match exacto o "empieza con").
2. **Producto** — `Select`: Todos / Combustible / Grasa / Aceite / Urea (usa `tipo_producto`).
3. **Máquina** — `Select` con las máquinas que aparecen en las cargas (etiqueta: `código — tipo · patente` cuando exista). Filtra por `maquinaria_id`.
4. **Obra** — `Select` con obras presentes en las cargas. Filtra por `obra_id`.
5. **Operador** — `Select` (ya existe, se mantiene). Filtra por `operador_id`.
6. **Repartidor** — `Select` nuevo. Filtra por `repartidor_id` (o por `parte_diario.personal` cuando `repartidor_id` es null).
7. **Tipo Operador** — `Select`: Todos / Interno / Externo / Fletero. Filtra por `tipo_operador`.

Se conservan: filtro por **fecha exacta**, **año**, **mes** y el botón **Excel**.

Agregar un botón **"Limpiar filtros"** (visible solo cuando hay al menos un filtro activo) que resetea remito, producto, máquina, obra, operador, repartidor y tipo de operador (no toca fecha/mes/año para no perder el contexto del panel de precios).

### Layout

Filtros agrupados en una `card-industrial` con grid responsivo (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2`), separados visualmente del bloque de fecha/mes/año/Export. Cada control con su `<Label>` chico arriba para que el usuario sepa qué está filtrando.

## Cambios de lógica

En el `useMemo` de `filtered`:

- Eliminar el bloque actual de `searchTerm` que mezcla 5 campos.
- Agregar filtros encadenados, cada uno solo si tiene valor:
  - `numeroRemito`: `String(c.numero_remito ?? "").includes(numeroRemito.trim())`
  - `productoFiltro !== "all"`: `(c.tipo_producto || "combustible") === productoFiltro`
  - `maquinariaFiltro !== "all"`: `c.maquinaria_id === maquinariaFiltro`
  - `obraFiltro !== "all"`: `c.obra_id === obraFiltro`
  - `repartidorFiltro !== "all"`: matchea contra `c.repartidor_id` o el `personal_id` del parte diario.
  - `tipoOperadorFiltro !== "all"`: `(c.tipo_operador || "interno") === tipoOperadorFiltro`

Construir `useMemo` adicionales para las opciones de selects, igual que `operadorOptions` actual:

- `maquinariaOptions` — únicas a partir de `cargas` con `maquinaria_id` y `maquinaria.codigo/tipo/patente`.
- `obraOptions` — únicas a partir de `cargas` con `obra_id` y `obra.nombre`.
- `repartidorOptions` — combinando `repartidor` y `parte_diario.personal` (deduplicado por id).

## Resultado esperado

Cada filtro actúa de forma estricta sobre su propio campo, los selects muestran solo valores realmente presentes en los datos, y el usuario puede combinarlos (por ej. "Obra X + Producto Grasa + Máquina ABC") sin que un buscador genérico los mezcle.

## Notas

- No se requieren cambios de base de datos ni de hooks.
- Se respeta el patrón visual de `card-industrial`, dark theme y el filtro de mes/año existente.
