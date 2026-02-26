

# Agregar selector de modo de calculo de Precio Total por fila

## Problema
Actualmente, Precio Total siempre se calcula como `Precio Uni. x Viajes`. Pero a veces el usuario necesita que sea `Precio Uni. x Cant. Total`. Esto debe poder elegirse caso por caso en cada fila.

## Solucion
Agregar una nueva columna **"Calc. Precio"** (o similar) con un selector que permita elegir entre dos modos de calculo por fila.

## Cambios

### 1. Migracion de base de datos
Agregar una columna a la tabla `remitos`:
```text
precio_calc_mode TEXT DEFAULT 'viajes'
```
Valores posibles: `'viajes'` (Precio Uni. x Viajes) o `'cantidad'` (Precio Uni. x Cant. Total).

### 2. Actualizar `RemitosDataGrid.tsx`

**Nueva columna "Calc."**: un selector con dos opciones:
- "x Viajes" (default)
- "x Cant. Total"

Se ubicara entre "Precio Uni." y "Precio Total".

**Logica de auto-calculo actualizada**:
```text
Si modo = 'viajes':   Precio Total = Precio Uni. x Viajes
Si modo = 'cantidad': Precio Total = Precio Uni. x Cant. Total
```

Donde Cant. Total = Cant. Uni. x Viajes (esto no cambia).

**Actualizar `handleChange`**: al cambiar `cantidad_uni`, `cantidad_viajes`, `precio_unitario` o `precio_calc_mode`, recalcular segun el modo seleccionado.

**Actualizar `handleAddRow`**: valor por defecto `precio_calc_mode: 'viajes'`.

**Actualizar `handleSave`**: incluir `precio_calc_mode` en los datos enviados a la BD.

### 3. Actualizar `useRemitos.ts`
Agregar `precio_calc_mode: string | null` a `RemitoDB` y `RemitoForm`.

### 4. Actualizar importacion CSV
Agregar soporte para una columna opcional "Calc. Precio" en el CSV. Si no esta presente, usar `'viajes'` como default.

## Seccion tecnica

### Migracion SQL
```sql
ALTER TABLE remitos ADD COLUMN precio_calc_mode text DEFAULT 'viajes';
```

### Logica de calculo
```text
viajes = row.cantidad_viajes || 1
cant_total = (row.cantidad_uni || 0) * viajes

if (row.precio_unitario != null) {
  if (row.precio_calc_mode === 'cantidad') {
    row.precio_total = row.precio_unitario * cant_total
  } else {
    row.precio_total = row.precio_unitario * viajes
  }
}
```

### Orden de columnas actualizado
Rem. Tercero, Rem. Local, Fecha, Proveedor, Desde, Hasta, Cliente, Viajes, Cant. Uni., Cant. Total, Unidad, Tipo, Precio Uni., **Calc.**, Precio Total, Transporte, Patente Local, Patente Tercero, Descripcion
