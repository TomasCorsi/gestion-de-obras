# Recibos de cobro con varios valores (monedas y cheques)

## Situación actual
Hoy cada cobro admite un solo medio, un solo monto (sin moneda ni cotización) y un solo comprobante. Un cliente que paga con pesos + dólares, o con varios cheques, obliga a cargar varios cobros sueltos sin agrupar.

## Propuesta: Recibo con renglones de valores
Un cobro pasa a ser un **Recibo** (cabecera) con:

1. **Valores recibidos** (varios renglones):
   - Medio: efectivo, transferencia, cheque, cheque electrónico (eCheq), tarjeta, depósito, retención sufrida.
   - Moneda: ARS o US$; si es US$, cotización del día y equivalente en pesos.
   - Para cheques: banco, número, fecha de emisión, fecha de pago (diferido), librador/CUIT, endosable sí/no.
   - Cuenta destino (caja pesos, caja dólares, banco, valores a depositar).
2. **Comprobantes que cancela** (varias facturas, con monto aplicado a cada una; permite pago parcial o a cuenta).
3. **Totales**: total recibido en pesos debe igualar total aplicado + saldo a cuenta. No se confirma si no cuadra.
4. **Asiento**: uno por recibo; un renglón al Debe por cada valor (en su cuenta, en pesos) y Haber a Deudores por ventas. Diferencia de cambio se informa si la cotización difiere de la de la factura.
5. **Cartera de cheques**: listado de cheques recibidos con estado (en cartera, depositado, endosado a proveedor, rechazado) y vencimientos; al pagar a proveedores se podrán elegir cheques de cartera (paso posterior).

Los cobros ya cargados se conservan como recibos de un solo renglón. Lo mismo se aplicará luego a Pagos a proveedores (orden de pago con varios valores).

## Decisiones a confirmar con el contador
- Cuentas para caja US$, valores a depositar y diferencia de cambio.
- Qué cotización usar (BNA vendedor/comprador, manual).
- Si las retenciones sufridas entran en el recibo (recomendado).

## Detalles técnicos
- Nuevas tablas `contab_recibos` (cabecera), `contab_recibo_valores`, `contab_recibo_aplicaciones`, `contab_cheques` (cartera); RLS por rol existente.
- Guardado transaccional mediante función security-invoker (mismo patrón que remitos de máquinas).
- Migrar cada `contab_pagos` de cobro a recibo + 1 valor + 1 aplicación; generación de asiento borrador reutiliza la lógica actual.
- Formulario con selectores con buscador; pruebas de cuadre, conversión de moneda y asiento.
