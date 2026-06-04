# Reporte Integral por Obra

Agregar una nueva pestaña en `Reportes` que permita elegir **una obra** y ver TODO su movimiento consolidado, con totales claros por sección y un total general.

## UI

Nueva pestaña **"Por Obra"** junto a *Financiero* y *Consultar con IA*.

Controles arriba:
- Selector de **Obra** (combobox con búsqueda).
- Rango de fechas **Desde / Hasta** (opcional, por defecto vacío = toda la historia).
- Botón **Exportar a Excel** (xlsx) con todas las secciones en hojas separadas + estilos (negritas, bordes, totales) siguiendo el mismo patrón que la liquidación de clientes.

Encabezado: nombre de obra, cliente, estado, fechas, ubicación, y **4 KPIs**: Total Cotizado (aprobado), Total Gastado, Balance, % Rentabilidad.

## Secciones (cards colapsables con tabla + total al pie)

1. **Personal — Partes Diarios**
   Agrupado por empleado: días trabajados, horas totales, viajes, ausencias. Total: cantidad de personas distintas, total días-persona, total horas.

2. **Horas Máquina**
   Agrupado por maquinaria (código + nombre + patente): días de uso, horas trabajadas, operadores distintos. Total horas por obra.

3. **Maquinarias Utilizadas**
   Lista única de máquinas que aparecieron en partes/horas/combustible para esta obra, con tipo y total de horas.

4. **Gastos de Combustible**
   Une `cargas_combustible` + `cargas_combustible_repartidor` (valorizadas con `precios_productos_mes`). Agrupado por maquinaria: litros, costo. Total litros / total $.

5. **Remitos**
   Agrupado por material/tipo: cantidad de remitos, viajes, cantidad, precio total. Total $.

6. **Órdenes de Compra**
   Lista: número, fecha, proveedor, descripción, total. Total $.

7. **Gastos Generales (otros_gastos)**
   Agrupado por categoría/sector: cantidad de ítems, monto. Total $.

8. **Resumen Final**
   Tabla con el total de cada sección + Total General de Gastos + Total Cotizado + Balance.

Todos los montos en ARS con `formatCurrency`. Fechas en `dd/mm/yyyy`. Respeta el rango de fechas seleccionado en todas las secciones que tengan campo `fecha`.

## Archivos a tocar

- **Nuevo**: `src/components/reportes/ReporteObraTab.tsx` — toda la UI y la lógica de agregación.
- **Nuevo**: `src/hooks/useReporteObra.ts` — hook que recibe `obraId` + rango y devuelve `{ personal, horasMaquina, maquinarias, combustible, remitos, ordenesCompra, otrosGastos, cotizado, totales }`. Hace queries directas a Supabase a las tablas: `partes_diarios`, `horas_maquina`, `maquinarias`, `personal`, `cargas_combustible`, `cargas_combustible_repartidor`, `precios_productos_mes`, `remitos`, `ordenes_compra` (+ items), `otros_gastos`, `cotizaciones`, `obras`, `clientes`. Usa batching recursivo si supera 1000 filas (regla existente del proyecto).
- **Nuevo**: `src/utils/exportReporteObraExcel.ts` — usa `xlsx-js-style` (ya instalado para liquidaciones) y genera workbook con hoja por sección + hoja "Resumen", con estilos: header bold con fondo, bordes finos, total row resaltada, formato moneda `"$"#,##0.00`.
- **Editar**: `src/pages/Reportes.tsx` — añadir 3er `TabsTrigger` "Por Obra" + `TabsContent` que renderiza `<ReporteObraTab />`.

## Detalles técnicos

- Para combustible repartidor (sin `precio_litro` propio), valorizar buscando `precios_productos_mes` por `tipo_producto`, `anio`, `mes` de la fecha de carga; si no hay precio del mes, usar el más reciente anterior.
- Horas Máquina: priorizar `horas_maquina` (ya consolida partes). Si no hay registros, fallback a sumar `horometro_fin - horometro_inicio` desde `partes_diarios`.
- Personal: contar **un día = un parte_diario completado** por empleado en la obra.
- Cotizado: sumar `cotizaciones.total` con `estado = 'aprobada'` y `obra_id`.
- No se tocan los reportes existentes ni la pestaña Financiero ni Chat IA.
- No hay cambios de schema ni RLS.

## Verificación

- Elegir una obra con datos conocidos y confirmar que los totales por sección coinciden con los módulos individuales (Combustible, Remitos, Órdenes de compra, Partes Diarios).
- Probar rango de fechas: filtra todas las secciones excepto cotizaciones (las cotizaciones se filtran por `fecha_creacion`).
- Exportar a Excel y verificar bordes, negritas, totales y formato moneda en todas las hojas.
