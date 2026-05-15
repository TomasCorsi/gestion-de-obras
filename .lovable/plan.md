## Plan: Ocultar columnas y campos para Franco en Remitos

### 1. Grilla `RemitosSimpleGrid.tsx`
Agregar prop `hideExtrasForFranco?: boolean`. Cuando es `true`, NO renderizar (header + celda) las columnas:
- **Rem. Tercero**
- **Cli. Origen**
- **Cli. Destino**
- **Proveedor**
- **Cargado por** (ya oculto: `creadoresMap` sólo se pasa a admin/capataz, sin cambios)

Ajustar `colSpan` del estado vacío restando las columnas ocultas.

### 2. Página `Remitos.tsx`
Pasar `hideExtrasForFranco={isFranco}` al `RemitosSimpleGrid`.

### 3. Formulario `RemitoQuickFormDialog.tsx`
Cuando `isFranco === true`, NO renderizar los campos:
- **Remito Tercero** (`remito_tercero`)
- **Cliente Origen** (`cliente`)
- **Cliente Destino** (`cliente_destino`)
- **Proveedor** (`proveedor`)

Los valores correspondientes en el payload de `handleSubmit` se envían como `null` / vacío para Franco. El resto del form (incluida la sección "CLIENTE CANTERA" exclusiva de Franco) queda igual.

### Resumen
Franco verá la grilla y el formulario de carga de remitos sin las columnas/campos Rem. Tercero, Cli. Origen, Cli. Destino y Proveedor. El resto de usuarios mantiene la vista actual sin cambios.
