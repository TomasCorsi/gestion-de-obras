

## Plan: Corregir desaparicion de filas al editar datos filtrados en grilla de Combustible

### Problema

Cuando hay un filtro activo y se edita una celda, al escribir se "borra" una fila. Esto pasa porque:

1. El sistema de snapshot captura los datos filtrados al hacer clic en una celda
2. Al escribir, el grid puede disparar `onBlur` brevemente entre teclas
3. El `handleBlur` libera el snapshot (`editingSnapshot = null`)
4. Sin snapshot, `displayData` recalcula los filtros y la fila editada desaparece si su nuevo valor ya no coincide con el filtro

### Solucion

Reemplazar el mecanismo de snapshot basado en blur/focus por uno mas robusto: mantener el snapshot mientras haya cambios pendientes y filtros activos. Solo liberar el snapshot cuando el usuario limpia los filtros o guarda/descarta cambios.

### Cambios en `src/components/combustible/CombustibleDataGrid.tsx`

1. **Eliminar `handleBlur`** - No usar blur para liberar el snapshot, es poco confiable en grillas
2. **Capturar snapshot al primer cambio con filtros activos** en lugar de al hacer clic
3. **Liberar snapshot automaticamente** cuando:
   - Se limpian todos los filtros (`activeFilterCount === 0 && !globalSearch`)
   - Se guardan o descartan los cambios (en `handleReset` y `handleSave`)
4. **Actualizar `handleActiveCellChange`** para solo capturar snapshot si no hay uno ya activo
5. **Remover `onBlur` del DataSheetGrid** ya que no se necesita mas

### Detalles tecnicos

La logica de `displayData` se mantiene igual, pero el snapshot se controla de forma mas estable:

```
// Capturar snapshot cuando se empieza a editar con filtros activos
// (en handleActiveCellChange o al primer cambio)
if (filtersActive && !editingSnapshot) {
  setEditingSnapshot(searchFilteredData);
}

// Liberar snapshot cuando ya no hay filtros
useEffect(() => {
  if (!globalSearch && activeFilterCount === 0) {
    setEditingSnapshot(null);
  }
}, [globalSearch, activeFilterCount]);

// Liberar en reset y save
const handleReset = () => {
  ...
  setEditingSnapshot(null);
};
```

Se elimina el estado `isEditing` (ya no es necesario) y se usa directamente `editingSnapshot !== null` como indicador de que hay un snapshot activo.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/combustible/CombustibleDataGrid.tsx` | Reemplazar mecanismo blur/focus por snapshot persistente basado en estado de filtros |

