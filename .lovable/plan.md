## Agregar hoja de detalle de remitos al Excel de Liquidación por Cliente

En `src/components/remitos/LiquidacionClienteDialog.tsx`, modificar `exportarExcel()` para agregar una segunda hoja "Detalle Remitos" al workbook, además de la hoja "Liquidación" ya existente.

### Hoja "Detalle Remitos"

Una fila por cada remito incluido en la liquidación (los mismos filtros aplicados: clientes seleccionados + tipos de material seleccionados), ordenados por fecha ascendente.

Columnas:
- Fecha (dd/mm/yyyy)
- N° Remito (`numero`)
- Remito Tercero (`remito_tercero`)
- Cliente (`cliente`)
- Cliente Destino (`cliente_destino`)
- Cliente Cantera (`cliente_cantera`)
- Desde (`desde`)
- Hasta (`hasta`)
- Tipo Material (`tipo_material`)
- Viajes (`cantidad_viajes`)
- Cantidad (`cantidad`)
- Unidad (`unidad`)
- Precio Unitario (`precio_unitario`)
- Precio Total (`precio_total`)
- Transporte (`tipo_transporte`)
- Patente (de `maquinaria.patente` o `patente_tercero`)
- Observaciones (`observaciones`)

### Detalles técnicos

- Construir el array desde `remitosCliente.filter(r => r.tipo_material && selectedTypes.has(r.tipo_material))`.
- Ordenar por `fecha` asc, luego `numero`.
- Formatear fecha con `date-fns` `format(parseISO(fecha), "dd/MM/yyyy")`.
- Anchos de columna automáticos (~14 mínimo, ajustar nombres más largos).
- Agregar la hoja con `XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Remitos")` después de la hoja "Liquidación".
- No cambiar la hoja resumen ni la UI; solo se agrega contenido al archivo exportado.

### Archivos afectados

- `src/components/remitos/LiquidacionClienteDialog.tsx` (única edición)
