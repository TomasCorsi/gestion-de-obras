

# Hacer Cant. Uni. y Precio Uni. persistentes, y Cant. Total / Precio Total calculados

## Problema actual
`cantidad_uni` y `precio_unitario` son campos virtuales (no se guardan en la BD). El usuario necesita que sean campos reales, y que **Cant. Total** y **Precio Total** se calculen automaticamente:

- **Cant. Total** = Cant. Uni. x Viajes
- **Precio Total** = Precio Uni. x Viajes

## Cambios

### 1. Migracion de base de datos
Agregar dos columnas nuevas a la tabla `remitos`:
- `cantidad_uni NUMERIC` (nullable, default null)
- `precio_unitario NUMERIC` (nullable, default null)

### 2. Actualizar `RemitosDataGrid.tsx`

**Auto-calculo en `handleChange`**: cuando el usuario edita `cantidad_uni`, `cantidad_viajes` o `precio_unitario`, recalcular automaticamente:
- `cantidad = cantidad_uni x cantidad_viajes`
- `precio_total = precio_unitario x cantidad_viajes`

**Hacer Cant. Total y Precio Total de solo lectura** (o bien dejarlos editables como override manual -- a definir). Lo mas logico es que sean **solo lectura** ya que se calculan.

**Persistir en `handleSave`**: incluir `cantidad_uni` y `precio_unitario` en los objetos de creacion y actualizacion enviados a la BD.

**Inicializar desde BD**: en `initialData`, leer `cantidad_uni` y `precio_unitario` desde el registro de la BD (ya no seran null por defecto si tienen valor).

### 3. Actualizar `useRemitos.ts`
Agregar `cantidad_uni` y `precio_unitario` a las interfaces `RemitoDB` y `RemitoForm` (ya existen parcialmente, verificar que coincidan con la BD).

### 4. Actualizar importacion CSV (`CSVImportDialog.tsx`)
Asegurar que al importar, `cantidad_uni` y `precio_unitario` se persistan en la BD, y que `cantidad` y `precio_total` se calculen a partir de ellos.

## Seccion tecnica

### Migracion SQL
```sql
ALTER TABLE remitos ADD COLUMN cantidad_uni NUMERIC;
ALTER TABLE remitos ADD COLUMN precio_unitario NUMERIC;
```

### Logica de calculo en la grilla
En el handler de cambios, despues de detectar un UPDATE, recalcular los totales:
```
row.cantidad = (row.cantidad_uni || 0) * (row.cantidad_viajes || 1)
row.precio_total = (row.precio_unitario || 0) * (row.cantidad_viajes || 1)
```

### Columnas de solo lectura
Las columnas `cantidad` y `precio_total` se marcaran como `disabled: true` en la definicion de columnas para que no sean editables directamente.

