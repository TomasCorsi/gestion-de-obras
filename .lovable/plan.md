
# Plan: Corregir Detección de Filas Eliminadas en Grillas

## Problema Identificado

Las grillas de Combustible y Remitos no detectan correctamente cuando se eliminan filas mediante el menú contextual ("Delete row"). Esto ocurre porque:

1. `react-datasheet-grid` llama a `onChange` con dos parámetros: `newValue` (el nuevo array) y `operations` (las operaciones realizadas)
2. El código actual solo usa `newValue` e ignora `operations`
3. Para eliminaciones, la librería **remueve la fila del array**, pero el enfoque actual de comparar con `initialData` no funciona correctamente debido a timing de renders

## Solución

Implementar el patrón oficial de la documentación de react-datasheet-grid usando **Sets de useRef** para trackear IDs de filas eliminadas:

```text
┌─────────────────────────────────────────────────────────────┐
│  onChange(newValue, operations)                             │
│    ↓                                                        │
│  for (operation of operations)                              │
│    if operation.type === 'DELETE'                           │
│      → Agregar IDs al deletedRowIds Set                     │
│      → Re-insertar filas en newValue (para mostrar tachado) │
│    ↓                                                        │
│  setData(newValue)                                          │
└─────────────────────────────────────────────────────────────┘
```

## Cambios por Archivo

### 1. `src/components/combustible/CombustibleDataGrid.tsx`

**Agregar Sets para trackear cambios:**
```text
const createdRowIds = useRef(new Set<string>()).current;
const deletedRowIds = useRef(new Set<string>()).current;
const updatedRowIds = useRef(new Set<string>()).current;
```

**Modificar `handleChange` para usar operations:**
```text
const handleChange = useCallback((newValue: GridRow[], operations: Operation[]) => {
  for (const operation of operations) {
    if (operation.type === 'CREATE') {
      // Marcar nuevas filas
    }
    if (operation.type === 'UPDATE') {
      // Marcar filas modificadas
    }
    if (operation.type === 'DELETE') {
      // Para filas existentes (con ID), agregarlas a deletedRowIds
      // y re-insertarlas en el array para mostrarlas tachadas
    }
  }
  setData(newValue);
}, []);
```

**Actualizar `hasChanges`:**
```text
const hasChanges = useMemo(() => {
  return createdRowIds.size > 0 || 
         updatedRowIds.size > 0 || 
         deletedRowIds.size > 0;
}, [data]); // data como dependencia para re-evaluar
```

**Actualizar `handleReset`:**
```text
const handleReset = useCallback(() => {
  setData(initialData);
  createdRowIds.clear();
  deletedRowIds.clear();
  updatedRowIds.clear();
  clearDraft();
}, [initialData, clearDraft]);
```

**Actualizar `handleSave`:**
```text
const handleSave = async () => {
  const created = data.filter(row => createdRowIds.has(row.id || ''));
  const updated = data.filter(row => updatedRowIds.has(row.id || ''));
  const deleted = Array.from(deletedRowIds);
  
  await onSave({ created, updated, deleted });
  
  // Limpiar Sets y remover filas eliminadas del data
  const newData = data.filter(row => !deletedRowIds.has(row.id || ''));
  setData(newData);
  createdRowIds.clear();
  deletedRowIds.clear();
  updatedRowIds.clear();
};
```

**Actualizar `rowClassName` para mostrar filas eliminadas tachadas:**
```text
rowClassName={({ rowData }) => {
  if (deletedRowIds.has(rowData.id)) return 'row-deleted';
  if (createdRowIds.has(rowData.id)) return 'row-created';
  if (updatedRowIds.has(rowData.id)) return 'row-updated';
  return '';
}}
```

### 2. `src/components/remitos/RemitosDataGrid.tsx`

Aplicar los mismos cambios que en CombustibleDataGrid.

## Detalles Técnicos

### Tipo Operation de react-datasheet-grid

```text
interface Operation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  fromRowIndex: number;
  toRowIndex: number;
}
```

### Comportamiento Visual

- **Filas nuevas**: fondo verde claro (row-created) 
- **Filas modificadas**: fondo amarillo claro (row-updated)
- **Filas eliminadas**: fondo rojo claro + texto tachado (row-deleted)

### Generación de IDs para nuevas filas

Las filas nuevas necesitan un ID temporal para trackearse. Se usará:
```text
const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### Persistencia de Borradores

El sistema de localStorage seguirá funcionando igual, pero ahora también guardará los Sets serializados.

## Orden de Implementación

1. Agregar imports y tipos necesarios
2. Agregar useRef Sets para tracking
3. Modificar `handleChange` para procesar operations
4. Actualizar `createRow` para generar IDs temporales
5. Actualizar `hasChanges` 
6. Actualizar `handleReset`
7. Actualizar `handleSave`
8. Actualizar `rowClassName`
9. Repetir para RemitosDataGrid
