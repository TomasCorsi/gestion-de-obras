

# Agregar campo "KM Camión" al parte diario de choferes

## Cambios necesarios

### 1. Base de datos
Agregar columna `km_camion` (numeric, nullable, default 0) a la tabla `partes_diarios`.

```sql
ALTER TABLE public.partes_diarios ADD COLUMN km_camion numeric DEFAULT 0;
```

### 2. Hook `useParteDiario.ts`
- Agregar `km_camion` a la interfaz `ParteDiario` y `ParteDiarioInsert`.

### 3. Formulario `ParteDiarioFormView.tsx`
- Agregar `km_camion` al `defaultFormData` y al `useEffect` que carga datos existentes.
- Agregar campo de input numérico visible solo para choferes (`isChofer`), ubicado después de la sección de Viajes.
- En `buildParteData()`, incluir `km_camion` solo para choferes.
- En `validateForComplete()`, validar que `km_camion` tenga valor > 0 para choferes (obligatorio al completar).

### 4. Detalle y Admin
- Mostrar el campo en `ParteDiarioDetailDialog` y en la vista admin si el parte es de un chofer.

### Archivos a modificar
- `src/hooks/useParteDiario.ts` -- interfaces
- `src/components/parte-diario/ParteDiarioFormView.tsx` -- campo + validación
- `src/components/parte-diario/ParteDiarioDetailDialog.tsx` -- mostrar en detalle
- `src/components/parte-diario/ParteDiarioCardView.tsx` -- mostrar en cards admin (si aplica)
- Migración SQL para agregar la columna

