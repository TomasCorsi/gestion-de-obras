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

## 5. Integración profunda con el ERP (un solo sistema, sin duplicados)

Verificado contra la base real, no solo contra el código.

### 5.1 Inventario de lo que hoy se usa

| Circuito | Tablas (filas aprox.) | Dónde se calcula / usa |
|---|---|---|
| Compras | `ordenes_compra` (63), `orden_compra_items` (255), `proveedores` (39). La OC ya guarda subtotal, IVA, percepciones, moneda, obra, máquina, sector y `numero_factura` (texto) | Proveedores, Reporte de obra, Tablero |
| Gastos generales | `otros_gastos` (34): obra, máquina, sector, **proveedor como texto**, comprobante como texto | Gastos generales, Reporte de obra, Tablero |
| Mantenimiento | `mantenimientos` (853): costo repuestos, mano de obra, costo total por máquina | Mantenimiento, Gastos por maquinaria, Tablero |
| Combustible | `cargas_combustible_repartidor` (4.359, ingresos a cisternas y egresos), `precios_productos_mes` | Combustible, Gastos por maquinaria, Reporte de obra |
| Stock | `stock_items`, `movimientos_stock` (entrada/salida/ajuste con stock anterior/nuevo) | Stock: inserta movimiento y luego actualiza existencia en **dos pasos** |
| Remitos | `remitos` (9.214), `remitos_materiales`, `remitos_maquinas` + ítems | Remitos, liquidaciones a clientes, Gastos por maquinaria |
| Ventas/cobros | `certificados` (14), `certificado_items` (221), `certificado_pagos` (1), `clientes` (40) | Certificados, avance y cobranzas en Rentabilidad |
| Personal | `sueldos`, `liquidaciones`, `liquidacion_items`, `adelantos_personal`, `prestamos_personal`, RRHH | Liquidaciones, RRHH |
| Contabilidad | `contab_*` (vacía salvo 79 cuentas) | Módulo Contabilidad |

Funciones SQL que intervienen: `contab_generar_asiento_cbte`, `contab_generar_asiento_pago`, `sync_horas_km_from_parte`, `set_orden_compra_numero`, `guardar_remito_maquinas`.

### 5.2 Problemas de integración confirmados

1. Comprobantes contables guardados en varios pasos (cabecera, borrar ítems, insertar ítems).
2. Pago insertado y asiento generado en dos llamadas separadas: si falla la segunda queda pago sin asiento.
3. Stock: movimiento y existencia en dos pasos; dos usuarios simultáneos pueden dejar stock incorrecto.
4. `otros_gastos.proveedor` es texto, no relación.
5. Cobros en `certificado_pagos` y en `contab_pagos` sin vínculo: el mismo cobro podría cargarse dos veces.
6. Costo de máquina hoy suma mantenimientos + combustible + remitos; una factura de repuestos lo duplicaría.
7. Costo de obra hoy suma OC (neto) + otros gastos + combustible: una factura de la misma compra lo duplicaría.
8. La OC guarda el número de factura como texto: no permite facturación parcial ni control.
9. Ediciones y borrados de documentos operativos con efecto económico no dejan rastro.

### 5.3 Arquitectura unificada

Tres capas separadas, con un documento origen común:

```text
DOCUMENTO OPERATIVO (OC, mantenimiento, carga combustible, remito, certificado, liquidación, gasto)
        │  origen_tipo + origen_id
        ├──> CONTABILIDAD GENERAL: asiento (único por hecho económico)
        ├──> TESORERÍA: movimiento de caja/banco/valor (solo al pagar o cobrar)
        └──> COSTOS DE GESTIÓN: imputación analítica (obra / máquina / sector), con estado
             comprometido (OC) → real (factura o consumo)
```

- Tabla `doc_vinculos` (documento A ↔ documento B, tipo de relación, importe) para relaciones explícitas: OC ↔ factura (parcial), factura ↔ mantenimiento, factura ↔ ingreso a cisterna, certificado ↔ factura de venta ↔ recibo, anticipo ↔ rendición.
- Índice único por `origen_tipo + origen_id` en asientos: un hecho, un asiento.
- `contab_imputaciones` con `estado_costo` (comprometido / real) y `origen`; la rentabilidad leerá una vista que toma, por hecho, la fuente de mayor jerarquía (factura > OC; consumo de stock > compra a stock).

### 5.4 Matriz por operación

| Operación | Origen | Asiento | Costo | Tesorería | Anti duplicado |
|---|---|---|---|---|---|
| Orden de compra | `ordenes_compra` | No | Comprometido en obra/máquina | No | Pasa a real solo vía factura vinculada |
| Factura de compra (con OC) | comprobante + vínculo OC | Gasto/stock vs Proveedores | Real; libera el comprometido de la OC por el importe facturado | No | Vínculo OC↔factura; suma facturada ≤ OC |
| Factura de compra a stock | comprobante + entrada de stock | Mercaderías vs Proveedores | Ninguno hasta consumir | No | Costo nace en salida de stock |
| Salida de stock a obra | `movimientos_stock` | Costo vs Mercaderías (resumen) | Real en obra | No | Valorizada a costo promedio, una vez |
| Factura de repuesto/servicio de máquina | comprobante + vínculo `mantenimientos` | Gasto máquina vs Proveedores | Real en la máquina | No | Si está vinculada, el mantenimiento deja de sumar su costo cargado a mano |
| Compra de combustible | comprobante + ingreso a cisterna | Combustible en existencia vs Proveedores | Ninguno | No | Costo nace en egreso (carga a máquina) a precio del mes |
| Carga de combustible a máquina | `cargas_combustible_repartidor` (egreso) | Consumo vs Existencia (resumen mensual) | Real en máquina/obra | No | Una sola fuente: el egreso |
| Gasto general | `otros_gastos` → migra a comprobante u OP2 | Gasto vs Caja o Proveedores | Real | Si se paga en el acto | Gasto queda vinculado a su comprobante; no se carga en ambos |
| OP1 | orden de pago | Proveedores vs Caja/Banco/Valores + retenciones | **Ninguno** | Sí | Idempotencia, bloqueo de saldo de factura |
| OP2 / rendición | orden de pago | Gasto vs Caja/Anticipo | Real | Sí | Rendición descarga anticipo; no duplica gasto existente vinculado |
| Certificado de obra | `certificados` | No (documento comercial) | Ingreso de obra (gestión) | No | Vínculo a factura de venta |
| Factura de venta | comprobante + vínculo certificado | Deudores vs Ventas e IVA | — | No | Un certificado ↔ una o varias facturas, suma ≤ total |
| Cobro | recibo | Caja/Banco/Valores vs Deudores | — | Sí | `certificado_pagos` pasa a ser vista del recibo: un solo registro |
| Liquidación de sueldos | `liquidaciones` | Sueldos vs a pagar (resumen) | Real por obra según partes/asignación | Al pagar | Asiento único por liquidación |
| Remito de máquinas/viajes a cliente | remitos | Al facturar | Ingreso de gestión | No | Vínculo remito ↔ factura |

### 5.5 Cambios mínimos al esquema actual (todos aditivos)

- `otros_gastos`: + `proveedor_id` nullable (se completa cruzando el texto; el texto queda).
- `ordenes_compra`: sin cambios de columnas; la facturación parcial va en `doc_vinculos`.
- `mantenimientos`: + `comprobante_id` nullable.
- `cargas_combustible_repartidor` (ingresos): + `comprobante_id` nullable.
- `certificado_pagos`: + `recibo_id` nullable; luego se vuelve solo lectura derivada.
- `movimientos_stock`: + `costo_unitario`, `comprobante_id`; función atómica `registrar_movimiento_stock` con bloqueo de fila.
- `proveedores` / `clientes`: + datos fiscales (CUIT ya existe).
- Auditoría por trigger en los documentos operativos con impacto económico.
- **No se modifica la rentabilidad actual** en estas fases: la vista nueva corre en paralelo y se compara.

### 5.6 Migración de registros existentes

- 63 OC: quedan como comprometido; las que tienen `numero_factura` se listan para vincular a la factura cuando se cargue.
- 34 gastos generales: cruce de proveedor texto → ID con revisión manual de dudosos; no se generan asientos retroactivos salvo decisión del contador.
- 853 mantenimientos y 4.359 cargas de combustible: siguen como fuente de costo; solo se vinculan a facturas desde la fecha de corte.
- 14 certificados y 1 cobro: se vincula el cobro a un recibo de saldo inicial.
- Nada se borra; todo cambio se hace sobre copia de respaldo previa y con reporte de antes/después.

### 5.7 Pruebas de integración

- Factura vinculada a OC: costo de obra no cambia en total (pasa de comprometido a real).
- Factura de repuesto vinculada a mantenimiento: costo de máquina no se duplica.
- Compra de combustible + egreso: costo aparece solo una vez, al egreso.
- Cobro desde recibo aparece en Certificados sin cargarse dos veces.
- Movimiento de stock concurrente deja existencia correcta.
- Rentabilidad actual vs vista nueva para todas las obras: diferencias explicadas una por una.

### 5.8 Riesgos de tocar módulos operativos

- Pantallas en producción (remitos, combustible, mantenimiento) usadas a diario: cambios solo aditivos y detrás de vínculos opcionales.
- Cambiar el cálculo de costos altera números que la dirección ya mira: por eso la vista nueva corre en paralelo antes de reemplazar.
- Usuarios de campo (remitero, maquinistas) no deben ver ni verse afectados por la contabilidad: permisos separados.

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
| 0 | Núcleo: ejercicios, períodos, inmutabilidad, partida doble, cuentas por configuración, roles, auditoría, guardado atómico (comprobante + asiento, pago + asiento) | — | Tests de núcleo y de permisos verdes |
| 0b | Integración base: `doc_vinculos`, columnas de vínculo opcionales, stock atómico, `proveedor_id` en gastos generales | 0 | Pantallas operativas sin cambios visibles; pruebas de integración verdes |
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
