## Actualizar plantilla de importación de remitos

Voy a actualizar la función `downloadTemplate` en `src/components/remitos/CSVImportDialog.tsx` (líneas 567-587) para que la plantilla refleje exactamente los campos que hoy se usan en la importación.

### Cambios en las columnas

**Quitar:**
- `Cliente` — se asigna automáticamente desde el remitero, no se carga por CSV.
- `Proveedor` — campo legado, ya no se usa en la carga de remitos.

**Mantener (en este orden, alineado con el grid de remitos):**
1. Rem. Tercero
2. Rem. Local
3. Fecha (dd/mm/yyyy)
4. Desde
5. Hasta
6. Viajes
7. Cantidad Uni.
8. Cantidad total
9. Unidad (TN, M3, KG, M2, U)
10. Tipo (material)
11. Calc. Precio (`viajes` o `cantidad`) — **nuevo en la plantilla**, ya se importa pero no figuraba como columna ejemplo
12. Precio Uni.
13. Precio Total
14. Transporte
15. Patente Local
16. Patente Tercero
17. Descripcion

### Filas de ejemplo

Reemplazar la única fila por **3 ejemplos** que cubran los casos típicos:
- Remito interno con transporte propio, modo `viajes` (precio = precio_uni × viajes).
- Remito de tercero (Rem. Tercero cargado, Patente Tercero), modo `cantidad` (precio = precio_uni × cantidad_uni × viajes).
- Remito de movimiento interno sin precio (cantera → obra), para mostrar campos opcionales vacíos.

### Archivos modificados
- `src/components/remitos/CSVImportDialog.tsx` — solo la función `downloadTemplate` (headers + ejemplos). Sin cambios en el parser ni en la base de datos.

### Verificación
- Descargar la plantilla desde el diálogo de importación y abrirla en Excel/Sheets.
- Re-importarla tal cual y confirmar que las 3 filas se procesan sin errores y los campos se mapean correctamente.