# Cobros con varios cheques o con pesos y dólares

## Situación actual
Hoy cada cobro admite un solo medio, un solo monto en pesos y una sola factura. Si un cliente paga con varios cheques, hay que cargar varios cobros sueltos.

## Propuesta
El cobro se sigue cargando **una sola vez, en el momento**, como hasta ahora. No se agrega ningún paso nuevo de recibo separado. Lo único que cambia es el formulario:

1. **Caso normal (un solo medio)**: igual que hoy, se elige el medio y el monto.
2. **Botón "Agregar otro valor"**: solo para los casos que lo necesitan. Permite sumar renglones dentro del mismo cobro:
   - Varios cheques (caso habitual): por cada uno, banco, número, fecha de pago, librador y monto. Se pueden cargar rápido uno tras otro.
   - Parte en pesos y parte en dólares (caso puntual): moneda US$ con cotización del día; se muestra el equivalente en pesos.
3. **Total del cobro**: suma automática de todos los renglones en pesos, comparada con el saldo de la factura que cancela (pago total, parcial o a cuenta).
4. **Asiento**: uno solo por cobro, con un renglón por cada valor en su cuenta (caja pesos, caja dólares, valores a depositar, banco) contra Deudores por ventas.
5. **Listado de cheques recibidos**: vista simple con todos los cheques, fecha de pago y estado (en cartera, depositado, entregado a proveedor, rechazado), para controlar vencimientos.

Los cobros ya cargados siguen funcionando como cobros de un solo valor.

## A confirmar con el contador
- Cuentas para caja en dólares y cheques a depositar.
- Cotización a usar (BNA o manual).

## Detalles técnicos
- Nueva tabla de renglones de valores vinculada a `contab_pagos` (medio, moneda, cotización, importe en pesos, datos de cheque); el monto del cobro pasa a ser la suma.
- Guardado transaccional en una función de base (mismo patrón que remitos de máquinas) para no dejar cobros a medias.
- Backfill: cada cobro existente recibe un renglón con su medio y monto.
- `contab_generar_asiento_pago` genera una línea al Debe por renglón.
- RLS y permisos iguales a los de cobros; pruebas de total, conversión de moneda y asiento.
