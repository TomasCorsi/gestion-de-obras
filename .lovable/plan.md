## Problema

En el reporte **"Por Obra"**, al filtrar **Cantera San Vicente** (o Canteras del Gaucho), la sección **Remitos** aparece vacía aunque hay remitos cargados (ej. Franco Buceta cargó muchos hoy).

## Causa

Los remitos de cantera **no tienen `obra_id`** seteado. La cantera se identifica por el campo de texto **`desde`** (ej. `desde = "Cantera San Vicente"`). El hook `useReporteObra.ts` filtra remitos únicamente por `obra_id = obraId`, por eso no encuentra nada.

Confirmado en DB: los remitos cargados por Franco tienen `obra_id = NULL` y `desde = "Cantera San Vicente"`.

## Solución

En `src/hooks/useReporteObra.ts`, cuando la obra seleccionada sea una cantera, ampliar la consulta de remitos para incluir también los que tienen `desde` que coincida con el nombre de la cantera.

### Cambios técnicos

1. **Detección temprana de cantera**: calcular `esCantera` y `nombreCantera` antes de las queries (con la consulta de `obra` ya resuelta o usando el nombre normalizado del `obraId`).

2. **Query de remitos adaptada**:
   - Obra normal: `eq("obra_id", obraId)` (como hoy).
   - Cantera: `.or("obra_id.eq.<id>,desde.ilike.%<nombre cantera>%")` para capturar:
     - remitos con `obra_id` asignado a la cantera (si los hubiera),
     - remitos con `desde` que mencione el nombre de la cantera (caso real actual).
   - Para "Cantera San Vicente" matchear `desde ILIKE '%san vicente%'`; para "Canteras del Gaucho" matchear `desde ILIKE '%gaucho%'`. Patrones tolerantes a variantes ("Cantera"/"Canteras").

3. **Ingresos**: el cálculo de `ingresosRemitos = sum(precio_total)` ya queda correcto al incluir estos remitos.

4. **Resto de secciones**: no se tocan. Combustible, partes, OC, gastos siguen filtrando por `obra_id` (que sí se setea normalmente para esos casos en la cantera).

### Archivo a tocar

- `src/hooks/useReporteObra.ts` — ajustar la query y filtrado de remitos para canteras.

### Nota

Si más adelante querés que todos los remitos de cantera queden vinculados también vía `obra_id`, podemos hacer una migración para asociarlos automáticamente, pero por ahora el fix es no-invasivo y respeta los datos existentes.