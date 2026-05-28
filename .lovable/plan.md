# Asignar Gastos Generales a Maquinarias

Permitir vincular cada gasto general a una maquinaria específica, identificándola por **código** y **patente**, además de la obra ya existente.

## 1. Base de datos
Migración sobre `otros_gastos`:
- Agregar columna `maquinaria_id UUID NULL` (sin FK rígida, manteniendo el patrón actual del proyecto).
- Index en `maquinaria_id` para filtrados rápidos.

No se tocan políticas RLS (las existentes ya cubren admin/capataz/ayudante/maquinista).

## 2. Hook `useOtrosGastos.ts`
- Agregar `maquinaria_id?: string | null` a `OtroGastoForm`, `OtroGastoDB`.
- Extender `OtroGastoWithRelations` con `maquinaria?: { codigo, nombre, patente, tipo }`.
- En `fetchGastosFromDB`, sumar al select: `maquinaria:maquinarias(id, codigo, nombre, patente, tipo)`.

## 3. Formulario (`GastosGeneralesTab.tsx`)
Nuevo campo **Maquinaria (opcional)** debajo de Obra:
- `Combobox` con búsqueda por **código + patente + nombre** (ej. `"M-12 · AB123CD · Cargadora CAT"`).
- Opción "Sin asignar".
- Lista solo maquinarias activas (estado distinto de "baja"), ordenadas por código.
- Se guarda `maquinaria_id` (o `null`).

## 4. Tabla y detalle
- **Nueva columna "Maquinaria"** en la tabla: muestra `código · patente` (fallback a nombre si falta código).
- **Buscador**: incluir código, patente y nombre de maquinaria.
- **Detalle**: nueva fila "Maquinaria" con código, patente y tipo.

## 5. Filtro adicional
Agregar al toolbar un selector "Maquinaria" (Combobox por código/patente) que filtra `filtered` por `maquinaria_id`. Persistencia local en el componente (no URL state, para mantener simple).

## 6. KPIs
Sin cambios; los totales por categoría siguen funcionando igual y respetan los nuevos filtros porque operan sobre `filtered`.

## Archivos a modificar
- `supabase/migrations/...` (nueva)
- `src/hooks/useOtrosGastos.ts`
- `src/components/proveedores/GastosGeneralesTab.tsx`

## Lo que NO se toca
- Categorías de gasto, lógica de IVA, proveedores, RLS, PDF/exportación, ni el módulo de Gastos de Maquinaria existente (este cambio es complementario, no lo reemplaza).
