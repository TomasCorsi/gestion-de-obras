

# Agregar columnas faltantes a la grilla de Remitos

## Columnas faltantes
La grilla actualmente no muestra: **Proveedor**, **Cliente**, **Cantidad Uni.**, **Precio Uni.** y **Descripcion**. Se agregarán para que la grilla coincida exactamente con el formato del CSV.

## Orden final de columnas
Rem. Tercero, Rem. Local, Fecha, Proveedor, Desde, Hasta, Cliente, Viajes, Cantidad Uni., Cantidad Total, Unidad, Tipo, Precio Uni., Precio Total, Transporte, Patente Local, Patente Tercero, Descripcion

## Cambios en `src/components/remitos/RemitosDataGrid.tsx`

### 1. Agregar campos al GridRow interface
- `observaciones: string` (para Descripcion)
- `cantidad_uni: number | null` (campo calculado en la grilla, no se guarda en BD directamente)
- `precio_unitario: number | null` (campo calculado en la grilla, no se guarda en BD directamente)

### 2. Agregar columnas en el array `columns`
Insertar en el orden correcto:
- **Proveedor** (texto libre, con filtro) despues de Fecha
- **Cliente** (texto libre, con filtro) despues de Hasta
- **Cantidad Uni.** (float) antes de Cantidad Total -- valor por viaje
- **Precio Uni.** (float) antes de Precio Total -- valor unitario
- **Descripcion** (texto libre) al final, despues de Patente Tercero

### 3. Logica de campos calculados
- **Cantidad Uni.**: editable; al cambiar, recalcular `cantidad` (total) = `cantidad_uni` x `cantidad_viajes`
- **Precio Uni.**: editable; al cambiar, recalcular `precio_total` = `precio_unitario` x `cantidad`
- Alternativamente, si es mas simple: ambos son campos editables independientes sin calculo automatico (el usuario los llena manualmente)

Dado que la BD no tiene columnas `cantidad_uni` ni `precio_unitario`, se manejaran como campos virtuales de la grilla que no se persisten. Simplemente seran editables para referencia visual.

### 4. Actualizar `initialData` mapping
Agregar `observaciones`, `proveedor`, `cliente` al mapeo (proveedor y cliente ya estan en GridRow pero no tienen columna visible). Agregar los campos virtuales `cantidad_uni` y `precio_unitario` inicializados en null/0.

### 5. Actualizar `handleAddRow` y `createRow`
Incluir los nuevos campos con valores por defecto.

### 6. Actualizar `handleChange` (deteccion de modificaciones)
Agregar comparacion de `observaciones` al chequeo de cambios.

### 7. Actualizar `handleSave`
Incluir `observaciones` en los datos enviados al guardar (created y updated). Los campos `cantidad_uni` y `precio_unitario` no se persisten ya que no existen en la BD.

### 8. Actualizar filtros
Agregar "Proveedor" y "Cliente" a `filterConfigs` (ya estan en la busqueda global pero no tienen filtro de columna).

