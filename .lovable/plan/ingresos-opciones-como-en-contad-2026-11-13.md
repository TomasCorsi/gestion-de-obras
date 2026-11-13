# Ingresos: opciones como en CONTAD

La sección Ingresos va a tener las mismas tres opciones que CONTAD, en este orden:

1. **Recibos de Cobranzas**: abre el formulario de nuevo cobro, igual que ahora.
2. **Valores en Cartera**: un listado de cheques recibidos, armado como la pantalla de CONTAD.
   - **Período**: fecha de ingreso desde/hasta.
   - **Tipo de valores**: Val. Físicos / ECheqs / Ambos.
   - **De un cliente**: opcional, con buscador.
   - **Valores a incluir**: Todos / En Cartera / Endosados. Por defecto se muestra En Cartera.
   - **Grilla**: asiento, recibo, código y nombre del cliente, importe, N° de cheque, banco, fecha de ingreso, fecha de pago, tipo (F/E) y estado (R = rechazado).
   - **Orden**: se puede ordenar tocando el título de cada columna.
   - **Total** al pie y botón **Exportar a Excel**.
3. **Buscar Valores en Cartera**: búsqueda de un cheque puntual.
   - **Datos para buscar**: N° de cheque, banco emisor, importe o fecha de vencimiento, más los botones Buscar y Nueva búsqueda.
   - **Resultados**: se muestran en una grilla.
   - **Detalle**: al elegir uno se ve su **origen**: fecha y número del recibo de ingreso, y cliente con su CUIT y domicilio.
   - **Orden**: por cheque, banco o importe.

"Cobranzas Efectuadas" deja de aparecer en Ingresos porque CONTAD no lo tiene ahí. El listado sigue disponible en la pestaña Cobranzas de la misma pantalla.

## Qué queda para una etapa siguiente
Estas acciones de CONTAD necesitan registrar datos nuevos y circuitos con el contador, así que no entran en esta etapa:
- Marcar como rechazado (con su motivo).
- Generar la nota de débito por rechazo.
- Registrar la salida del valor (endoso en una orden de pago).

Por ahora, "Endosados" y "Rechazados" toman el estado que ya tiene guardado cada cheque. Como todavía no hay forma de cargarlos desde la pantalla, esos filtros pueden aparecer vacíos.

No cambian la base de datos, los permisos ni la forma de guardar los cobros.

## Detalles técnicos
- **Navegación** (`contabNav.ts`): `ingresos.hijos` queda en recibo, `valores-cartera` y `buscar-valores`. Las dos nuevas entradas van a la pantalla pagos, subtab `cheques`, con un modo `cartera` o `buscar`. Se agrega "cheques" a las subtabs permitidas y se mantienen alias para `ingresos/cobranzas` y `clientes/cobranzas`.
- **Componentes**: `ChequesRecibidos` se divide en `ValoresCartera` y `BuscarValores`. Ambos leen de `contab_pago_valores` unida a `contab_pagos` y a la ficha del cliente, con lectura en lotes para pasar el límite de 1000 filas.
- **Filtros**: se aplican del lado del cliente, sobre `medio` (cheque/echeck), `cheque_estado` y la fecha del pago.
- **Excel**: la exportación usa el mecanismo que ya tiene el proyecto.
- **Pruebas**: se agregan pruebas de filtros/orden y del mapa de navegación, y se verifica con Playwright.
