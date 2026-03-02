
# Fix: Error de clave duplicada al importar remitos

## Problema

El error es: `duplicate key value violates unique constraint "remitos_numero_key"`

El CSV tiene filas con el mismo valor de "Rem. Local" (por ejemplo, el numero 71162 aparece en las filas 20 y 23 del CSV). El campo `numero` en la base de datos tiene una restriccion UNIQUE, y como el importador usa `remito_local` como `numero`, cuando hay duplicados la insercion falla completamente.

Esto es un problema de diseno: el campo `numero` fue pensado como identificador unico, pero en la realidad operativa un mismo remito local puede aparecer en multiples filas (por ejemplo, un remito que cubre dos destinos diferentes).

## Solucion

### 1. Eliminar la restriccion UNIQUE del campo `numero` (migracion de base de datos)

```sql
ALTER TABLE public.remitos DROP CONSTRAINT remitos_numero_key;
```

El campo `numero` es un campo legacy que no deberia restringir la carga. Los identificadores reales son `remito_local` y `remito_tercero`.

### 2. Generar `numero` unico en el importador como respaldo

Aunque se elimine la constraint, conviene generar valores unicos para evitar confusion:

```text
// En vez de: numero = remito_local || `IMP-${i}`
// Usar: numero = remito_local ? `${remito_local}-${i}` : `IMP-${Date.now()}-${i}`
```

Esto garantiza que cada fila tenga un `numero` distinto incluso si comparten el mismo `remito_local`.

### 3. Cambiar el batch insert a insercion con upsert o row-by-row con manejo de errores

Como respaldo adicional, cambiar la estrategia de insercion en el hook `useRemitos.ts` para que si una fila falla, no bloquee las demas. Usar insercion individual con conteo de exitos/errores en vez de un unico `insert([...all])`.

### Archivos a modificar
1. **Migracion SQL** -- eliminar constraint `remitos_numero_key`
2. **`src/components/remitos/CSVImportDialog.tsx`** -- generar `numero` unico por fila
3. **`src/hooks/useRemitos.ts`** -- insercion resiliente (fila por fila con manejo de errores, o batch con `ON CONFLICT`)
