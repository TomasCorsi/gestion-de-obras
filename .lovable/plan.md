

# Plan: Lógica Condicional para Patente y Remover ESC

## Resumen
Este plan implementa dos cambios:
1. **Lógica condicional para la columna "Patente"**: Cuando el tipo de transporte sea "Calamina Sur", mostrar el selector de maquinarias. Para otros transportes, permitir entrada de texto libre.
2. **Remover atajo ESC**: Eliminar el listener de teclado que sale del modo pantalla completa con ESC, ya que el usuario necesita ESC para salir de celdas (comportamiento tipo Excel).

---

## Cambio 1: Columna Patente Condicional

### Comportamiento Deseado

```text
┌──────────────────────────────────────────────────────────────┐
│ Si Transporte = "Calamina Sur"                               │
│   → Patente: Selector de maquinarias (código - patente)      │
│   → Valor almacenado: maquinaria_id (UUID)                   │
├──────────────────────────────────────────────────────────────┤
│ Si Transporte = Otro (Geo hermanos, Diaz Neiva, etc.)        │
│   → Patente: Input de texto libre                            │
│   → Valor almacenado: texto directo (ej: "ABC-123")          │
└──────────────────────────────────────────────────────────────┘
```

### Implementación

**Archivo:** `src/components/remitos/RemitosDataGrid.tsx`

1. Modificar la columna `maquinaria_id` para que reciba el `rowData` completo en lugar de solo el valor de la celda
2. Dentro del componente de la celda, verificar `rowData.tipo_transporte`:
   - Si es `"Calamina Sur"` → usar `GridSelectCell` con opciones de maquinarias
   - Si es otro valor → usar `textColumn` (input de texto libre)

### Cambios en GridRow

- El campo `maquinaria_id` almacenará:
  - UUID de maquinaria si transporte = "Calamina Sur"
  - Texto libre de patente si es otro transporte

### Columna Patente Modificada

```text
Pseudocódigo:

{
  ...keyColumn("maquinaria_id", {
    component: ({ rowData, setRowData, focus }) => {
      // Verificar si es Calamina Sur
      const isCalamina = rowData.tipo_transporte === "Calamina Sur";
      
      if (isCalamina) {
        // Mostrar selector de maquinarias
        return <GridSelectCell 
          value={rowData.maquinaria_id}
          onChange={(v) => setRowData({ ...rowData, maquinaria_id: v })}
          options={maquinariaOptions}
        />;
      } else {
        // Mostrar input de texto libre
        return <input 
          value={rowData.maquinaria_id}
          onChange={(e) => setRowData({ ...rowData, maquinaria_id: e.target.value })}
        />;
      }
    },
    // ... rest of column config
  }),
}
```

### Consideraciones

- Al cambiar de "Calamina Sur" a otro transporte, el valor de `maquinaria_id` se mantiene (puede ser limpiado si se desea)
- Al cambiar de otro transporte a "Calamina Sur", el texto libre se pierde y debe seleccionar una maquinaria

---

## Cambio 2: Remover Atajo ESC

### Archivos Afectados

1. **`src/pages/Remitos.tsx`** - Líneas 266-276: Eliminar `handleEscapeKey` y el `useEffect` asociado
2. **`src/pages/Gastos.tsx`** - Líneas 420-430: Eliminar `handleEscapeKey` y el `useEffect` asociado

### Código a Eliminar

En **Remitos.tsx**:
```text
// Eliminar estas líneas (266-276):
const handleEscapeKey = useCallback((event: KeyboardEvent) => {
  if (event.key === "Escape" && viewMode === "grid") {
    setViewMode("table");
  }
}, [viewMode]);

useEffect(() => {
  document.addEventListener("keydown", handleEscapeKey);
  return () => document.removeEventListener("keydown", handleEscapeKey);
}, [handleEscapeKey]);
```

En **Gastos.tsx**:
```text
// Eliminar estas líneas (420-430):
const handleEscapeKey = useCallback((event: KeyboardEvent) => {
  if (event.key === "Escape" && viewModeComb === "grid" && activeTab === "combustible") {
    setViewModeComb("table");
  }
}, [viewModeComb, activeTab]);

useEffect(() => {
  document.addEventListener("keydown", handleEscapeKey);
  return () => document.removeEventListener("keydown", handleEscapeKey);
}, [handleEscapeKey]);
```

### Resultado

- ESC funcionará normalmente dentro de las celdas del grid para cancelar edición (comportamiento Excel)
- Para salir del modo pantalla completa, el usuario usa el botón X o el toggle de vista

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/remitos/RemitosDataGrid.tsx` | Lógica condicional para columna Patente |
| `src/pages/Remitos.tsx` | Eliminar listener ESC |
| `src/pages/Gastos.tsx` | Eliminar listener ESC |

---

## Flujo de Usuario Final

1. **En la grilla de Remitos:**
   - Usuario selecciona "Calamina Sur" como transporte
   - En la columna Patente, aparece un selector con las maquinarias disponibles (código - patente)
   - Usuario selecciona "Geo hermanos" como transporte
   - En la columna Patente, aparece un input donde puede escribir cualquier patente

2. **Tecla ESC:**
   - Presionar ESC dentro de una celda cancela la edición (como en Excel)
   - Para salir de pantalla completa, usar el botón X o cambiar a modo Tabla

