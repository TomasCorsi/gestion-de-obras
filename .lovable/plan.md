

## Plan: Asignar precios masivamente por tipo de material

### Concepto
Un dialog donde definís un precio unitario por tipo de material (ej: Desmonte = $5000) y se aplica automáticamente a todos los remitos filtrados que coincidan con ese tipo, recalculando `precio_unitario` y `precio_total`.

### Cambios

**1. Nuevo componente: `src/components/remitos/AsignarPreciosMasivosDialog.tsx`**
- Dialog con una tabla que lista cada `tipo_material` encontrado en los remitos filtrados
- Cada fila muestra: Tipo | Cantidad de remitos | Input para precio unitario
- Selector de modo de cálculo: "por viaje" o "por m3/tn" (determina si `precio_total = precio_unitario × cantidad_viajes` o `precio_unitario × cantidad`)
- Botón "Aplicar" que actualiza todos los remitos del tipo seleccionado vía `batchSave`
- Preview del total resultante antes de aplicar

**2. `src/pages/Remitos.tsx`**
- Agregar botón "Asignar Precios" en la barra de acciones (junto a Liquidar, Recalcular, etc.)
- Pasar `filteredRemitos` y `batchSave` al dialog
- Al cerrar el dialog con éxito, se refresca la lista

### Flujo de uso
```text
1. Filtrás por obra/período/tipo
2. Click "Asignar Precios"
3. Ves la lista de tipos de material con cantidad de remitos
4. Cargás precio unitario en cada tipo que quieras
5. Elegís modo (por viaje / por cantidad)
6. Click "Aplicar" → actualiza masivamente
```

### Archivos a crear/editar
- `src/components/remitos/AsignarPreciosMasivosDialog.tsx` — nuevo
- `src/pages/Remitos.tsx` — botón + state para abrir dialog

