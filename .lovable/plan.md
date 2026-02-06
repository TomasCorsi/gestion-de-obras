

## Plan: Corregir perdida de filas al editar columnas filtradas en grilla de Combustible

### Problema real

El problema de fondo es que cuando hay filtros activos, la grilla muestra un **subconjunto** de filas (el snapshot). Al editar, `onChange` recibe ese subconjunto modificado como `newData`, y luego `setData(processedData)` **reemplaza todo el dataset** con ese subconjunto, perdiendo las filas que no estaban visibles.

Ademas, para las operaciones DELETE, se usa `data.slice(operation.fromRowIndex, ...)` con indices que corresponden a `displayData`, no a `data`, lo cual tambien es incorrecto.

### Solucion

Modificar `handleChange` para que, cuando haya filtros activos (snapshot activo), en lugar de reemplazar `data` con `newData`, **mapee los cambios de vuelta al dataset completo** usando IDs:

1. **UPDATE**: Buscar cada fila modificada por ID en `data` y actualizarla ahi
2. **DELETE**: Buscar la fila a borrar por ID en `displayData` (no por indice de `data`)
3. **CREATE**: Agregar las filas nuevas al final de `data`

### Cambios en `src/components/combustible/CombustibleDataGrid.tsx`

En `handleChange`:

```
// Cuando hay snapshot activo, mapear cambios al dataset completo
if (editingSnapshot) {
  let fullData = [...data];

  for (const operation of operations) {
    if (operation.type === 'UPDATE') {
      for (let i = operation.fromRowIndex; i < operation.toRowIndex; i++) {
        const updatedRow = newData[i];
        if (!updatedRow?.id) continue;
        const fullIdx = fullData.findIndex(r => r.id === updatedRow.id);
        if (fullIdx !== -1) {
          // Aplicar cambio en dataset completo
          fullData[fullIdx] = { ...updatedRow, costo_total: ... };
          // Track modificacion
        }
      }
    }
    // DELETE y CREATE similares, usando IDs
  }

  setData(fullData);
  // Actualizar snapshot para reflejar cambios
  setEditingSnapshot(prev => prev.map(row => {
    const updated = fullData.find(r => r.id === row.id);
    return updated || row;
  }));
  return;
}

// Flujo original sin filtros (sin cambios)
...
```

Esto garantiza que:
- Las filas no visibles se mantienen intactas
- Los cambios en columnas filtradas no hacen desaparecer filas
- El snapshot se actualiza con los valores editados
- Al guardar o limpiar filtros, todo el dataset esta completo y correcto

### Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/combustible/CombustibleDataGrid.tsx` | Modificar `handleChange` para mapear cambios por ID al dataset completo cuando hay snapshot activo |

