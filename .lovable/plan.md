

# Sincronización en tiempo real para Remitos - Analisis de viabilidad

## El problema real

La grilla de RemitosSimpleGrid mantiene su propio estado local (`rows` en useState, línea 143). Cuando el usuario edita filas, estas se marcan como `_isModified: true`. Al activar realtime:

- React Query refrescaría el prop `remitos` al detectar cambios en la DB
- Pero la grilla **ignora** cambios del prop después del mount inicial
- Si forzamos la sincronización, las filas que el usuario está editando se resetearían

## Solución: Merge inteligente

En lugar de refrescar todo, hacer un merge selectivo que:

1. **Solo actualice filas no modificadas** (`_isModified === false` y `_isNew === false`)
2. **Agregue filas nuevas** que aparezcan en la DB pero no existan localmente
3. **Deje intactas** las filas que el usuario está editando
4. **Muestre un indicador sutil** ("3 remitos nuevos de otro usuario") en vez de refrescar bruscamente

### Cambios necesarios

**1. Migración SQL** - Agregar tabla remitos a realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.remitos;
```

**2. `src/hooks/useRemitos.ts`** - Suscripción realtime que invalida la caché:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('remitos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'remitos' }, () => {
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [queryClient]);
```

**3. `src/components/remitos/RemitosSimpleGrid.tsx`** - useEffect que mergea datos nuevos sin tocar filas editadas:
```typescript
useEffect(() => {
  setRows(prev => {
    const existingIds = new Set(prev.map(r => r.id).filter(Boolean));
    const modifiedIds = new Set(prev.filter(r => r._isModified || r._isNew).map(r => r._localId));
    
    // Filas que el usuario está editando → no tocar
    const userEditing = prev.filter(r => modifiedIds.has(r._localId));
    
    // Filas de la DB que no están siendo editadas → actualizar
    const fromDB = remitos
      .filter(r => !modifiedIds.has(r.id))
      .map(remitoToLocal);
    
    return [...fromDB, ...userEditing.filter(r => r._isNew)];
  });
}, [remitos]);
```

**4. Toast informativo** cuando se detectan cambios externos: "Datos actualizados por otro usuario" (solo si realmente hubo cambios).

## Resultado

- Los usuarios ven cargas nuevas de otros usuarios al instante
- Sus propias ediciones en curso nunca se pierden
- No hay refresco molesto ni parpadeo
- Al guardar, sus cambios se aplican normalmente

