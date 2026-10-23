# Contabilidad – Fase 0: núcleo contable seguro

Alcance exclusivo: núcleo contable. **No se tocan** stock, combustible, mantenimiento, remitos, certificados, gastos generales, órdenes de compra ni rentabilidad. Nada de esas tablas se modifica en esta fase.

## A. Ajustes incorporados al plan integral (para fases siguientes)

1. **Vínculos entre documentos** (`doc_vinculos`): por documento y opcionalmente por renglón (`origen_item_id`, `destino_item_id`), con importe y cantidad vinculados; único por (origen, renglón, destino, renglón, tipo); validación de que lo vinculado no supere el saldo del renglón; borrado de documento bloqueado si tiene vínculos (sin huérfanos).
2. **Unicidad de asientos**: única por `origen_tipo + origen_id + evento` (alta, anulación, ajuste, diferencia de cambio…) solo para asientos vigentes; las reversas y ajustes son eventos distintos. Resuelto ya en esta fase.
3. **Mantenimiento**: vínculo de factura a componente (repuestos, mano de obra, servicio) con importe; solo se reemplaza el costo del componente y por el importe vinculado.
4. **Materiales**: compra → ingreso a stock (cantidad y costo) → consumo → imputación a obra, con conciliación de cantidades y valores en cada paso.
5. **Certificados**: `certificado_pagos` sigue siendo la pantalla actual; el recibo contable lo crea o lo vincula (nunca ambos por separado) mediante vínculo 1 a 1; transición en etapas con verificación de totales.
6. **Apertura**: facturas pendientes, bancos, cajas y valores importados se contabilizan **dentro** del asiento de apertura (contrapartida única), no como asientos propios.
7. **Diario, mayor y balance de comprobación** incluidos en esta Fase 0.
8. **Rentabilidad**: tres vistas separadas (comprometido, real, financiero); la actual queda intacta hasta validar la nueva.
9. **Migración**: dos cierres mensuales consecutivos conciliados, salvo criterio alternativo justificado y firmado por el contador.
10. **Pendiente con contador**: cheques propios diferidos, e-cheqs emitidos, pagos en dólares, diferencias de cambio y operaciones abiertas a la fecha de corte.

## B. Estado verificado antes de la Fase 0

- Datos contables: 0 comprobantes, 0 asientos, 0 pagos, 0 terceros; 79 cuentas.
- Políticas: contador puede editar y borrar asientos y líneas; sin control de partida doble.
- Numeración de asientos con secuencia global (sin ejercicio).
- Líneas de asiento: si se borra una cuenta, la línea queda sin cuenta (`ON DELETE SET NULL`).
- Usan estas tablas solo el módulo Contabilidad (`useContabilidad.ts` y sus pestañas) y las funciones `contab_generar_asiento_cbte` / `contab_generar_asiento_pago`.

## C. Migraciones propuestas (en orden, todas aditivas)

**M1 – Roles**
- Agregar valores `tesorero` y `aprobador_pagos` a `app_role` (sin uso aún; se asignan en fases siguientes).
- Función `contab_puede(_accion text)` SECURITY DEFINER que centraliza permisos: leer (admin, contador), registrar (admin, contador), confirmar/revertir (admin, contador), cerrar períodos y configurar (admin).

**M2 – Ejercicios y períodos**
- `contab_ejercicios` (nombre, desde, hasta, estado abierto/cerrado; sin superposición vía exclusión de rangos).
- `contab_periodos` (ejercicio, año, mes, desde, hasta, estado abierto/cerrado, cerrado_por, cerrado_at); único por ejercicio+año+mes.
- Función `contab_periodo_de(fecha)` que devuelve el período abierto o falla.

**M3 – Cuentas por función**
- `contab_cuentas_config` (clave única: deudores, proveedores, iva_cf, iva_df, percepciones, ventas, compras, caja, banco, resultado_ejercicio…) → cuenta imputable.
- Precarga con los códigos que hoy están fijos en las funciones (mismo resultado que hoy).

**M4 – Asientos endurecidos** (columnas nuevas nullable o con default)
- `contab_asientos`: `ejercicio_id`, `periodo_id`, `numero_ejercicio`, `estado` (borrador/confirmado/revertido, default borrador), `origen_tipo`, `origen_id`, `evento` (default 'alta'), `reversa_de`, `revertido_por`, `confirmado_at`, `confirmado_por`, `version` (default 1).
- Índice único parcial `(origen_tipo, origen_id, evento)` donde estado ≠ revertido y origen no nulo.
- Índice único `(ejercicio_id, numero_ejercicio)`.
- Numeración correlativa por ejercicio asignada al confirmar, con bloqueo de fila del ejercicio (sin huecos por concurrencia).
- `contab_asiento_lineas`: CHECK debe ≥ 0, haber ≥ 0, no ambos > 0, al menos uno > 0; cuenta obligatoria al confirmar; FK a cuenta cambia a `RESTRICT` (no se puede borrar una cuenta con movimientos).
- Triggers:
  - Bloquear UPDATE/DELETE de asientos y líneas confirmados o revertidos (solo se permite marcar `revertido_por` desde la función de reversa).
  - Rechazar asientos en período cerrado o fecha sin período.
  - Al confirmar: Σdebe = Σhaber > 0, todas las cuentas imputables y activas.
- La columna `comprobante_id` / `pago_id` existentes se mantienen y se completan también en `origen_*`.

**M5 – Funciones transaccionales**
- `contab_guardar_asiento_manual(cabecera jsonb, lineas jsonb, id uuid)`: crea/edita borrador en una sola transacción.
- `contab_confirmar_asiento(id, version)`: valida, numera y confirma; control optimista por `version`.
- `contab_revertir_asiento(id, motivo)`: crea contraasiento confirmado (evento 'reversa'), marca el original como revertido.
- `contab_guardar_comprobante(cbte jsonb, items jsonb, id uuid)`: reemplaza el guardado en varios pasos; valida duplicado (tercero+tipo+PV+número) y que esté en borrador.
- `contab_confirmar_comprobante(id)`: genera y confirma el asiento en la misma transacción (reescritura de `contab_generar_asiento_cbte` usando cuentas por función).
- `contab_anular_comprobante(id, motivo)`: revierte su asiento y marca anulado.
- `contab_registrar_pago(pago jsonb, request_id uuid)`: inserta pago + asiento + estado del comprobante en una transacción; `request_id` único evita doble envío; bloquea la fila del comprobante y no permite superar su saldo.
- `contab_cerrar_periodo(id)` / `contab_reabrir_periodo(id, motivo)` (solo admin, auditado).
- Las funciones viejas se mantienen pero pasan a llamar a las nuevas (compatibilidad).
- Todas: verificación de rol al inicio, `search_path` fijo, `REVOKE EXECUTE ... FROM public, anon`, `GRANT` solo a authenticated.

**M6 – Auditoría**
- `contab_auditoria` (tabla, registro, operación, antes, después, usuario, fecha) por trigger en todas las tablas `contab_*`; solo inserción vía trigger, lectura admin/contador, sin UPDATE/DELETE para nadie.

**M7 – Reportes de validación**
- Vistas (security invoker): `contab_v_diario`, `contab_v_mayor` (con saldo acumulado), `contab_v_balance_comprobacion` (sumas y saldos por cuenta y período), `contab_v_controles` (asientos descuadrados, líneas sin cuenta, asientos fuera de período: debe estar siempre vacía).

**M8 – Políticas RLS (reemplazo de las actuales)**
- SELECT: `contab_puede('leer')`.
- INSERT/UPDATE/DELETE directo sobre asientos y líneas: **ninguno** para usuarios; solo vía funciones. Comprobantes, ítems y pagos: escritura directa solo en borrador; confirmación solo por función.
- Configuración, ejercicios, períodos, cuentas por función: solo admin.
- GRANT a authenticated y service_role en cada tabla nueva; sin acceso anónimo.

## D. Cambios en la aplicación (solo módulo Contabilidad)

- `useContabilidad.ts`: guardar comprobante, confirmar, anular y registrar pago llaman a las funciones nuevas (una llamada cada uno).
- Pestaña Asientos: alta de asiento manual, confirmar, revertir; estado visible.
- Nuevas vistas: Libro diario, Mayor, Balance de comprobación, Controles; exportables a Excel.
- Configuración: ejercicios/períodos (abrir, cerrar, reabrir) y cuentas por función.
- No se toca ningún otro módulo ni el menú de otros roles.

## E. Dependencias con módulos actuales

- Lee: `obras`, `maquinarias` (solo referencias en líneas), `user_roles` (permisos).
- Ninguna tabla operativa recibe columnas, triggers ni políticas nuevas.
- `contab_terceros` se mantiene tal cual en esta fase (la unificación con proveedores/clientes es Fase 1).

## F. Verificación de que no se altera nada operativo

- Antes: foto de conteos y suma de control (hash por tabla) de todas las tablas no contables.
- Después de cada migración: misma foto; debe ser idéntica.
- Revisión automática de que ninguna migración nombra tablas fuera de `contab_*` ni el enum de roles.
- Prueba en pantalla de Remitos, Combustible, Obras/Rentabilidad y Partes con usuario admin y remitero: sin cambios.

## G. Pruebas automáticas

- SQL contra la base (en transacción con ROLLBACK, sin dejar datos):
  - Asiento descuadrado no confirma; línea con debe y haber a la vez falla.
  - Editar/borrar asiento confirmado falla; reversa deja saldo cero en mayor.
  - Asiento en período cerrado o sin período falla.
  - Doble contabilización del mismo origen y evento falla; reversa + nuevo alta permitido.
  - Comprobante duplicado falla.
  - Pago con mismo `request_id` dos veces crea uno solo; pago mayor al saldo falla; dos pagos simultáneos no superan el saldo.
  - Usuario sin rol: no lee ni escribe; contador no cierra períodos; nadie escribe asientos directo.
  - Auditoría registra cada cambio y no se puede borrar.
  - Balance de comprobación: Σdebe = Σhaber siempre; vista de controles vacía.
- Vitest: armado de líneas y validación de balance en el formulario.

## H. Recuperación ante errores

- Respaldo completo (función de backup existente + exportación de `contab_*`) inmediatamente antes de aplicar.
- Cada migración es una transacción: si falla, no queda nada aplicado.
- Al ser aditivas y con tablas contables vacías, la vuelta atrás es: restaurar políticas anteriores (script preparado y probado) y dejar sin usar las tablas nuevas; la app anterior sigue funcionando porque no se borra ninguna columna.
- Bandera en la app para volver al guardado anterior si una función nueva falla en producción.
- Prueba del procedimiento de vuelta atrás antes de publicar.

## I. Criterio de aprobación de la Fase 0

- Todas las pruebas verdes; vista de controles vacía.
- Fotos de tablas operativas idénticas antes/después.
- Un ciclo completo probado en pantalla: abrir ejercicio → comprobante de compra → confirmar → pago parcial → anular → revertir → ver diario, mayor y balance cuadrados → cerrar mes → intento de asiento en mes cerrado rechazado.
- Validación del contador sobre diario y balance de prueba.

## Detalles técnicos

- Orden de aplicación: M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 (las políticas al final, para no cortar el acceso mientras se crean las funciones).
- Exclusión de rangos de ejercicios con `btree_gist` si está disponible; si no, trigger de validación.
- Agregar valores a `app_role` va en migración propia (no puede usarse en la misma transacción).
- Montos `numeric(18,2)`; sin cambiar tipos de columnas existentes.
