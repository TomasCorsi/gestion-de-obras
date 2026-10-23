# Contabilidad Calamina Sur: reemplazo de CONTAD (plan técnico revisado)

Este plan reemplaza al anterior. No se toca la base ni se programa hasta aprobarlo y responder las preguntas al contador (sección final).

## 1. Diagnóstico del estado actual

Hecho por inspección del esquema, funciones y políticas actuales.

**Qué existe**
- Tablas `contab_*`: empresa, puntos de venta, plan de cuentas (79 cuentas cargadas), terceros, comprobantes + ítems, pagos, asientos + líneas.
- Funciones `contab_generar_asiento_cbte` y `contab_generar_asiento_pago` (SECURITY DEFINER, verifican rol admin/contador).
- Pantallas: Ventas, Compras, Pagos/Cobranzas, Asientos, Reportes (IVA, mayor), Configuración.
- **Datos operativos: 0 comprobantes, 0 asientos, 0 pagos, 0 terceros.** Se puede rediseñar sin migrar datos internos.

**Problemas detectados (a corregir, no reutilizar tal cual)**
1. Asientos editables y borrables: la política `ALL` permite al contador modificar/borrar asientos y líneas confirmados. No hay inmutabilidad.
2. No se valida partida doble a nivel base (debe = haber); se confía en la función.
3. Cuentas contables fijas por código dentro de las funciones (`'2.1.1.01'`, etc.): si cambia el plan, se rompen sin aviso.
4. Sin períodos contables ni cierres: se puede registrar en cualquier fecha.
5. Numeración de asientos sin control de huecos ni de concurrencia por ejercicio.
6. Guardado de comprobantes desde el navegador en varios pasos (cabecera, borrar ítems, insertar ítems): no es transaccional, puede dejar comprobantes a medias.
7. Un pago solo cancela un comprobante y un medio. No hay OP con varias facturas ni varios medios, ni retenciones.
8. Anulación solo cambia el estado; no genera asiento de reversa.
9. Sin prevención de duplicados (mismo proveedor + tipo + punto + número).
10. `contab_terceros` duplica `proveedores` y `clientes` del ERP: riesgo de dos maestros.
11. Imputación analítica a una sola obra/máquina por ítem; sin centros de costo ni distribución.
12. Sin auditoría de cambios.
13. **Riesgo de doble costo:** la rentabilidad de obras hoy suma órdenes de compra, otros gastos, combustible, sueldos, etc. Si además se suman facturas contables, el costo se duplica.

## 2. Principios de diseño

- **Contabilidad y costos separados**: el asiento es la verdad contable; las imputaciones analíticas (centro/subcentro) cuelgan del comprobante, no del pago. Pagar nunca genera costo.
- **Inmutable al confirmar**: borrador editable; confirmado solo se corrige con reversa (contraasiento) o nota de crédito/débito.
- **Todo movimiento con efecto contable se graba en una sola función transaccional** en la base (OP, recibo, comprobante, transferencia, cierre). El navegador no escribe asientos.
- **Un solo maestro de terceros**: proveedores y clientes del ERP, extendidos con datos fiscales.
- **Cuentas por configuración**, no por código fijo.
- **Montos en `numeric(18,2)`**, cotización en `numeric(18,6)`, moneda por documento.

## 3. Modelo de datos propuesto

```text
EJERCICIOS/PERÍODOS ── ASIENTOS (inmutables) ── LÍNEAS (cuenta, debe/haber, moneda)
                              ▲                        └─ IMPUTACIONES ANALÍTICAS (centro/subcentro, % o importe)
       COMPROBANTES ──────────┤
       ORDENES DE PAGO ───────┤── APLICACIONES (OP/recibo ↔ comprobantes, parciales)
       RECIBOS ───────────────┤── MEDIOS (caja, banco, cheque, echeq, USD, retención)
       MOV. TESORERÍA ────────┘── VALORES (cheques/echeqs con historial de estados)
```

**Núcleo contable**
- `contab_ejercicios` (desde/hasta, estado) y `contab_periodos` (mes, estado: abierto / cerrado / bloqueado). Trigger impide asentar en período cerrado.
- `contab_asientos`: + `ejercicio_id`, `periodo_id`, `numero` correlativo por ejercicio (secuencia con bloqueo), `estado` (borrador/confirmado/revertido), `reversa_de`, `origen_tipo` + `origen_id`, `hash` opcional.
- `contab_asiento_lineas`: + `moneda`, `cotizacion`, `importe_origen`, `tercero_id`. CHECK: debe ≥ 0, haber ≥ 0, no ambos > 0.
- Trigger diferido (constraint trigger) que exige Σdebe = Σhaber al confirmar.
- Trigger que bloquea UPDATE/DELETE de asientos y líneas confirmados.
- `contab_cuentas_config`: clave funcional (proveedores, deudores, IVA CF, IVA DF, ret. ganancias a depositar, etc.) → cuenta. Las funciones leen de aquí.

**Analítica (costos)**
- `contab_centros_costo`: árbol centro → subcentro, con `obra_id` o `maquinaria_id` opcional y tipo (obra, máquina, taller, oficina, depósito, vehículos).
- `contab_imputaciones`: por ítem de comprobante o línea de OP2; centro, subcentro, `porcentaje` o `importe`. Validación: suma = neto del ítem.
- Vista `costos_analiticos` que unifica para rentabilidad, con regla anti-duplicado (ver riesgo 13).

**Terceros**
- Extender `proveedores` y `clientes` (columnas nullable): CUIT, condición IVA, condición IIBB/jurisdicciones, exenciones, CBU, cuenta contable. `contab_terceros` se retira (vacía) o pasa a vista de compatibilidad.

**Comprobantes**
- `contab_comprobantes`: + `tipo_arca` (código numérico oficial), letra (A, B, C, E, M, T, X, Z, I, N), `fecha_vto`, `saldo`, `circuito` (blanco/interno), `numero_interno`. Índice único (tercero, tipo, punto, número) excluyendo anulados.
- `contab_cbte_percepciones` (régimen, jurisdicción, base, alícuota, importe).
- `contab_cbte_vencimientos` (cuotas).
- NC/ND con `comprobante_asociado_id`.
- Anticipos a proveedor / de cliente como saldo a aplicar.

**Cuentas corrientes**
- `contab_aplicaciones` (documento que cancela ↔ comprobante cancelado, importe). El saldo se deriva, no se escribe a mano.
- Saldos iniciales como comprobante tipo "Saldo inicial migración".

**Órdenes de pago**
- `contab_ordenes_pago`: tipo (OP1 con cuenta corriente / OP2 gasto directo o rendición), estado (borrador → pendiente de aprobación → aprobada → pagada → anulada), solicitado/aprobado por, `rendicion_de` (persona) y adjuntos.
- `contab_op_debitos` (OP2: cuenta + imputaciones), aplicaciones (OP1), `contab_op_retenciones`, medios.
- `contab_aprobaciones` con umbrales por importe.

**Retenciones**
- `contab_regimenes_retencion`: impuesto (Ganancias, IIBB por jurisdicción, IVA, SUSS), código de régimen, vigencia desde/hasta, mínimo no sujeto, mínimo de retención, escala o alícuota, base (neto/total), acumulación mensual por proveedor.
- `contab_retencion_sujeto`: por proveedor (inscripto/no inscripto, exención con vigencia y certificado, padrones).
- Motor en función SQL pura `calcular_retenciones(proveedor, fecha, base)` testeable; certificado PDF numerado por régimen.

**Tesorería**
- `contab_cajas_bancos` (cuenta contable, moneda, CBU).
- `contab_mov_tesoreria` (depósitos, extracciones, transferencias entre cuentas, gastos bancarios).
- `contab_valores`: cheque/echeq propio o de terceros, banco, número, emisor, fecha emisión/pago, importe, moneda; `contab_valores_historial` (recibido, en cartera, depositado, endosado a proveedor, rechazado, acreditado).
- `contab_cotizaciones` (moneda, fecha, valor) y diferencia de cambio.
- `contab_conciliaciones` + importación de extracto (Excel/CSV) y marca de movimientos conciliados.

**Seguridad y auditoría**
- Roles nuevos en `app_role`: `tesorero`, `aprobador_pagos` (además de admin y contador). Matriz: carga (contador), aprobación (aprobador), pago (tesorero), cierre (admin).
- `contab_auditoria` alimentada por trigger genérico (tabla, id, operación, antes/después, usuario, fecha).
- Funciones SQL: SECURITY INVOKER cuando alcance; las DEFINER con verificación de rol, `search_path` fijo y `REVOKE EXECUTE FROM public/anon`.
- Concurrencia: `SELECT … FOR UPDATE` sobre comprobantes al aplicar pagos; columna `version` para bloqueo optimista en edición.
- Idempotencia: clave `client_request_id` única en OP y recibos para evitar dobles envíos.

**ARCA (desacoplado)**
- `contab_arca_solicitudes` (comprobante, request, response, CAE, vencimiento CAE, estado: pendiente/autorizado/rechazado/error, observaciones).
- Función en el servidor `arca-wsfe` separada; el comprobante queda en "pendiente de CAE" y la contabilidad no depende de la respuesta. Requiere certificado y clave fiscal de la empresa.

## 4. Integración con el ERP

- **Órdenes de compra → factura de compra**: vincular `ordenes_compra` a comprobantes para control de 3 vías (OC, remito, factura).
- **Rentabilidad sin duplicar**: definir una sola fuente de costo por tipo (ver pregunta P1). Propuesta: mientras convivan, el costo de obra toma la factura contable si existe y la OC solo si no está facturada.
- **Combustible, remitos de máquinas/materiales, sueldos**: no generan asientos automáticos en esta etapa; se integran luego por asiento resumen mensual.
- **Proveedores/clientes**: un solo maestro; las pantallas actuales siguen funcionando.
- Empleados: rendiciones de caja (OP2) vinculadas a `personal`.

## 5. Migración desde CONTAD

Orden: plan de cuentas → terceros → saldos iniciales → comprobantes pendientes → bancos/cajas → cheques en cartera.
- Plantillas Excel por entidad; importador con vista previa, validación (CUIT, duplicados, cuentas inexistentes) y simulación sin grabar.
- Asiento de apertura a una fecha de corte acordada.
- Conciliación de control: saldo por proveedor/cliente, total por cuenta y cheques en cartera deben coincidir con los listados de CONTAD; reporte de diferencias.
- Período de doble carga (CONTAD + sistema) por al menos un mes, con comparación de mayores y libro IVA.

## 6. Fases e iteraciones

| Fase | Contenido | Depende de | Criterio para pasar |
|---|---|---|---|
| 0 | Correcciones al núcleo: inmutabilidad, partida doble, períodos, cuentas por configuración, auditoría, roles, guardado transaccional | — | Tests de núcleo verdes; intentos de editar asiento confirmado fallan |
| 1 | Maestro de terceros unificado + centros de costo + importador del plan de cuentas y terceros | 0 | Importación de prueba de CONTAD sin diferencias |
| 2 | Compras completas (letras, percepciones, NC/ND, vencimientos, imputaciones múltiples) + cuenta corriente proveedores + saldos iniciales | 1 | Saldos por proveedor iguales a CONTAD |
| 3 | Tesorería: cajas, bancos, cheques/echeqs, cotizaciones, libro banco | 0 | Libro banco igual a extracto de prueba |
| 4 | Motor de retenciones + OP1/OP2 con aprobación, rendiciones y PDF | 2, 3 | Casos del contador reproducidos al centavo |
| 5 | Ventas internas + recibos (N1/X2) + cuenta corriente clientes | 3 | Saldos por cliente iguales a CONTAD |
| 6 | Conciliación bancaria, cierres de período, balance, sumas y saldos, diario y mayor exportables | 2–5 | Balance de prueba cuadra con CONTAD |
| 7 | Rentabilidad integrada sin doble costo | 2, 4 | Rentabilidad de 3 obras igual antes/después salvo diferencias explicadas |
| 8 | ARCA (CAE) | 5 + certificado | Homologación ARCA aprobada |

Cada fase se cierra con tests automáticos, prueba en pantalla con usuarios reales de cada rol y validación del contador.

## 7. Pruebas obligatorias

- Partida doble: ningún asiento confirmado con Σdebe ≠ Σhaber.
- Inmutabilidad y reversa: editar/borrar confirmado falla; reversa deja saldo cero.
- Pagos parciales y múltiples facturas; NC aplicada; anticipo aplicado luego.
- Saldos de cuenta corriente = Σcomprobantes − Σaplicaciones.
- Retenciones: mínimos, acumulado mensual, exención vigente/vencida, cambio de alícuota por vigencia.
- Imputaciones: suma de % = 100 y suma de importes = neto.
- Período cerrado rechaza asientos.
- Concurrencia: dos OP simultáneas sobre la misma factura no superan su saldo.
- Idempotencia: doble envío no duplica.
- Permisos: cada rol solo puede lo que le corresponde (pruebas contra la base).
- Moneda: diferencia de cambio correcta.

## 8. Riesgos

- Doble costo en rentabilidad durante la convivencia ERP/contabilidad.
- Normativa de retenciones cambiante y por jurisdicción: requiere mantenimiento de tablas.
- Circuito interno (N1, OP2 "en negro"): debe quedar separado del blanco en libros fiscales y reportes; decisión del contador.
- Migración con saldos que no cierran en CONTAD de origen.
- ARCA depende de certificado, homologación y disponibilidad del servicio.
- Alcance grande: estimar varias semanas por fases; no apurar cierre de fases.

## 9. Decisiones pendientes (internas)

- D1. Fecha de corte y de arranque en paralelo.
- D2. Quién aprueba pagos y desde qué importe.
- D3. ¿Retirar `contab_terceros` o mantenerlo como vista?
- D4. Fuente única de costo de obra (OC o factura).

## 10. Preguntas para el contador

1. ¿El circuito interno (N1, X2, OP2) debe llevar contabilidad separada (otro libro/ejercicio) o mismas cuentas con marca?
2. ¿Qué plan de cuentas usar: el de CONTAD tal cual o uno nuevo? ¿Pueden exportarlo?
3. Regímenes de retención que aplica la empresa (Ganancias RG 830, IIBB Buenos Aires/ARBA, CABA/AGIP, IVA, SUSS) y padrones que consultan.
4. ¿Somos agentes de percepción en ventas? ¿En qué jurisdicciones?
5. Criterio de imputación: ¿costo de obra al devengar la factura o al pagar?
6. Tratamiento de diferencia de cambio y valuación de dólares en caja.
7. Fecha de cierre de ejercicio y cómo se hacen hoy los asientos de cierre/apertura.
8. ¿Qué reportes presentan (libro IVA digital, sumas y saldos, balance)? Formato requerido.
9. Puntos de venta habilitados en ARCA y tipos de comprobante que emiten.
10. ¿Cheques diferidos propios se registran como pasivo en "valores a pagar"?

## Detalles técnicos adicionales

- Todas las tablas nuevas: GRANT a authenticated/service_role, RLS por rol con `has_role`, sin acceso anónimo.
- Cambios aditivos: columnas nuevas nullable; nada se borra mientras haya código que lo use.
- Funciones transaccionales: `contab_confirmar_comprobante`, `contab_guardar_op`, `contab_aprobar_op`, `contab_guardar_recibo`, `contab_revertir_asiento`, `contab_cerrar_periodo`.
- Tests: Vitest para cálculos puros (retenciones, distribución, saldos) y pruebas SQL contra la base para triggers y permisos.
