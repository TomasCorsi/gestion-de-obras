# Liquidación de vehículos: filtro por categoría + chofer en el PDF

En Maquinarias → Gastos, la opción "PDF - todos los vehículos" hoy toma todas las maquinarias del filtro de tipo actual y no muestra quién manejó cada unidad. Se agregan dos cosas: elegir la categoría antes de generar el PDF, y una columna con el chofer/maquinista del período.

## 1. Elegir categoría antes de generar

Al hacer clic en "PDF - todos los vehículos" se abre un diálogo corto con:

- **Categoría**: lista de tipos con casillas (Camión, Camioneta, Auto, Batea, Acoplado, Carretón, Cisterna, Cargadora, Retroexcavadora, etc.). Solo aparecen los tipos que existen en la flota.
- Atajos: **Todos**, **Solo vehículos** (camión, camioneta, auto, carretón, batea, acoplado, cisterna) y **Solo maquinaria pesada**.
- Se muestra el período activo (desde–hasta) y cuántas unidades quedan seleccionadas.
- Botón **Generar PDF**.

El título del PDF indica la categoría elegida (ej. "LIQUIDACIÓN DE VEHÍCULOS – Camiones") y se sigue respetando el filtro de fechas de la pantalla.

## 2. Chofer / maquinista en el PDF

Nueva columna **Chofer / Maquinista** en la tabla principal, con el o los operadores que registraron partes diarios de esa unidad dentro del período, ordenados por cantidad de días y con los días entre paréntesis (ej. "J. Pérez (12d) | M. Gómez (3d)"). Si hay más de dos, se muestran los dos primeros y "+N". Si no hay partes en el período, se muestra "-".

Para que entre la columna se reacomodan los anchos (el bloque de nombre del vehículo se acorta) manteniendo el formato actual: apaisado, escala de grises + rojo, fila de TOTALES y resumen por tipo de gasto.

## Detalles técnicos

- `src/components/maquinarias/GastosMaquinaria.tsx`:
  - Nuevo estado + `Dialog` con checkboxes de tipos (`tiposConfig`), inicializado con el filtro de tipo activo.
  - Nueva query `partes_diarios_periodo`: trae `maquinaria_id, fecha, personal(nombre, apellido)` de partes `completado` en el rango de fechas (paginada por lotes de 1000 según el patrón existente), y se arma un mapa `maquinaria_id -> [{nombre, dias}]`.
  - `exportarPDFTodos(tiposSeleccionados)` filtra por los tipos elegidos y agrega `conductores` a cada fila.
- `src/utils/generateGastosMaquinariaPDF.ts`:
  - `VehiculoLiquidacionRow` suma `conductores?: Array<{ nombre: string; dias: number }>`.
  - `generateLiquidacionVehiculosPDF` acepta un `subtitulo` opcional (categoría), agrega la columna de chofer y ajusta `columnStyles`.
