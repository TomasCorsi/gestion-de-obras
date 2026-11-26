# Unificar vistas de Registro de Compras

Las pestañas **Facturas de proveedores** y **Gastos sin factura** van a verse con el mismo formato.

## Qué cambia

- **Gastos sin factura**
  - Se quitan las 6 tarjetas por categoría y la tarjeta grande de total.
  - Se quita el título "Gastos Generales" con su subtítulo (la pestaña ya lo dice).
  - El aviso rosa pasa a ser una línea chica de texto gris, debajo de los filtros.
  - El total queda como una línea al pie de la tabla ("Total: $ ...").
- **Facturas de proveedores**
  - Gana la misma barra de filtros: Año, Mes, Desde/Hasta y Obra, más filtro de Máquina.
  - Total al pie de la tabla (Neto, IVA y Total).
- **Ambas pestañas, mismo orden**:
  1. Barra de filtros (Año · Mes · Desde · Hasta · Obra · Máquina; en gastos, además Categoría).
  2. Buscador a la izquierda y botón rojo de alta a la derecha ("Nuevo comprobante de compra" / "Nuevo gasto").
  3. Tabla con el mismo estilo de encabezado y filas.
  4. Total al pie.

No cambian los datos, el guardado, ni quién ve cada pestaña.

## Detalles técnicos

- `ComprobantesTab.tsx`: incorporar `FilterBar` compartido + `filterByDateAndObra` sobre `fecha`/`obra_id`, filtro de máquina con Combobox, fila de totales. Aplica también a Ventas (mismo componente), lo que mantiene consistencia.
- `GastosGeneralesTab.tsx`: prop `embebido` que oculta encabezado y tarjetas, alinea buscador + botón y muestra total en el pie; el filtro de categoría pasa a la barra de filtros. Sin `embebido` queda igual.
- `Contabilidad.tsx`: aviso reducido a texto `text-muted-foreground`.
