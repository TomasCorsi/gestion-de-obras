

# Fix: Remitos duplicados al guardar

## Causa raiz

Cuando se guarda, ocurre esto:
1. `batchSave` inserta filas nuevas en la DB
2. La suscripcion realtime detecta el INSERT y dispara `invalidateQueries` → refetch
3. El smart merge ve las filas con `_isNew=true` como "en edicion" y las preserva
4. Las mismas filas ya existen en la DB → aparecen duplicadas

El problema: despues de guardar exitosamente, las filas locales mantienen `_isNew=true` y `_isModified=true`, por lo que el merge las protege en vez de reemplazarlas con los datos de la DB.

## Solucion

### 1. `RemitosSimpleGrid.tsx` — Reset completo post-save

Despues de un save exitoso, hacer un reset completo del estado local para que el proximo refetch (via realtime) reconstruya todo desde la DB:

```text
handleSave → onSave(changes) → success → setRows(remitos.map(toLocal))
                                        → deletedIds.clear()
```

Esto elimina todas las flags `_isNew`/`_isModified` y deja que los datos del servidor sean la fuente de verdad.

### 2. `useRemitos.ts` — Debounce en realtime

Agregar un debounce al handler de realtime para evitar multiples refetch durante un batch save (cada INSERT individual dispara un evento separado):

```text
realtime event → clearTimeout → setTimeout(invalidate, 500ms)
```

### Archivos a modificar
- `src/components/remitos/RemitosSimpleGrid.tsx` — reset rows post-save
- `src/hooks/useRemitos.ts` — debounce realtime invalidation

