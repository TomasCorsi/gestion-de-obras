# Mejora de Remitos: vista, filtros, formularios, exportación y liquidación

Alcance: solo la pantalla de Remitos (Viajes, Materiales, Máquinas), su exportación y la liquidación por cliente. Sin cambios en Contabilidad, rentabilidad ni otros módulos. No hace falta cambiar la base de datos.

## 1. Vista y distribución común
Las tres pestañas tendrán el mismo esqueleto:

```text
[ Viajes | Materiales | Máquinas ]                [Exportar Excel] [Liquidar cliente] [+ Nuevo]
[ Buscar...............] [Desde fecha] [Hasta fecha] [filtros propios de la pestaña] [Limpiar]
Chips de filtros activos (con X para quitar cada uno) · "N remitos · Total $..."
Grilla a pantalla completa, mismas columnas base: Fecha · N° remito · Cliente · Obra · ... · Total
```

## 2. Filtros ordenados por tipo
Siempre primero: Búsqueda, Fecha desde/hasta, Cliente, Obra. Luego lo propio:
- **Viajes:** Origen, Destino, Máquina/camión, Tipo de material, Transporte, Proveedor, Cargado por.
- **Materiales:** Material, Proveedor, Unidad.
- **Máquinas:** Máquina, Se cobra por (días/horas), Operador si existe.

Filtros estilo Excel (con buscador y contador), guardados en la dirección de la página para que se mantengan al volver, y un botón "Limpiar filtros".

## 3. Formularios de carga con la misma mecánica
- Un mismo buscador desplegable para todos los campos de selección (cliente, obra, máquina, material, proveedor, unidad, tipo de material, transporte).
- Búsqueda por número y por nombre: obras por número de obra o nombre; máquinas por número/código, nombre o patente; clientes y proveedores por nombre o CUIT.
- Se reemplazan los desplegables simples que hoy no tienen buscador (por ejemplo cliente/obra en Materiales, unidad y "se cobra por").
- Mismo orden de campos en los tres: N° remito y fecha → cliente/obra → renglones → observaciones → total.
- Teclado: Enter para elegir, Tab al siguiente campo; al elegir la obra se completa el cliente automáticamente en los tres tipos.

## 4. Exportar a Excel con una hoja por sección
Un solo archivo, respetando los filtros de fecha/cliente/obra activos:
- **Viajes**, **Materiales**, **Máquinas** (una fila por renglón, con N° remito, fecha, cliente, obra, detalle, cantidad, unidad, precio, total).
- **Resumen general:** totales por tipo; por cliente (viajes, materiales, máquinas, total); por obra; cantidad de remitos y remitos sin precio.
- Encabezados en negrita, columnas filtrables, fechas dd/mm/aaaa y montos en formato moneda.

## 5. Liquidación de clientes con todos los tipos
La liquidación por cliente (y por obra) incluirá viajes, materiales y máquinas del período, en secciones separadas con subtotal cada una y total general. Igual en la vista, el PDF y el Excel de la liquidación. Avisa si hay remitos sin precio.

## Mejoras posibles (para que elijas después)
1. Vista "Resumen" por pestaña: totales del período por cliente/obra arriba de la grilla.
2. Aviso de remito duplicado (mismo número y cliente) al cargar.
3. Duplicar remito para cargar rápido uno parecido.
4. Marcar remitos como "liquidado" para no cobrarlos dos veces.
5. Precios sugeridos según el último precio usado para ese cliente/material/máquina.
6. Foto o escaneo del remito adjunto.
7. Carga desde el celular con formulario simplificado.
8. Alertas de remitos sin precio o sin obra.

Los puntos 4 y 6 requerirían cambios en la base, por eso quedan fuera de este plan.

## Detalles técnicos
- Componente común de selector con búsqueda (reutilizar `Combobox` con Portal) y keywords por opción (número de obra, código/patente de máquina, CUIT).
- Barra de filtros compartida (`RemitosFiltersBar`) configurable por pestaña; estado con `useUrlState`.
- Paneles afectados: `Remitos.tsx`, `RemitoQuickFormDialog.tsx`, `MaterialesRemitosPanel.tsx`, `MaquinasRemitosPanel.tsx`, `RemitosTipoPanel.tsx`.
- Exportación: nueva función en `src/utils` que consulta `remitos`, remitos de materiales y `remitos_maquinas` con paginación por lotes (>1000 filas) y arma el libro con 4 hojas.
- Liquidación: `LiquidacionClienteDialog.tsx` / `LiquidacionObraDialog.tsx` y `exportLiquidacion.ts` suman consultas de materiales y máquinas.
- Pruebas: armado del resumen (totales por tipo/cliente) y búsqueda por número de obra/máquina.
