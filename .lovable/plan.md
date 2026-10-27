# Fase 1C — Imputaciones analíticas en compras, ventas y asientos (diseño, sin migrar)

Alcance: comprobantes de compra/venta → ítems con reparto analítico → asiento borrador con imputaciones trasladadas → confirmación inmutable → anulación/reversa compensadora. No se toca rentabilidad (1D), no se importa CONTAD, no se crean subcentros automáticamente, no se modifican registros operativos.

## 1. Modelo de datos (cambios aditivos)

### 1.1 `contab_comprobante_items` (existe: cuenta_id, neto, iva, alicuota_iva, obra_id, maquinaria_id)
Agregar:
- `concepto_fiscal text NOT NULL DEFAULT 'neto'` — `neto | no_gravado | exento | perc_iva | perc_iibb | perc_otras | otro_fiscal`. Solo `neto/no_gravado/exento` son económicos e imputables.
- `origen_tipo text NULL` + `origen_id uuid NULL` — vínculo opcional a documento operativo: `orden_compra | orden_compra_item | mantenimiento | carga_combustible | movimiento_stock | certificado | remito_maquinas | remito_materiales`.
- `importe_economico numeric GENERATED` = neto si concepto económico, si no 0.
- Las columnas `obra_id/maquinaria_id` quedan como dato informativo (DEPRECATED como fuente analítica; el reparto manda).

### 1.2 Nueva `contab_item_repartos` (reparto en borrador, editable)
`id, item_id FK, subcentro_id FK, modo ('importe'|'porcentaje'), porcentaje numeric(9,6) NULL, importe numeric(18,2) NOT NULL, obra_id NULL, maquinaria_id NULL, obra_atribucion NULL, nota, created_by, timestamps`.
- Si modo porcentaje: importe se calcula = round(item.importe_economico * pct/100, 2); el último reparto absorbe la diferencia de redondeo (función, no cliente).
- Trigger: Σ importes del ítem ≤ importe_economico; prohibido en conceptos fiscales; subcentro activo y vigente a la fecha del comprobante; coherencia obra/máquina con el subcentro (reglas 1B).
- Bloqueo: editable solo si el comprobante no tiene asiento o su asiento está en borrador. Si está confirmado → error.
- RLS/GRANT como `contab_comprobante_items` (`contab_puede('ver')` lectura, `contab_puede('cargar')` escritura), auditoría con `contab_trg_auditar`.

### 1.3 `contab_imputaciones_analiticas` (existe, de 1B)
Agregar `reparto_id uuid NULL` (trazabilidad) y `item_id uuid NULL`. Índice único parcial `(linea_id, reparto_id)` para impedir doble traslado.

### 1.4 `contab_terceros`: ya tiene cuentas de cliente/proveedor (1A). Sin cambios.

## 2. Generación de asientos (`contab_generar_asiento_cbte`, reescritura compatible)

```text
Compra:  Debe  cuenta de gasto del ítem (una línea por ítem económico)
         Debe  IVA crédito fiscal (por alícuota)
         Debe  percepciones (cuenta config por concepto)
         Haber cuenta proveedor de la ficha  -> fallback: config 'proveedores'
Venta:   espejo (Haber ingreso, Haber IVA DF, Debe cuenta deudor -> fallback 'deudores')
```
- Una línea de asiento por ítem económico (no agrupar), para que sus repartos se trasladen 1:1 a esa línea → `contab_imputaciones_analiticas` con snapshots de centro/subcentro.
- Reglas de cuenta, en orden explícito: ítem.cuenta_id → (no hay default de ítem: error "ítem sin cuenta") ; tercero: cuenta específica de la ficha → cuenta general configurada → error si falta config. Se registra en la línea qué regla se aplicó (`nota`).
- Parte no repartida de un ítem: queda sin imputar (no se inventa subcentro). Si la cuenta está marcada `exige_imputacion` (1B), el asiento no puede **confirmarse** hasta cubrir 100 %.
- Regenerar mientras borrador: la función borra líneas/imputaciones del borrador y las reconstruye desde ítems+repartos (idempotente; nunca suma de nuevo). Bloqueo `SELECT … FOR UPDATE` sobre el comprobante para concurrencia.
- IVA, percepciones y retenciones jamás reciben imputación analítica (validado por trigger existente de 1B + concepto_fiscal).

## 3. Confirmación, anulación y reversa
- Confirmar: sin cambios a `contab_confirmar_asiento`; al confirmar, los repartos y las imputaciones quedan bloqueados (triggers).
- Anular comprobante con asiento confirmado: `contab_anular_comprobante` llama a `contab_revertir_asiento`; el trigger de 1B (`contab_trg_reversa_imputaciones`, con permiso por transacción) crea imputaciones espejo con `signo = -1` y `origen_imputacion_id`. Historial intacto.
- Notas de crédito: comprobante propio con sus repartos en signo opuesto, opcionalmente vinculados a la factura (`origen_tipo='comprobante'`).

## 4. Integración con módulos y anti-duplicación

Principio: **cada costo tiene una sola "fuente económica" por reporte**. Operaciones sigue siendo la fuente de rentabilidad actual (sin cambios en 1C); contabilidad registra el mismo hecho con vínculo explícito, y el vínculo es lo que permite a 1D descontar el doble.

| Módulo operativo | Relación con factura | Regla anti-duplicado |
|---|---|---|
| Órdenes de compra | ítem → `orden_compra`/`orden_compra_item` | Una OC (o ítem de OC) solo puede estar vinculada por importe ≤ su subtotal neto; índice + trigger de saldo vinculable |
| Mantenimientos (costo) | ítem → `mantenimiento` | Un mantenimiento vinculado a una factura queda marcado "facturado" vía vista, no se edita el registro |
| Combustible | factura del proveedor de combustible → varias cargas | Vínculo N cargas ↔ ítem; una carga solo en un ítem; ingresos de cisternas no son costo (siguen excluidos) |
| Stock | compra → `movimiento_stock` entrada | El costo va a stock (activo), no a obra; la imputación a obra ocurre al consumo (fuera de 1C) |
| Certificados (ventas) | factura de venta → `certificado` | Un certificado se factura una vez (unicidad por certificado salvo NC) |
| Remitos máquinas/materiales | ítem → remito | Solo trazabilidad |

Nueva vista `contab_vinculos_operativos` (security_invoker) que muestra por documento operativo: importe operativo, importe facturado vinculado, diferencia. Sin escribir en tablas operativas.

Separación de costos (para 1D, ya modelada en `naturaleza`/`obra_atribucion` de 1B):
- **Directo de obra**: subcentro de obra.
- **Maquinaria atribuida a obra**: subcentro de máquina con `obra_id` + `obra_atribucion`.
- **Empresarial total**: todo, incluidos centros de estructura; nunca se suman maquinaria-atribuida y maquinaria-propia en el mismo total de obra.

## 5. Pantallas
- `ComprobanteDialog`: por ítem, selector de concepto fiscal, cuenta, y botón "Repartir" → panel con filas subcentro (buscador, sugeridos de 1B sin crear), modo importe/%, total restante en vivo, botón "Completar 100 %". Vínculo opcional a OC/mantenimiento/carga/certificado con buscador.
- Detalle de asiento: columna "Imputación" por línea (subcentros y %), indicador de no imputado.
- Panel "Vínculos operativos" en Contabilidad: documentos con diferencia o doble vínculo.
- Todo en solo lectura una vez confirmado.

## 6. Validaciones y pruebas (en transacción con ROLLBACK, base actual)
- Reparto > importe, % ≠ suma, redondeo de 3 × 33,33 %, reparto en IVA → rechazos.
- Regenerar borrador dos veces → mismo total de imputaciones.
- Confirmar con cuenta que exige imputación incompleta → rechazo.
- Editar reparto con asiento confirmado → rechazo.
- Anulación → espejo exacto, suma neta 0 por subcentro.
- Cuenta de ficha vs fallback general vs config faltante.
- Doble vínculo a la misma OC/carga/certificado → rechazo; dos sesiones concurrentes generando el mismo asiento → una espera (FOR UPDATE).
- Permisos: admin/contador cargan; maquinista sin acceso.
- Conteos operativos antes/después idénticos.
- Tests Vitest para cálculo de reparto (`src/lib/repartos.ts`).

## 7. Detalles técnicos / orden de ejecución (tras aprobación)
1. Migración 1C-a: columnas en ítems, `contab_item_repartos` (CREATE → GRANT → RLS → policies), triggers de validación/bloqueo, columnas en imputaciones, índices.
2. Migración 1C-b: funciones `contab_recalcular_repartos(item)`, reescritura de `contab_generar_asiento_cbte` y ajuste de `contab_anular_comprobante`, vista de vínculos.
3. App: hooks `useItemRepartos`, `RepartoItemPanel`, cambios en `ComprobanteDialog`, `AsientosTab`, panel de vínculos.
4. Pruebas transaccionales + Vitest + Playwright admin sin persistir datos.

## Pendientes a confirmar con el contador
- Cuentas que exigen imputación obligatoria.
- Cuentas de percepciones/retenciones por concepto.
- Si las compras de stock se imputan a obra al consumo (propuesto) o a la compra.
- Fechas del ejercicio y fecha de corte (sigue sin crearse 2026).
