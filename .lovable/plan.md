

# Fix Importacion CSV de Remitos - obra_id nullable + parsing bugs

## Problema principal

La tabla `remitos` tiene `obra_id uuid NOT NULL`, pero los remitos no necesitan un `obra_id` porque la obra se registra en las columnas de texto `desde` y `hasta`. El importador CSV asigna `obra_id: ''` (string vacio) que falla como UUID.

## Cambios

### 1. Migracion de base de datos: hacer `obra_id` nullable

```sql
ALTER TABLE public.remitos ALTER COLUMN obra_id DROP NOT NULL;
```

Esto permite insertar remitos sin `obra_id`, ya que la informacion de obra esta en `desde` y `hasta`.

### 2. Fix BOM character en CSVImportDialog

**Archivo:** `src/components/remitos/CSVImportDialog.tsx`

Al inicio del parsing, limpiar el BOM (`\uFEFF`) del texto:
```text
text = text.replace(/^\uFEFF/, '')
```
Sin esto, el primer header `rem. tercero` no matchea con su alias.

### 3. Fix obra_id en datos importados

**Archivo:** `src/components/remitos/CSVImportDialog.tsx`

Cambiar `obra_id: ''` a `obra_id: undefined` para que no se envie un string vacio al insert. Tambien actualizar el tipo `RemitoForm` para que `obra_id` sea opcional.

### 4. Fix parsing de precios con separador de miles

**Archivo:** `src/components/remitos/CSVImportDialog.tsx`

Crear funcion `parseNumber` que maneje formatos como `$ 2,000.00` y `2.000,50`:
- Quitar simbolo `$` y espacios
- Detectar si la coma es decimal o separador de miles
- Retornar el numero correcto

### 5. Hacer obra_id opcional en RemitoForm

**Archivo:** `src/hooks/useRemitos.ts`

Cambiar `obra_id: string` a `obra_id?: string` en la interfaz `RemitoForm` para que no sea obligatorio al crear remitos desde el CSV.

### Archivos a modificar
1. **Migracion SQL** -- `ALTER TABLE remitos ALTER COLUMN obra_id DROP NOT NULL`
2. `src/components/remitos/CSVImportDialog.tsx` -- BOM fix, obra_id undefined, parseNumber
3. `src/hooks/useRemitos.ts` -- obra_id opcional en RemitoForm

