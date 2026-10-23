# Contabilidad Calamina Sur: plan integral para reemplazar CONTAD

Plan técnico, sin código ni cambios en la base hasta su aprobación y la validación del contador. Basado en los documentos CONTABLE y CONTAD VALEN JULI y en la auditoría del módulo actual (esquema, funciones, políticas, datos y pantallas).

## 1. Comparación CONTAD vs ERP actual

| Circuito CONTAD | ERP hoy | Estado |
|---|---|---|
| Compras (tipo, letra, PV, número, cuenta, centro/subcentro, percepciones) | Comprobante de compra con IVA por alícuota, percepciones IVA/IIBB/otras, 1 obra o 1 máquina por ítem | Parcial: faltan letras E/M/I/X, centros, imputación múltiple, duplicados |
| NC / ND compras y ventas | Tipos existen | Parcial: sin vínculo al comprobante original ni aplicación |
| OP 1 (facturas, retenciones, varios medios, PDF) | "Pago" simple: 1 comprobante, 1 medio | Falta |
| OP 2 (rendiciones, Debe/Haber libre, centro/subcentro) | No existe | Falta |
| Cta. cte. y totales proveedores, Excel | No existe | Falta |
| Ventas (A B C E M T X Z, percepciones, CAE) | Comprobante de venta sin CAE | Parcial |
| Recibos N1 / X2, aplicación, retenciones sufridas | "Cobro" simple | Falta |
| Cta. cte. y totales clientes | No existe | Falta |
| Libro banco, cajas, cheques/echeqs, conciliación | No existe | Falta |
| Plan de cuentas | 79 cuentas cargadas, jerárquico | Reutilizable |
| Asientos generales / modelo | Asientos automáticos; sin manuales ni modelos | Parcial |
| Diario, mayor, sumas y saldos, balance | Mayor y libro IVA | Parcial |
| Cierre de mes / ejercicio, diario definitivo | No existe | Falta |
| Ajuste por inflación | No existe | Falta (sujeto a contador) |
| Auditoría | No existe | Falta |

## 2. Auditoría del módulo actual

**Reutilizable**
- Plan de cuentas jerárquico, empresa, puntos de venta.
- Estructura comprobante + ítems con IVA desagregado y percepciones.
- Asiento + líneas con obra/máquina.
- Pantallas Ventas, Compras, Pagos, Asientos, Reportes, Configuración (se rediseñan, no se descartan).
- Maestros del ERP: proveedores, clientes, obras, maquinarias, personal, órdenes de compra, stock, combustible.
- Datos operativos contables: **0 comprobantes, 0 asientos, 0 pagos, 0 terceros** → se puede corregir el núcleo sin migrar nada interno.

**Defectos a corregir antes de crecer**
1. Asientos y líneas editables/borrables por contador (política ALL): sin inmutabilidad.
2. Partida doble no validada por la base.
3. Cuentas fijas por código dentro de las funciones.
4. Sin ejercicios, períodos ni bloqueo.
5. Numeración de asientos sin control de concurrencia.
6. Guardado de comprobantes en varios pasos desde el navegador (no atómico).
7. Anulación sin contraasiento.
8. Sin control de comprobante duplicado.
9. `contab_terceros` duplica proveedores/clientes del ERP.
10. Sin auditoría ni aprobaciones.
11. Rentabilidad de obra suma órdenes de compra, gastos y combustible: sumar facturas sin regla causaría **doble costo**.

## 3. Modelo de datos propuesto

```text
EJERCICIOS ─ PERÍODOS
     │
ASIENTOS (borrador → confirmado, inmutable; reversa) ─ LÍNEAS ─ IMPUTACIONES ANALÍTICAS
     ▲
     ├─ COMPROBANTES (compra/venta, NC/ND) ─ ítems ─ percepciones ─ vencimientos
     ├─ ÓRDENES DE PAGO (OP1/OP2) ─ aplicaciones ─ débitos ─ retenciones ─ medios
     ├─ RECIBOS ─ aplicaciones ─ retenciones sufridas ─ medios
     ├─ MOV. TESORERÍA (depósitos, transferencias, gastos bancarios)
     └─ ASIENTOS MANUALES / MODELO / AJUSTES / CIERRE
VALORES (cheques, echeqs) ─ historial de estados
CAJAS Y BANCOS ─ conciliaciones ─ extractos
```

**Núcleo**: `contab_ejercicios`, `contab_periodos` (abierto/cerrado), asientos con número correlativo por ejercicio, estado, `reversa_de`, origen; trigger diferido de Debe = Haber; trigger de bloqueo de confirmados y de períodos cerrados; `contab_cuentas_config` (cuentas por función); `contab_asientos_modelo`.

**Analítica**: `contab_centros_costo` (centro → subcentro, vinculado a obra, máquina, taller, oficina, depósito, vehículos); `contab_imputaciones` por % o importe, varias por ítem, validadas contra el neto.

**Terceros**: un solo maestro = proveedores y clientes del ERP, ampliados con datos fiscales (CUIT, IVA, IIBB, jurisdicciones, exenciones, CBU, cuenta contable). `contab_terceros` queda en desuso.

**Comprobantes**: código ARCA, letra, circuito (fiscal / interno), saldo derivado, comprobante asociado (NC/ND), vencimientos, percepciones detalladas, vínculo a orden de compra y remito; índice único proveedor+tipo+PV+número.

**Cuentas corrientes**: `contab_aplicaciones` (qué documento cancela qué y cuánto); anticipos como saldo a aplicar; saldo nunca se escribe a mano.

**OP**: tipo OP1/OP2, estados borrador → pendiente de aprobación → aprobada → pagada → anulada, responsable de rendición (personal), adjuntos, umbral de aprobación.

**Retenciones**: regímenes por impuesto, jurisdicción, vigencia, mínimos no sujetos, escalas, base, acumulado mensual; situación por proveedor (inscripción, exención con vencimiento, padrón); certificados numerados.

**Tesorería**: cajas/bancos con moneda y cuenta contable; valores con ciclo recibido → cartera → depositado / endosado → acreditado / rechazado; cotizaciones; conciliación con importación de extracto.

**Seguridad**: roles nuevos `tesorero`, `aprobador_pagos` además de admin y contador; `contab_auditoria` por trigger; clave de idempotencia en OP y recibos; bloqueo de filas al aplicar pagos.

**ARCA**: `contab_arca_solicitudes` (request, response, CAE, vencimiento, estado) y función de servidor separada; la contabilidad no depende de su respuesta.

## 4. Diseño de cada circuito (experiencia modernizada)

- **Compras**: carga con búsqueda de proveedor por nombre o CUIT, sugerencia de cuenta y centro según el último comprobante del proveedor, lectura asistida de PDF de factura (ya existe para órdenes de compra), aviso de duplicado, imputación rápida "100% a obra X" o reparto por %.
- **OP1**: elegir proveedor → ver pendientes con saldo y vencimiento → marcar y editar importe parcial → retenciones calculadas solas con detalle → agregar medios (caja, banco, cheque de cartera, echeq, USD con cotización) → indicador de diferencia hasta cuadrar → enviar a aprobación → pagar → PDF de OP y certificados.
- **OP2 / rendiciones**: renglones Debe con cuenta, centro y subcentro (obra/máquina reales); Haber con origen de fondos; adjuntar fotos de tickets; vincular a anticipo entregado al empleado para que la rendición lo descargue y no duplique.
- **Ventas**: desde certificados y liquidaciones de remitos ya existentes se propone la factura; luego CAE.
- **Recibos**: cliente → facturas pendientes → importes → medios y retenciones sufridas → PDF; N1 / X2 según circuito.
- **Cuentas corrientes**: pantalla por tercero con saldo inicial, movimientos y saldo acumulado; totales de todos con filtros y Excel.
- **Libro banco y tesorería**: por cuenta y fechas, orden por emisión o vencimiento, saldo acumulado, Excel; cartera de cheques con alertas de vencimiento; conciliación marcando contra extracto.
- **Contabilidad general**: asientos manuales y modelo, diario, mayor, sumas y saldos, balance, cierre de mes, apertura/cierre de ejercicio, diario definitivo numerado e inalterable, ajuste por inflación si el contador lo confirma.

## 5. Integración con el ERP y regla anti doble costo

- **El costo nace en el devengamiento (factura o consumo), nunca en el pago.** El pago solo cancela deuda.
- Repuesto para una máquina → imputación a subcentro de esa máquina → suma a su reporte económico.
- Material a obra → imputación a la obra; si entra a stock, el costo pasa a la obra recién al consumirse (salida de stock), no al facturar.
- Orden de compra facturada: la rentabilidad usa la factura y deja de contar la OC; OC sin factura sigue contando como compromiso.
- Combustible: cargas existentes siguen siendo la fuente de costo por máquina/obra; la factura del combustible va a cuenta "combustible en cisternas" y no se vuelve a imputar.
- Anticipos a proveedores y a empleados: activo hasta aplicar o rendir; no son costo.
- Sueldos: asiento resumen mensual desde la liquidación existente.
- Vista única `costos_atribuibles` que la rentabilidad consulta con estas reglas.

## 6. Plan de migración desde CONTAD

**Qué conseguir de CONTAD (no asumir que existe exportación)**
- Plan de cuentas con códigos.
- Padrón de proveedores y clientes con CUIT y condición fiscal.
- Saldos por proveedor y cliente a la fecha de corte, con detalle de comprobantes pendientes.
- Balance de sumas y saldos a la fecha de corte.
- Libro banco y saldos de cajas.
- Cartera de cheques/echeqs vigentes.
- Últimos números de OP, recibos y facturas por punto de venta.
- Si CONTAD no exporta: listados en PDF/Excel o impresos para carga asistida.

**Formatos aceptados**: Excel/CSV con plantilla por entidad; lectura asistida de PDF como respaldo.

**Pasos**
1. Mapear plan de cuentas CONTAD → nuevo (tabla de equivalencias, revisada por contador).
2. Importar terceros cruzando por CUIT con proveedores/clientes del ERP; revisar coincidencias dudosas.
3. Asiento de apertura a fecha de corte desde el balance.
4. Comprobantes pendientes como "saldo inicial" por documento (para poder aplicar pagos).
5. Bancos, cajas y cheques en cartera.
6. Cada importación con vista previa, validaciones y simulación antes de grabar.
7. Conciliación de control: totales por cuenta, por tercero y cartera de cheques iguales a CONTAD; reporte de diferencias.
8. Paralelo de al menos un mes cargando en ambos sistemas; comparar mayores, libro IVA y saldos semanalmente.
9. Corte definitivo cuando dos cierres de mes coincidan.

## 7. Fases de implementación

| Fase | Contenido | Depende de | Para pasar a la siguiente |
|---|---|---|---|
| 0 | Núcleo: ejercicios, períodos, inmutabilidad, partida doble, cuentas por configuración, roles, auditoría, guardado atómico | — | Tests de núcleo y de permisos verdes |
| 1 | Terceros unificados, centros de costo, importadores de plan de cuentas y terceros | 0 | Importación de prueba sin diferencias |
| 2 | Compras completas + NC/ND + cta. cte. proveedores + saldos iniciales | 1 | Saldos iguales a CONTAD |
| 3 | Tesorería: cajas, bancos, valores, cotizaciones, libro banco | 0 | Libro banco igual al extracto |
| 4 | Retenciones + OP1 + OP2 con aprobación, rendiciones y PDF | 2, 3 | Casos del contador al centavo |
| 5 | Ventas + recibos + cta. cte. clientes | 3 | Saldos de clientes iguales |
| 6 | Asientos manuales/modelo, diario, mayor, sumas y saldos, balance, cierres, diario definitivo, conciliación bancaria | 2–5 | Balance de prueba igual a CONTAD |
| 7 | Rentabilidad con costos atribuibles | 2, 4 | 3 obras y 3 máquinas con diferencias explicadas |
| 8 | Paralelo y corte con CONTAD | 1–7 | Dos cierres coincidentes |
| 9 | ARCA (CAE) y ajuste por inflación | 5, 6 + definiciones | Homologación aprobada / visto bueno contador |

## 8. Riesgos

- **Técnicos**: doble costo durante la convivencia; concurrencia en pagos; importaciones incompletas; dependencia de ARCA (certificado, homologación, caídas); volumen de pantallas grandes.
- **Contables**: circuito interno separado de los libros fiscales; retenciones cambiantes por jurisdicción; saldos de CONTAD que no cierran; ajuste por inflación mal aplicado; diferencias de cambio.
- **Operativos**: doble carga en el paralelo; capacitación; plazos (estimado varias semanas por fases).
- **Backups y recuperación**: copia diaria automática de la base, exportación propia diaria de tablas contables (ampliar la función de respaldo existente), respaldo antes de cada cierre y de cada importación, prueba de restauración trimestral; un cierre nunca se deshace borrando, solo con reapertura autorizada y auditada.

## 9. Pruebas

**Automatizadas**: partida doble; inmutabilidad y reversa; pagos parciales y múltiples facturas; NC y anticipos aplicados; saldos = comprobantes − aplicaciones; retenciones (mínimos, acumulado mensual, exención vencida, vigencias); imputaciones al 100%; período cerrado rechaza; dos pagos simultáneos no superan el saldo; doble envío no duplica; permisos por rol contra la base; diferencia de cambio; regla anti doble costo en rentabilidad.

**Conciliación**: por fase contra listados de CONTAD (saldos por tercero, mayores, libro banco, cartera, libro IVA); reporte de diferencias firmado por el contador antes de avanzar.

## 10. Decisiones para validar con el contador

1. Circuito interno (N1, X2, OP2): ¿libro separado o mismas cuentas con marca, y cómo se excluye de libros fiscales?
2. ¿Plan de cuentas de CONTAD tal cual o uno nuevo? ¿Qué puede exportar CONTAD y en qué formato?
3. Regímenes de retención vigentes (Ganancias RG 830, IIBB ARBA/AGIP/otros, IVA, SUSS) y padrones usados.
4. ¿Somos agentes de percepción en ventas? ¿Dónde?
5. Costo de obra: ¿al devengar la factura o al consumir de stock?
6. Valuación de dólares y diferencia de cambio.
7. Fecha de cierre de ejercicio y procedimiento de cierre/apertura.
8. Ajuste por inflación: ¿corresponde y con qué índice?
9. Reportes obligatorios (libro IVA digital, diario, sumas y saldos, balance) y formato.
10. Puntos de venta y comprobantes habilitados en ARCA.
11. Cheques diferidos propios: ¿valores a pagar?
12. Fecha de corte para la migración y duración del paralelo.

**Decisiones internas**: quién aprueba pagos y desde qué monto; quién cierra períodos; si se retira `contab_terceros`.

## Detalles técnicos

- Todo aditivo: columnas nuevas nullable, nada se borra mientras haya código que lo use; tablas nuevas con GRANT y RLS por rol (`has_role`), sin acceso anónimo.
- Funciones transaccionales en la base: confirmar comprobante, guardar/aprobar/pagar OP, guardar recibo, revertir asiento, cerrar período, importar lote. SECURITY INVOKER cuando sea posible; las DEFINER con verificación de rol, `search_path` fijo y sin ejecución pública.
- Tests: Vitest para cálculos puros (retenciones, reparto, saldos, anti doble costo) y pruebas SQL para triggers y permisos.
