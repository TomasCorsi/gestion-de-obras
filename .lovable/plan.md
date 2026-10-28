# Fase 1D: puesta en marcha del ERP con corte limpio (diseño)

## Regla de transición
- Todo lo que nace antes de la fecha de inicio del ERP se carga, se paga o se cobra y se cierra en CONTAD.
- Todo lo que nace desde la fecha de inicio se carga, se paga o se cobra y se cierra solo en Calamina ERP.
- El ERP no guarda nada de CONTAD: ni saldos abiertos, ni clientes o proveedores históricos, ni cuentas puente, ni referencias, ni conciliaciones entre sistemas.

## Situación actual de la base (relevada hoy)
- Hay cero ejercicios, períodos, asientos, comprobantes y pagos. El ERP está limpio.
- Los datos fiscales de la empresa están vacíos.
- Hay un plan de cuentas base de 79 cuentas, sin validar por el contador, y no tiene una cuenta por cada banco.

## 1. Fecha de inicio del ERP
- La fecha de inicio es el primer día de un mes y la fija el contador.
- La base rechaza comprobantes, pagos y asientos con fecha anterior al inicio.
- Un pago o cobro en el ERP solo puede aplicarse a comprobantes del ERP. Esto ya pasa hoy, porque no existen comprobantes de CONTAD dentro del ERP.

## 2. Ejercicio y períodos contables
- Se crea un ejercicio con las fechas fiscales reales. Si la fecha de inicio cae a mitad del ejercicio, el ejercicio arranca en esa fecha en el ERP. Los meses anteriores quedan en CONTAD.
- Los períodos son mensuales y se generan automáticamente. Al cerrarlos se usan los controles de 1A que ya existen.

## 3. Datos fiscales de la empresa
CUIT, razón social, condición de IVA, número de IIBB, inicio de actividades, domicilio fiscal y puntos de venta. Se cargan una sola vez, en la ficha de empresa que ya existe.

## 4. Plan de cuentas definitivo
- El contador valida el plan base: altas, bajas y códigos.
- Se agrega una cuenta por cada banco y por cada caja.
- Se marcan las cuentas que exigen obra o máquina como dato de analítica.
- Se completan las cuentas que usan los asientos automáticos (caja, banco, deudores, IVA, ventas, compras, entre otras).

## 5. Saldos patrimoniales mínimos para empezar
Mientras CONTAD siga activo, el ERP no arranca con saldos iniciales: empieza en cero y registra solo las operaciones nuevas. Los saldos patrimoniales se cargan una sola vez, en la puesta en marcha definitiva (punto 7).
Los saldos que van a hacer falta en ese momento son:
- bancos y caja;
- posición de impuestos: IVA, IIBB, retenciones y percepciones a computar o a depositar, y cargas sociales;
- préstamos y planes de pago;
- bienes de uso y su amortización acumulada;
- capital y resultados acumulados.
No se cargan facturas ni cuentas corrientes por cliente o proveedor.

## 6. Bancos y caja mientras conviven los dos sistemas
- Cada sistema registra únicamente los movimientos que le corresponden:
  - en CONTAD, los pagos y cobros de operaciones viejas;
  - en el ERP, los de operaciones nuevas.
- En el ERP, cada banco muestra solo el movimiento de las operaciones nuevas. No va a coincidir con el extracto, y eso es esperable durante la convivencia.
- El saldo real del banco se controla fuera del ERP, sumando el saldo del banco en CONTAD y el del ERP contra el extracto. Lo hace el contador; el ERP no guarda ese control.
- Regla operativa: cada pago o cobro se carga en el sistema donde nació su comprobante. Los gastos bancarios del mes los registra un solo sistema, a elección del contador.
- Lo mismo vale para las declaraciones de impuestos: el contador las arma sumando las dos fuentes mientras dure la convivencia.

## 7. Cuándo terminar CONTAD y hacer la puesta en marcha definitiva
**Condiciones para terminar CONTAD:**
- todos los proveedores históricos pagados;
- todos los clientes históricos cobrados o dados de baja;
- los cheques y documentos acreditados, debitados o anulados;
- las retenciones y percepciones presentadas.

Con eso cumplido, el contador cierra CONTAD a una fecha, que se llama fecha de cierre de transición.

**Puesta en marcha definitiva**, con un solo asiento en el ERP a la fecha de cierre de transición:
- Lleva bancos y caja a su saldo real según el extracto: la diferencia contra el saldo que ya tiene el ERP.
- Carga los saldos patrimoniales del punto 5 según el balance de cierre de CONTAD.
- La contrapartida va a "Resultados acumulados / Saldos de puesta en marcha".

Es un único asiento de totales, sin detalle histórico. Desde ese momento, CONTAD queda solo para consulta y el ERP pasa a ser el único sistema contable.

## Información que hay que definir con el contador
1. Fecha de inicio del ERP y fechas del ejercicio fiscal.
2. Datos fiscales de la empresa y puntos de venta.
3. Validación del plan de cuentas, listado de bancos y cajas, y cuentas que exigen analítica.
4. En qué sistema se registran los gastos bancarios y los impuestos bancarios durante la convivencia.
5. Cómo consolida IVA e IIBB mientras convivan los dos sistemas.
6. Plazo estimado para cerrar CONTAD y quién aprueba el asiento de puesta en marcha definitiva.

## Ya puede implementarse (cuando lo apruebes)
- Bloqueo de fechas anteriores a la fecha de inicio, aplicado en la base.
- Pantalla de configuración de la puesta en marcha: fecha de inicio, ejercicio, datos fiscales y validación del plan de cuentas.
- Asistente del asiento de puesta en marcha definitiva: queda en borrador, controla que debe y haber cierren, se confirma una sola vez y no se puede editar. Para corregirlo, se revierte.

## Detalle técnico
- Hace falta una migración chica, sin tocar 1A, 1B ni 1C:
  - en `contab_ejercicios`, dos fechas que se pueden dejar vacías: `fecha_inicio_erp` y `fecha_cierre_transicion`;
  - un trigger de fecha mínima en `contab_comprobantes`, `contab_pagos` y `contab_asientos`;
  - un índice único que permite un solo asiento de puesta en marcha confirmado.
- El asiento de puesta en marcha se identifica con `origen_tipo = 'puesta_en_marcha'` y se confirma con `contab_confirmar_asiento`, la función que ya existe.
- No se crean tablas que guarden datos de CONTAD.
- No cambian la navegación, los módulos operativos ni la rentabilidad. No se crean ejercicios ni se cargan saldos hasta tener las definiciones.
