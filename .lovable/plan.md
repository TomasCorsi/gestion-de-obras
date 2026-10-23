# Contabilidad: pasar lo que usan en CONTAD al sistema

Hoy Contabilidad ya tiene: comprobantes de venta y compra, pagos/cobranzas simples, asientos automáticos, plan de cuentas, terceros y reporte de IVA. Los documentos de CONTAD piden lo siguiente, que falta o está incompleto.

## Lo que se agrega

### 1. Centros y subcentros de costo
- Centros: Obras, Máquinas, Taller, Oficina, etc. Subcentro = la obra o la máquina concreta (se toman de las obras y máquinas ya cargadas).
- Se eligen en cada factura de compra y en cada renglón de una orden de pago 2.
- Así el gasto queda imputado a la obra o máquina y suma a su rentabilidad.

### 2. Compras (registro)
- Letras A, B, C, E, M, I, X; punto de venta, número, importe.
- Tipo de cuenta del gasto (repuestos, materiales, fletes, honorarios, obras…), centro y subcentro.
- Percepciones (IVA, Ingresos Brutos) opcionales.

### 3. Orden de pago 1 (proveedor con cuenta corriente)
- Elegir proveedor, marcar una o varias facturas pendientes.
- Calcular retenciones de Ganancias e Ingresos Brutos (porcentajes configurables por proveedor/régimen).
- Abajo, uno o varios medios de pago: banco, caja efectivo, e-cheq, cheque en cartera, dólares.
- No deja guardar si no balancea. Genera PDF de la orden y de los certificados de retención.

### 4. Orden de pago 2 (gastos sin cuenta corriente / "en negro")
- Debe: renglones con cuenta, centro y subcentro (ej. rendición de caja de Nahuel: repuesto a máquina 709).
- Haber: efectivo, dólares, valores en cartera. Observaciones del gasto.

### 5. Ventas
- Letras A, B, C, E, M, T, X, Z con detalle y percepciones.
- CAE de ARCA: queda preparado el lugar para pedirlo, pero conectar con ARCA necesita certificado digital de la empresa (ver preguntas).

### 6. Recibos de cobranza
- Recibo N1 (negro) y X2 (blanco), cliente, importe, imputación a facturas pendientes.
- Medios: efectivo, cheque físico, e-cheq, dólares, retenciones sufridas de IIBB y Ganancias.

### 7. Cuentas corrientes y saldos
- Cuenta corriente por proveedor y por cliente: facturas, pagos/recibos y saldo acumulado, por rango de fechas.
- Totales: lista de saldos de todos los proveedores / clientes, exportable a Excel.

### 8. Libro Banco y cartera de valores
- Elegir cuenta bancaria y rango de fechas: todos los movimientos con saldo, ordenables por vencimiento, exportar a Excel.
- Cheques/e-cheqs en cartera con estado (en cartera, depositado, entregado a proveedor).

## Orden sugerido
1. Centros de costo + Compras completas.
2. Órdenes de pago 1 y 2 con retenciones y PDF.
3. Recibos y cuentas corrientes / totales.
4. Libro banco y cartera de cheques.
5. Ventas con CAE (cuando tengan el certificado de ARCA).
6. Importación de saldos iniciales desde CONTAD (Excel) para arrancar la migración.

## Detalles técnicos
- Nuevas tablas: `contab_centros_costo` (con vínculo opcional a obra/maquinaria), `contab_retenciones_config`, `contab_ordenes_pago` + `contab_op_imputaciones` + `contab_op_medios`, `contab_recibos` (o extender `contab_pagos`), `contab_cuentas_bancarias`, `contab_valores` (cheques). Columnas nullable nuevas en `contab_comprobantes` / items: centro, subcentro, percepciones, letra.
- Guardado de OP/recibos con función transaccional SECURITY INVOKER que valida balance y genera el asiento (reutilizando `contab_generar_asiento_pago`).
- RLS admin-only + GRANT; PDFs con jsPDF siguiendo el estilo corporativo; Excel con ExcelJS; fechas dd/mm/yyyy.
- Tests para cálculo de retenciones, balance de OP y saldos de cuenta corriente.
