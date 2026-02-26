

# Corregir importación CSV de Remitos para detectar todas las columnas

## Problema
Los encabezados del CSV del usuario no coinciden con los alias configurados en el importador. Por ejemplo, "Rem. Tercero" no se detecta porque solo están los alias "remito_tercero", "rem_tercero", etc. Además, las columnas "Patente Tercero", "Descripcion", "Cantidad Uni." y "Precio Uni." no están mapeadas.

## Encabezados del CSV del usuario
`Rem. Tercero, Rem. Local, Fecha, Proveedor, Desde, Hasta, Cliente, Viajes, Cantidad Uni., Cantidad total, Unidad, Tipo, Precio Uni., Precio Total, Transporte, Patente Tercero, Vehiculo, Descripcion`

## Cambios en `src/components/remitos/CSVImportDialog.tsx`

### 1. Agregar aliases faltantes en `columnAliases`

| Campo | Aliases a agregar |
|---|---|
| remito_tercero | "rem. tercero" |
| remito_local | "rem. local", "rem. loc.", "rem. loc" |
| cantidad | "cantidad total", "cantidad uni.", "cant total" |
| precio_total | "precio total" (con espacio) |
| tipo_transporte | "transporte" (ya existe, OK) |
| patente (vehiculo) | "vehiculo" (ya existe, OK) |

### 2. Agregar nuevas columnas al mapeo

| Campo nuevo | Aliases |
|---|---|
| patente_tercero | "patente_tercero", "patente tercero", "pat_tercero", "pat tercero" |
| observaciones | "observaciones", "descripcion", "descripción", "notas", "obs" |
| precio_unitario (lectura) | "precio uni.", "precio_uni", "precio unitario", "precio_unitario" |

### 3. Agregar lógica de parseo para los nuevos campos

- **patente_tercero**: leer como texto y guardarlo en el data del remito
- **observaciones**: leer como texto y guardarlo como `observaciones`
- **precio_unitario**: leer el valor pero usarlo solo como referencia (o calcular precio_total = precio_uni x cantidad si precio_total está vacío)

### 4. Incluir campos en el objeto `data` del ParsedRow

Agregar `patente_tercero` y `observaciones` al objeto que se envía a la base de datos.

### 5. Actualizar la plantilla de descarga

Agregar las columnas "patente_tercero" y "descripcion" a la plantilla CSV descargable.

## Resumen técnico
Solo se modifica `src/components/remitos/CSVImportDialog.tsx` para agregar aliases de columnas que coincidan con los encabezados reales del CSV del usuario, y mapear campos que no estaban incluidos (patente_tercero, observaciones/descripcion).

