
## Plan: Corregir edición de grilla con filtros activos

### Problema identificado
Cuando se filtra la grilla de combustible y se edita una fila, las filas se mueven y desaparecen porque:
1. El `displayData` (datos mostrados) es un `useMemo` que se recalcula cada vez que `data` cambia
2. Al escribir en una celda, el estado `data` se actualiza inmediatamente
3. Si la edición cambia un valor que afecta al filtro, la fila puede dejar de cumplir el criterio y desaparece
4. Además, react-datasheet-grid pierde la referencia a la fila actual cuando los índices cambian

### Solución propuesta
Implementar un sistema de "snapshot" que congele los datos filtrados mientras el usuario está editando activamente, y solo actualice el filtrado cuando termine de editar o haga clic fuera de la grilla.

### Cambios técnicos

**1. Agregar estado para congelar los datos filtrados durante edición**

```typescript
// Nuevo estado para snapshot de datos durante edición
const [isEditing, setIsEditing] = useState(false);
const [editingSnapshot, setEditingSnapshot] = useState<GridRow[] | null>(null);

// IDs de filas en el snapshot para mapeo consistente
const snapshotRowIds = useRef<Set<string>>(new Set());
```

**2. Capturar snapshot cuando comienza la edición**

Detectar cuando el usuario hace foco en una celda y guardar el estado actual de los datos filtrados:

```typescript
// Cuando empieza la edición, congela el snapshot
const handleActiveCellChange = useCallback(({ cell }) => {
  if (cell && !isEditing) {
    setIsEditing(true);
    // Guardar snapshot de los datos filtrados actuales
    const currentFiltered = globalSearch || activeFilterCount > 0 
      ? searchFilteredData 
      : data;
    setEditingSnapshot(currentFiltered);
    snapshotRowIds.current = new Set(currentFiltered.map(r => r.id!));
  }
}, [isEditing, globalSearch, activeFilterCount, searchFilteredData, data]);
```

**3. Liberar snapshot cuando termina la edición**

```typescript
// Cuando termina la edición (blur o cambio de filtros), liberar snapshot
const handleBlur = useCallback(() => {
  setIsEditing(false);
  setEditingSnapshot(null);
  snapshotRowIds.current.clear();
}, []);
```

**4. Usar snapshot durante edición, datos frescos fuera de edición**

```typescript
// Si hay filtros activos y estamos editando, usar el snapshot
// Pero actualizando los valores de las filas que coinciden
const displayData = useMemo(() => {
  if (!globalSearch && activeFilterCount === 0) {
    return data;
  }
  
  if (isEditing && editingSnapshot) {
    // Actualizar los valores en el snapshot con los datos actuales
    return editingSnapshot.map(snapRow => {
      const currentRow = data.find(r => r.id === snapRow.id);
      return currentRow || snapRow;
    });
  }
  
  return searchFilteredData;
}, [data, globalSearch, activeFilterCount, isEditing, editingSnapshot, searchFilteredData]);
```

**5. Modificar onChange para trabajar con el snapshot**

```typescript
onChange={(newData, ops) => {
  if (globalSearch || activeFilterCount > 0) {
    const fullData = [...data];
    
    for (const op of ops) {
      if (op.type === 'UPDATE') {
        for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
          const editedRow = newData[i];
          // Buscar por ID, no por índice
          const originalIndex = data.findIndex(r => r.id === editedRow.id);
          if (originalIndex !== -1) {
            fullData[originalIndex] = editedRow;
          }
        }
      }
    }
    
    handleChange(fullData, ops.map(op => {
      // Transformar índices del snapshot a índices del array completo
      if (op.type === 'UPDATE') {
        const rows = [];
        for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
          const editedRow = newData[i];
          const originalIndex = data.findIndex(r => r.id === editedRow.id);
          if (originalIndex !== -1) {
            rows.push({ from: originalIndex, to: originalIndex + 1 });
          }
        }
        return rows.map(r => ({ type: 'UPDATE', fromRowIndex: r.from, toRowIndex: r.to }));
      }
      return op;
    }).flat());
  } else {
    handleChange(newData, ops);
  }
}}
```

### Archivos a modificar
- `src/components/combustible/CombustibleDataGrid.tsx`
- `src/components/remitos/RemitosDataGrid.tsx` (mismo fix)

### Comportamiento esperado
- Al filtrar y editar, las filas permanecen visibles mientras escribís
- Los cambios se aplican correctamente al array de datos completo
- Cuando terminás de editar (blur), el filtro se actualiza mostrando solo las filas que coinciden
- No hay saltos ni desapariciones inesperadas durante la edición
