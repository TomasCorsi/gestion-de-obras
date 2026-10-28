# Fase 1D: transición gradual CONTAD → Calamina ERP (diseño breve)

Este diseño reemplaza la propuesta anterior de 1D. No se trasladan deudas ni créditos abiertos de CONTAD al ERP. No se crean ejercicios ni se migran saldos hasta que lo apruebes.

## Situación actual de la base (relevada hoy)
- No hay ejercicios, períodos, asientos, comprobantes, pagos ni fichas fiscales: todo está en 0.
- Faltan los datos de la empresa: CUIT y condición de IVA están vacíos.
- Hay un plan de cuentas base con 79 cuentas y 9 cuentas configuradas: caja, banco, deudores, IVA crédito fiscal, percepciones, proveedores, IVA débito fiscal, ventas y compras.
- No existe una cuenta de transición CONTAD, ni cuentas separadas por cada banco.

## 1. Fecha de inicio del ERP y bloqueo
- La fecha de inicio es el primer día de un mes. Desde esa fecha, todo comprobante nuevo se carga solo en el ERP.
- La base rechaza comprobantes de compra y venta del ERP con fecha anterior al inicio. El único asiento permitido con fecha anterior es el de apertura.
- Los períodos anteriores al inicio no existen en el ERP.
- Se cargan en el ERP solo los comprobantes con fecha igual o posterior al inicio. En CONTAD se cargan solo los de fecha anterior. Esta regla es de procedimiento: el ERP no puede controlar lo que se carga en CONTAD. Hay que acordarla con el contador.

## 2. Bancos y caja durante la convivencia
- Los saldos reales de bancos y caja se llevan solo en el ERP, desde la apertura. CONTAD deja de llevar bancos para movimientos nuevos.
- Cuando un pago o un cobro cancela una deuda o un crédito histórico de CONTAD, el dinero igual sale o entra de un banco del ERP. Ese movimiento se registra en el ERP contra la cuenta puente, sin comprobante, sin IVA y sin resultado.
- En CONTAD, la misma cancelación se registra contra una cuenta espejo "ERP – bancos", así CONTAD baja la deuda o el crédito sin mover sus bancos.

## 3. Cuenta puente "Transición CONTAD"
- Se crean dos cuentas patrimoniales: "Transición CONTAD – Proveedores históricos" y "Transición CONTAD – Clientes históricos". Si el contador lo prefiere, puede ser una sola cuenta con detalle por tercero.
- Pago a un proveedor histórico: Debe a la cuenta puente, Haber al banco.
- Cobro a un cliente histórico: Debe al banco, Haber a la cuenta puente.
- Se registra con un nuevo tipo de operación "Cancelación histórica". Indica el tercero y la referencia del comprobante en CONTAD, como texto de consulta.
- Al inicio, la cuenta puente arranca con el saldo neto de lo que queda abierto en CONTAD (proveedores menos clientes). Así, cada cancelación la va llevando hacia cero.
- No genera IVA, ni ingresos, ni gastos, ni imputación analítica.

## 4. Saldos mínimos de apertura en el ERP
Se cargan en un único asiento de apertura, a la fecha de inicio:
- Bancos: cada cuenta con su saldo según extracto conciliado. Caja: arqueo.
- Impuestos: saldo de IVA a favor o a pagar, retenciones y percepciones sufridas a computar, IIBB, cargas sociales y planes de pago vigentes.
- Préstamos y deudas financieras: saldo de capital.
- Bienes de uso: valor de origen y amortización acumulada.
- Cheques diferidos emitidos o en cartera. Hay que definir si quedan en CONTAD o se abren en el ERP.
- Cuenta puente: saldo neto de clientes y proveedores históricos abiertos.
- Patrimonio: capital, y resultados acumulados como diferencia para que el asiento cierre.
No se cargan facturas abiertas ni cuentas corrientes por tercero.

## 5. Conciliación periódica (mensual) mientras convivan
Control 1, cuenta puente: el saldo de la cuenta puente en el ERP tiene que ser igual al total abierto en CONTAD de clientes y proveedores históricos. La diferencia tiene que ser 0.
Control 2, bancos: el saldo de cada banco en el ERP tiene que coincidir con su extracto.
Control 3, sin duplicados: cada pago o cobro histórico debe figurar en los dos sistemas. En el ERP aparece contra la cuenta puente y en CONTAD contra la cuenta espejo. Se revisa con un reporte del ERP que lista las cancelaciones históricas del mes, para cruzar con CONTAD.
El contador firma la conciliación del mes. Se guarda en el ERP como una constancia con la fecha, los saldos y las observaciones.

## 6. Condiciones para dar por terminado CONTAD
- Proveedores históricos cancelados, o reclasificados con acuerdo del contador.
- Clientes históricos cobrados, o pasados a incobrables.
- Cheques y documentos históricos acreditados, debitados o anulados.
- Retenciones y percepciones históricas presentadas.
- Cuenta puente en el ERP en 0, o con un remanente justificado.
- Última conciliación firmada sin diferencias.

## 7. Cierre definitivo de la transición
1. Conciliación final firmada.
2. Si queda un remanente en la cuenta puente, un asiento de ajuste lo reclasifica a la cuenta que defina el contador, con su explicación.
3. Se bloquea la cuenta puente para nuevos movimientos y se desactiva el tipo "Cancelación histórica".
4. CONTAD se cierra a la fecha de fin de la transición y queda solo para consulta. Desde el ERP se puede guardar el número de referencia de CONTAD para identificar cada caso.

## Información que hay que definir con el contador
1. La fecha de inicio del ERP y las fechas del ejercicio fiscal.
2. Los datos fiscales de la empresa.
3. Si la cuenta puente es única o se separa en clientes y proveedores, con qué códigos, y qué cuenta espejo usa CONTAD.
4. El listado de bancos y cajas, con el saldo conciliado a la fecha de inicio.
5. La posición de impuestos a la fecha de inicio: IVA, IIBB, retenciones, percepciones y cargas sociales.
6. Los saldos de préstamos, bienes de uso, amortizaciones, y el criterio para los cheques diferidos.
7. El total abierto en CONTAD de clientes y proveedores a la fecha de inicio, para el saldo inicial de la cuenta puente.
8. Quién firma la conciliación mensual, y el plazo máximo estimado de convivencia.
9. El tratamiento de los anticipos históricos: si se cancelan en CONTAD o se abren en el ERP.
10. Si hay saldos en moneda extranjera y a qué cotización.

## Ya puede implementarse (cuando se apruebe)
- Bloqueo de fechas anteriores al inicio, aplicado por la base.
- Asiento de apertura con un asistente que controla que el debe y el haber cierren.
- Operación "Cancelación histórica": banco contra cuenta puente, sin IVA ni analítica.
- Reporte de cancelaciones del mes y constancia de conciliación.
- Bloqueo de la cuenta puente al cierre de la transición.

## Pendiente de las definiciones del contador
Las cuentas exactas, los saldos de apertura, la fecha de inicio y el criterio para cheques y anticipos.

## Detalle técnico (para la etapa de implementación)
- Una migración para 1D, sin tocar 1A, 1B ni 1C:
  - En `contab_ejercicios` se agrega `fecha_inicio_erp`.
  - Un trigger de fecha mínima en comprobantes, pagos y asientos. Deja pasar el origen `apertura`.
  - Tabla `contab_cancelaciones_historicas`: tercero, banco o caja, importe, sentido, referencia a CONTAD y asiento.
  - Tabla `contab_conciliaciones_transicion`: período, saldos, diferencia, firmado por y observaciones.
  - Las tablas nuevas tienen GRANT y RLS con `contab_puede`.
- Los asientos se generan como borrador y se confirman con `contab_confirmar_asiento`, la función que ya existe.
- No se cambian la navegación, los módulos operativos ni la rentabilidad. No se importan movimientos de CONTAD.
