

# Auto-deteccion de Obras y Clientes en Importacion CSV de Remitos

## Objetivo

Mejorar la importacion masiva de remitos para que las columnas "Desde", "Hasta" y "Cliente" del CSV se matcheen automaticamente contra los registros de la base de datos (obras y clientes respectivamente). Ademas, convertir la columna "Cliente" en la grilla a un selector con autocompletado (igual que "Desde" y "Hasta").

## Cambios

### 1. Agregar `useClientes` al modulo de Remitos

**Archivo:** `src/pages/Remitos.tsx`

- Importar `useClientes` y obtener la lista de clientes
- Crear un `clientesMap` (nombre normalizado -> nombre real) similar a como se hace con `maquinariasMap`
- Crear `obrasMap` (nombre normalizado -> nombre real) a partir de las obras existentes
- Pasar ambos mapas al `CSVImportDialog` y las opciones de clientes al `RemitosDataGrid`

### 2. Actualizar CSVImportDialog para matchear obras y clientes

**Archivo:** `src/components/remitos/CSVImportDialog.tsx`

- Agregar props: `obrasMap` (Record de nombre normalizado -> nombre obra) y `clientesMap` (Record de nombre normalizado -> nombre cliente)
- En la funcion `parseCSV`, para los campos `desde` y `hasta`:
  - Busqueda exacta case-insensitive contra nombres de obras
  - Busqueda parcial (contiene) como fallback
  - Si no matchea, dejar el valor original y generar un warning
- Para el campo `cliente`:
  - Busqueda exacta case-insensitive contra nombres de clientes
  - Busqueda parcial como fallback
  - Si no matchea, dejar el valor original y generar un warning
- Agregar nueva seccion de estadisticas de matching en la preview (similar a la de maquinarias): cuantas obras y clientes fueron detectados vs no encontrados
- Agregar warnings visuales para las filas con obras/clientes no reconocidos

### 3. Convertir columna "Cliente" a selector con autocompletado en la grilla

**Archivo:** `src/components/remitos/RemitosDataGrid.tsx`

- Agregar prop `clientes` (lista de clientes del hook)
- Crear `clienteOptions` con los nombres de clientes activos
- Cambiar la columna "cliente" de `textColumn` a un `GridSelectCell` (igual que "Desde" y "Hasta"), permitiendo autocompletado al escribir

### Detalles tecnicos

**Logica de matching para obras:**
```text
1. Exacto case-insensitive: "obra centro" -> "Obra Centro"
2. Parcial (el valor del CSV esta contenido en el nombre de la obra o viceversa)
3. Sin match -> warning + se mantiene el texto original
```

**Logica de matching para clientes:**
```text
1. Exacto case-insensitive: "cliente srl" -> "Cliente SRL"
2. Parcial (contiene)
3. Sin match -> warning + se mantiene el texto original
```

**Props nuevas del CSVImportDialog:**
- `obrasMap: Record<string, string>` -- nombre normalizado (lowercase) -> nombre real
- `clientesMap: Record<string, string>` -- nombre normalizado (lowercase) -> nombre real

**Props nuevas del RemitosDataGrid:**
- `clientes: ClienteDB[]` -- para generar las opciones del selector de cliente

**Archivos a modificar:**
1. `src/pages/Remitos.tsx` -- agregar useClientes, crear mapas, pasar props
2. `src/components/remitos/CSVImportDialog.tsx` -- logica de matching de obras/clientes
3. `src/components/remitos/RemitosDataGrid.tsx` -- columna cliente como GridSelectCell

