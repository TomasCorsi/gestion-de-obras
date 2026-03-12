

# Plan: Corregir número de remito en gastos de maquinaria

## Problema
El campo `numero` contiene el ID auto-generado ("REM-2026-0083"), pero el número correcto ingresado manualmente está en `remito_local` (ej: "75450", "73876").

## Cambio
En `src/components/maquinarias/GastosMaquinaria.tsx`, usar `remito_local` como fuente principal del número de remito, con fallback a `numero`:

- **Línea 259** (descripción en tabla UI): cambiar `r.numero` → `r.remito_local || r.numero`
- **Línea 347** (datos para PDF): cambiar `r.numero` → `r.remito_local || r.numero`

### Archivo a modificar
- `src/components/maquinarias/GastosMaquinaria.tsx` (2 líneas)

