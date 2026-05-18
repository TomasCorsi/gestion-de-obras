## Objetivo

Mover **Gastos Generales** (la pestaña "otros" actualmente en `/gastos`) dentro de la sección **Proveedores**, como nueva tab al lado de **Órdenes de Compra**.

Reposicionamiento conceptual:
- **Órdenes de Compra** → compras en blanco (proveedor formal, IVA, OC numerada).
- **Gastos Generales** → gastos en negro / informales (proveedor texto opcional, sin IVA, sin OC).

## Cambios

### 1. Nuevo componente `src/components/proveedores/GastosGeneralesTab.tsx`
Extraer de `src/pages/Gastos.tsx` toda la lógica del tab `"otros"`:
- Estado (`searchTermOtros`, `filtersOtros`, `formOpenOtros`, `selectedGasto`, `formDataOtros`, etc.).
- Handlers (`handleNewOtros`, `handleEditOtros`, `handleViewOtros`, `handleDeleteOtros`, `handleSubmitOtros`, `confirmDeleteOtros`).
- Hook `useOtrosGastos`, `useObras`.
- UI: filtros + tabla + FormDialog + DetailDialog + DeleteConfirmDialog (las mismas que ya están en Gastos.tsx para el tab "otros").

Componente autocontenido, sin props.

### 2. `src/pages/Proveedores.tsx`
Agregar tercer tab:
```
Proveedores | Órdenes de Compra | Gastos Generales
```
- Import `GastosGeneralesTab` + ícono `Receipt` o `Wallet`.
- Nuevo `<TabsTrigger value="gastos">` y `<TabsContent value="gastos"><GastosGeneralesTab /></TabsContent>`.

### 3. `src/pages/Gastos.tsx`
- Eliminar el `TabsTrigger value="otros"` y el `TabsContent value="otros"` (líneas 557-560 y 785+).
- Eliminar todo el estado/handlers/form data relacionados con "otros gastos".
- Eliminar import de `useOtrosGastos` y tipos asociados.
- `loading` deja de incluir `loadingOtros`.
- KPI `totalCostoOtros` removido si solo se usa allí.

### 4. AppLauncher / navegación
Sin cambios — Gastos sigue existiendo con sus otros tabs (maquinarias, personal, combustible, repartidor). Solo se traslada el subtab "otros".

### 5. Memoria
Actualizar `mem://business-rules/core-logic` o crear nota corta: regla "OC = blanco / Gastos Generales = negro, ambos viven en Proveedores".

## Notas técnicas

- No hay cambios de DB: la tabla `otros_gastos` queda igual.
- RLS ya permite admin/capataz/ayudante manejarla.
- El reporte financiero de obra sigue consumiendo `otros_gastos` por hook; no se rompe.
- URL state: usar `useUrlTab` ya existente en Proveedores para que `?tab=gastos` funcione.
