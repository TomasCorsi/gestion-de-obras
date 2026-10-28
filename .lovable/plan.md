# Fase 1D — Puesta en marcha contable (diseño, sin ejecutar)

## 1. Relevamiento de la base actual (leído hoy)

| Elemento | Estado |
|---|---|
| Ejercicios / períodos | 0 / 0 (no hay ejercicio creado) |
| Asientos, comprobantes, pagos, fichas fiscales | 0 en todos |
| Datos de la empresa (CUIT, condición IVA) | Vacío |
| Plan de cuentas | 79 cuentas, versión base genérica |
| Cuentas configuradas para automatismos | 9: caja, banco, deudores, iva_cf, percepciones, proveedores, iva_df, ventas, compras |
| Cuentas con analítica obligatoria | Ninguna marcada |
| Asientos | Ya tienen estados borrador/confirmado/revertido, origen, número por ejercicio y reversa |
| Permisos | Admin todo; contador puede crear ejercicio, confirmar, revertir y cerrar período; reabrir solo admin |

Conclusión: la base está limpia, sin movimientos que migrar ni conflictos. Hoy falta lo que necesita la apertura: datos de empresa, ejercicio real, plan de cuentas validado por el contador, cuentas individuales por banco, y anticipos de clientes / retenciones a depositar.

## 2. Diseño funcional

**Ejercicio y períodos.** Se crea un único ejercicio con las fechas que indique el contador; los períodos mensuales se generan solos. Los meses anteriores a la fecha de corte quedan cerrados de entrada.

**Fecha de corte.** Es un solo día, por ejemplo el 31/12. El balance de CONTAD a ese día es el punto de partida. El ERP empieza a registrar desde el día siguiente.

**Asiento de apertura.** Es un único asiento con fecha de corte + 1. Se arma con un asistente de 5 pasos:
1. Bancos y caja: un renglón por cuenta bancaria y por caja.
2. Clientes: el saldo de cada cliente, detallado por factura pendiente o como saldo global, según decida el contador.
3. Proveedores: lo mismo que clientes.
4. Impuestos: IVA a favor o a pagar, percepciones y retenciones pendientes, IIBB, cargas sociales.
5. Otras cuentas patrimoniales: bienes de uso, préstamos, anticipos, capital, resultados acumulados.

El asistente avisa si debe y haber no coinciden. El asiento queda en borrador hasta que el contador lo confirme. Se puede confirmar una sola vez por ejercicio. Si hay que corregirlo, se revierte y se hace de nuevo, nunca se edita una vez confirmado.

**Saldos de clientes y proveedores.** Cada saldo se vincula a la ficha fiscal del cliente o proveedor. Así la cuenta corriente arranca con el saldo correcto y los cobros o pagos posteriores pueden aplicarse contra esos saldos.

**Anticipos.** Los anticipos a proveedores van a la cuenta que ya existe. Para anticipos de clientes falta una cuenta de pasivo. Si se abren por obra, llevan la obra como analítica.

**Analítica obligatoria.** El contador define qué cuentas exigen obra o máquina, por ejemplo costos de obra o mantenimiento. La marca ya existe en el plan de cuentas, solo falta activarla. En la apertura, las cuentas patrimoniales no exigen analítica salvo los anticipos por obra.

**Bloqueo de operaciones anteriores al corte.** La base rechaza comprobantes, pagos y asientos con fecha menor o igual al corte, excepto el asiento de apertura. La pantalla avisa antes de guardar, pero quien decide es la base.

**Conciliación con CONTAD.** Se carga el balance final de CONTAD, por cuenta y con saldo, como dato de referencia. Un reporte lo compara contra el asiento de apertura y muestra las diferencias. Para confirmar la apertura, la diferencia total tiene que ser cero, o cada diferencia tiene que estar justificada. CONTAD queda solo como consulta. No se importan movimientos históricos.

## 3. Lo que ya puede implementarse (sin decisiones pendientes)

- Asistente de apertura con sus pasos y control de que debe y haber coincidan.
- Saldos de apertura por cliente y proveedor, vinculados a la ficha fiscal.
- Tabla de referencia del balance de CONTAD y reporte de conciliación.
- Bloqueo de operaciones anteriores al corte en la base, con su aviso en pantalla.
- Regla de una sola apertura confirmada por ejercicio, con reversa para corregir.
- Pruebas automáticas de estas reglas, más validación en la base con deshacer al final (ROLLBACK), sin dejar datos persistentes.

## 4. Decisiones pendientes: información a pedirle al contador

1. Fechas reales del ejercicio fiscal y fecha de corte.
2. Datos de la empresa: CUIT, razón social, condición de IVA, IIBB e inicio de actividades.
3. Validación del plan de cuentas: altas, bajas y códigos equivalentes con CONTAD.
4. Balance de sumas y saldos de CONTAD a la fecha de corte, por cuenta.
5. Clientes y proveedores: detalle por comprobante pendiente o saldo global por tercero, y el listado con CUIT.
6. Bancos y cajas: cada cuenta, con su saldo según libro y según extracto, y las partidas a conciliar.
7. Impuestos: saldo técnico de IVA, saldo de libre disponibilidad, retenciones y percepciones sufridas y a depositar, IIBB, cargas sociales y planes de pago.
8. Anticipos de clientes y a proveedores: saldo por tercero y, si corresponde, por obra.
9. Bienes de uso: valor de origen y amortización acumulada, juntos o separados, y si van detallados por máquina.
10. Préstamos, cheques diferidos y otras deudas o créditos.
11. Qué cuentas exigen obra o máquina como analítica.
12. Criterio para justificar diferencias de conciliación, y quién aprueba la apertura.
13. Moneda: si hay saldos en dólares y a qué cotización.

## 5. Detalle técnico (para cuando se apruebe)

- Una migración de 1D, sin tocar 1A, 1B ni 1C:
  - `contab_ejercicios`: columnas nuevas `fecha_corte` y `apertura_asiento_id`, que se pueden dejar vacías.
  - Asientos de apertura: se identifican con `origen_tipo = 'apertura'`. Un índice único asegura que haya uno solo confirmado por ejercicio.
  - Tablas nuevas, con GRANT y RLS mediante `contab_puede`:
    - `contab_apertura_saldos`: tercero, comprobante de referencia, cuenta, importe, obra y máquina.
    - `contab_contad_balance`: referencia, cuenta CONTAD, cuenta ERP y saldo.
  - Trigger que bloquea fechas menores o iguales al corte en comprobantes, pagos y asientos que no sean de apertura.
  - Función que arma el asiento de apertura desde los saldos y lo deja en borrador. Para confirmarlo se usa `contab_confirmar_asiento`, que ya existe.
  - Vista de conciliación que compara el balance de CONTAD contra la apertura.
  - Cuentas nuevas en el plan, cuando el contador las confirme: anticipos de clientes, retenciones a depositar, amortizaciones acumuladas y una cuenta por banco.
- En pantalla:
  - Asistente dentro de Contabilidad, usando las entradas de navegación de launcher que ya existen.
  - La navegación general no cambia.
- No se modifican los módulos operativos ni la rentabilidad. No se crea ningún ejercicio hasta tener las fechas reales.
