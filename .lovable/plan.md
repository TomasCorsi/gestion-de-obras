

# Diagnóstico: Remitos importados no aparecen en la tabla

## Causa raíz

Hay dos problemas combinados:

1. **Realtime poco confiable en inserciones masivas**: El canal de Supabase Realtime puede perder eventos durante inserciones bulk (muchas filas insertadas en paralelo). Aunque `batchSaveMutation.onSuccess` invalida el cache de React Query, las inserciones paralelas pueden generar condiciones de carrera.

2. **La grilla no se actualiza inmediatamente después del import**: El `onImport` del dialog CSV llama a `batchSave`, que invalida queries en `onSuccess`. Sin embargo, la grilla usa un "smart merge" que puede no reflejar los cambios si hay filas locales marcadas como editadas o nuevas.

## Solución

### 1. `src/pages/Remitos.tsx` - Forzar refetch explícito después de importar

Usar `fetchRemitos` (el `refetch` de React Query) después de que el import termine exitosamente, con un pequeño delay para asegurar que las escrituras se hayan propagado:

```typescript
onImport={async (remitosToImport) => {
  const results = await batchSave({ created: remitosToImport, updated: [], deleted: [] });
  if (results.errors > 0) {
    throw new Error(`${results.errors} errores`);
  }
  // Forzar refetch tras bulk import
  setTimeout(() => fetchRemitos(), 500);
}}
```

Esto requiere agregar `fetchRemitos` del hook `useRemitos`.

### 2. `src/components/remitos/RemitosSimpleGrid.tsx` - Mejorar el smart merge para bulk imports

Actualmente, si hay filas `_isNew` locales (ej: el usuario agregó filas vacías antes de importar), el merge las preserva y puede interferir. Después de un save exitoso, las filas `_isNew` deberían limpiarse. Agregar un mecanismo para resetear el estado local cuando llegan datos masivos nuevos:

- Cuando la cantidad de remitos del DB crece significativamente (ej: +5 filas de golpe), forzar un reset completo de las filas locales en lugar de hacer merge parcial.

### Archivos a modificar
- `src/pages/Remitos.tsx` (agregar `fetchRemitos`, llamar tras import)
- `src/components/remitos/RemitosSimpleGrid.tsx` (mejorar smart merge para bulk)

