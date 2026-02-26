

# Agregar columnas y opciones al modulo de Remitos

## Resumen
Agregar dos nuevas columnas a la grilla de remitos (Proveedor y Cliente), actualizar las opciones de tipos de material y transportes, y adaptar la importacion CSV con validacion.

## Cambios en Base de Datos

**Migracion SQL**: Agregar dos columnas de texto a la tabla `remitos`:
- `proveedor` (text, nullable)
- `cliente` (text, nullable)

## Cambios en Codigo

### 1. `src/hooks/useRemitos.ts`
- Agregar `proveedor` y `cliente` a las interfaces `RemitoDB` y `RemitoForm`
- Incluirlos en las operaciones de batch save y update

### 2. `src/components/remitos/RemitosDataGrid.tsx`

**Nuevas columnas en la grilla:**
- **Proveedor** (columna de texto) entre Fecha y Desde
- **Cliente** (columna de texto) entre Hasta y Viajes

**Actualizar opciones de `tipoMaterialOptions`:**
- Reemplazar "Cobertura de basura" por "Cobertura de residuos"
- Agregar: Arena, Hormigon H30, Tierra negra, Relleno, Piedra 30/50, Materiales varios

**Actualizar opciones de `tipoTransporteOptions`:**
- Agregar: Hormigret, Lamacol, Britcom, Ramon romero gomez, Duraez

**Actualizar logica de cambios:**
- Incluir `proveedor` y `cliente` en la deteccion de modificaciones y en el payload de guardado

**Agregar filtros:**
- Agregar filtros de columna para Proveedor y Cliente

### 3. `src/components/remitos/CSVImportDialog.tsx`

**Agregar soporte de importacion para las nuevas columnas:**
- Agregar aliases para `proveedor` y `cliente` en el mapeo de columnas CSV
- Incluir en la plantilla de descarga
- Agregar normalizacion para los nuevos tipos de material y transportes

**Validacion de datos en importacion:**
- Si se especifica un tipo_material que no esta en la lista, mostrar advertencia pero permitir importacion
- Si se especifica un tipo_transporte que no esta en la lista, mostrar advertencia pero permitir importacion
- Mostrar seccion de validacion con resumen de campos reconocidos vs no reconocidos

### 4. `src/pages/Remitos.tsx`

**Actualizar listas de opciones:**
- Sincronizar `tipoMaterialOptions` y `tipoTransporteOptions` con las nuevas opciones
- Agregar campos de Proveedor y Cliente al formulario de tabla
- Incluir en la vista de detalle y en la busqueda

### 5. `src/components/remitos/RemitosDataGrid.tsx` - GridRow interface
- Agregar `proveedor: string` y `cliente: string` al tipo GridRow
- Incluir en initialData, handleAddRow, createRow

## Lista final de tipos de material
Residuos, Desmonte, Cascote, Escombro, Tierra, Piedra, Movimiento interno, Tosca, Cemento, Hormigon, Traslado, Cubiertas, Frezado, Cobertura de residuos, Arena, Hormigon H30, Tierra negra, Relleno, Piedra 30/50, Materiales varios

## Lista final de transportes
Calamina Sur, Geo hermanos, Diaz Neiva, japones, Cato, Tatu, Patan, Hormigret, Lamacol, Britcom, Ramon romero gomez, Duraez

