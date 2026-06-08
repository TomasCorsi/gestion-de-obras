## Objetivo

Que el reporte "Por Obra" muestre correctamente los ingresos por remitos cuando la obra seleccionada es **Cantera San Vicente** o **Canteras del Gaucho**, sin tocar el módulo de Remitos ni la base de datos.

## Cambios

Único archivo: `src/hooks/useReporteObra.ts`

1. **Detectar cantera temprano** (ya está hecho): usar `esCantera` + `canteraDesdePattern` (`%san vicente%` o `%gaucho%`) basados en el nombre normalizado de la obra.

2. **Reemplazar el `.or(...)` por dos queries separadas** y unir resultados en memoria:
   - Query A: `from("remitos").select("*").eq("obra_id", obraId)` — remitos asociados explícitamente a la obra (hoy siempre vacío para canteras, pero queda preparado).
   - Query B (sólo si `esCantera`): `from("remitos").select("*").ilike("desde", canteraDesdePattern)` — remitos de cantera identificados por el campo de texto `desde`.
   - Motivo: el `.or()` con `ilike` y espacios/comas suele romperse en PostgREST y dejar la consulta vacía silenciosamente. Dos queries simples son más robustas.

3. **Deduplicar por `id`** al combinar ambos arrays antes del filtrado por fecha y de la agrupación por material.

4. **No tocar** el resto del hook: personal, combustible, horas máquina, OC y otros gastos siguen filtrando por `obra_id` como hoy.

## Validación

- Abrir reporte → seleccionar **Cantera San Vicente** → verificar que la sección **Remitos** lista los materiales cargados por Franco y que **Ingresos por remitos** deja de mostrar $0.
- Repetir con **Canteras del Gaucho**.
- Verificar que una obra normal (no cantera) sigue mostrando exactamente los mismos remitos que antes (sin duplicados ni cruces).

## Nota

Esto no asigna `obra_id` a los remitos existentes. Si más adelante querés que todos los remitos de cantera queden vinculados también por `obra_id` (opción B), lo hacemos en una migración aparte.
