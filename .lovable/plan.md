# Formato de fecha dd/mm/yyyy en grilla de Remitos

## Cambio
En `src/components/remitos/RemitosSimpleGrid.tsx`:
- Importar `formatDate` desde `@/lib/utils`.
- Reemplazar `{r.fecha}` por `{formatDate(r.fecha)}` en la celda de fecha.

## Resultado
La columna "Fecha" muestra `dd/mm/yyyy` en lugar de `yyyy-mm-dd`.
