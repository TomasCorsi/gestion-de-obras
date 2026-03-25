

## Plan: Filtro por tipo en Remitos + Liquidación por cliente

### 1. Filtro por Tipo Material en la página de Remitos

**Archivo: `src/pages/Remitos.tsx`**
- Agregar un `Select` después del FilterBar existente para filtrar por `tipo_material` (Desmonte, Cascote, Mov. Interno, etc.)
- Extraer los valores únicos de `tipo_material` de los remitos cargados para poblar las opciones dinámicamente
- Aplicar el filtro en el `filteredRemitos` existente

### 2. Sección de Liquidación por Cliente

**Nuevo archivo: `src/components/remitos/LiquidacionClienteDialog.tsx`**
- Dialog/sheet que se abre desde un botón "Liquidar por Cliente" en la barra de acciones
- Contenido:
  - Selector de cliente (de los clientes presentes en los remitos filtrados)
  - Checkboxes para elegir qué tipos incluir (Desmonte, Mov. Interno, Cascote, etc.) - todos marcados por defecto
  - Selector de período (usa las mismas fechas del filtro activo)
  - Tabla resumen con:
    - Desglose por tipo de material: cantidad de viajes, cantidad total (m3/tn), precio total
    - Fila de TOTAL general
  - Botón para exportar a PDF o Excel

**Archivo: `src/pages/Remitos.tsx`**
- Agregar botón "Liquidar" en la barra de acciones
- Pasar los remitos filtrados y clientes al dialog

### Detalle técnico

**Filtro por tipo:**
```
tipos únicos = [...new Set(remitos.map(r => r.tipo_material).filter(Boolean))]
filteredRemitos: si tipoFilter está activo, filtrar por r.tipo_material === tipoFilter
```

**Liquidación por cliente:**
- Agrupa `filteredRemitos` por `cliente` (o `cliente_destino`)
- Para el cliente seleccionado, agrupa por `tipo_material`
- Suma `cantidad_viajes`, `cantidad`, `precio_total` por tipo
- Los checkboxes de tipo permiten incluir/excluir categorías del total
- Genera tabla con columnas: Tipo | Viajes | Cantidad | Unidad | Precio Total

### Archivos a crear/editar
- `src/pages/Remitos.tsx` — agregar filtro tipo + botón liquidar
- `src/components/remitos/LiquidacionClienteDialog.tsx` — nuevo componente con la liquidación

