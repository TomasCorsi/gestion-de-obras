# Fase 1C corregida — Imputaciones analíticas en comprobantes (diseño + SQL exacto, sin ejecutar)

Se mantiene la arquitectura aprobada. Esta versión corrige solo los cinco puntos y las verificaciones pedidas. Nada se aplica hasta tu aprobación. Base única: Lovable Cloud actual. No se tocan obras, máquinas, combustible, stock, remitos, certificados ni rentabilidad. 1D no se inicia.

## Estado verificado (lectura)
- `contab_generar_asiento_cbte(_cbte_id)` está definida solo en una migración antigua (`supabase/migrations/20260624174603…`), es SECURITY DEFINER, y la llama únicamente `useContabilidad.ts` (`rpc("contab_generar_asiento_cbte", {_cbte_id})`). Firma y retorno (`uuid`) se conservan.
- 1B usa la columna real `contab_plan_cuentas.requiere_analitica`; el control de cobertura ya existe al confirmar (trigger de 0029). 1C lo reutiliza, no crea otro nombre.
- `contab_imputaciones_analiticas` exige `importe > 0`; `signo = -1` solo para `tipo_movimiento='reversa'` creado por trigger con permiso transaccional. 1C no relaja esto.
- Antes de reescribir, paso 0 de la migración: verificar con consulta de solo lectura dependencias (`pg_depend`), GRANTs actuales de la función y que no existan comprobantes con asiento (hoy 0). Si aparece algo inesperado, se detiene y se informa.

## 1. Vínculos operativos — tabla independiente

Se elimina `origen_tipo/origen_id` del ítem. Nueva tabla `contab_vinculos_operativos`:

```sql
CREATE TABLE public.contab_vinculos_operativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.contab_comprobantes(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES public.contab_comprobante_items(id) ON DELETE RESTRICT,
  doc_tipo text NOT NULL CHECK (doc_tipo IN (
    'orden_compra','orden_compra_item','mantenimiento','carga_combustible',
    'movimiento_stock','certificado','remito_maquinas','remito_materiales','otro_gasto')),
  doc_id uuid NOT NULL,
  importe_vinculado numeric(18,2) NOT NULL CHECK (importe_vinculado > 0),
  cantidad_vinculada numeric(18,4),
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','anulado')),
  anulado_at timestamptz, anulado_motivo text,
  nota text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contab_vinc_uq ON public.contab_vinculos_operativos
  (comprobante_id, COALESCE(item_id,'00000000-0000-0000-0000-000000000000'::uuid), doc_tipo, doc_id)
  WHERE estado = 'vigente';
CREATE INDEX contab_vinc_doc_idx ON public.contab_vinculos_operativos (doc_tipo, doc_id) WHERE estado='vigente';
GRANT SELECT, INSERT, UPDATE ON public.contab_vinculos_operativos TO authenticated;
GRANT ALL ON public.contab_vinculos_operativos TO service_role;
ALTER TABLE public.contab_vinculos_operativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY vo_sel ON public.contab_vinculos_operativos FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY vo_ins ON public.contab_vinculos_operativos FOR INSERT TO authenticated WITH CHECK (public.contab_puede('cargar'));
CREATE POLICY vo_upd ON public.contab_vinculos_operativos FOR UPDATE TO authenticated USING (public.contab_puede('cargar')) WITH CHECK (public.contab_puede('cargar'));
-- sin DELETE: los vínculos se anulan, no se borran
```
- Permite N documentos por factura y N facturas por documento (facturación parcial).
- Trigger `contab_trg_vinculo_valida` (SECURITY DEFINER, solo lectura sobre tablas operativas): verifica que `doc_id` exista en la tabla de `doc_tipo`; calcula el **importe operativo de referencia** (OC: subtotal neto; ítem OC: cantidad × precio; carga: litros × precio; mantenimiento: costo; certificado: total neto; otros: sin tope) y rechaza si Σ vínculos vigentes de ese documento (solo comprobantes no anulados, NC restan) supera la referencia + tolerancia $1. `pg_advisory_xact_lock(hashtext(doc_tipo||doc_id))` serializa vínculos concurrentes al mismo documento.
- Bloqueo: no se puede agregar/editar/anular un vínculo si el comprobante tiene asiento confirmado (salvo la anulación automática al anular el comprobante).
- `contab_anular_comprobante` marca sus vínculos `anulado` (con motivo); el saldo pendiente del documento vuelve a liberarse.
- Vista `contab_vinculos_saldos` (security_invoker): por documento → importe operativo, facturado vigente, saldo pendiente, cantidad de comprobantes. Nunca escribe en tablas operativas.

## 2. Facturación parcial
- Sin regla de "una sola vez". OC, certificado, carga o mantenimiento pueden facturarse en varios comprobantes hasta su saldo.
- OC ≠ ejecución: la OC es compromiso; el vínculo a la recepción/ejecución real (`movimiento_stock`, `mantenimiento`, `carga_combustible`) es independiente. Una misma factura puede vincular OC **y** su recepción; el control de saldo es por documento, no cruzado, y la vista marca "OC facturada sin recepción vinculada" como alerta informativa.

## 3. Notas de crédito
- Compatible con 1B sin tocar sus restricciones: la NC es comprobante propio con su propio asiento. Sus líneas económicas van al lado contrario (compra: Haber gasto; venta: Debe ingreso). Sus imputaciones son `tipo_movimiento='original'`, `signo=1`, `importe>0`, sobre esa línea. **El efecto económico negativo surge del lado de la línea**, no de un signo negativo. Las reversas técnicas siguen siendo solo `signo=-1`/`reversa`.
- Regla de lectura analítica documentada (para 1D): efecto = importe × signo × (gasto: +1 si línea al Debe, −1 si al Haber; ingreso: inverso).
- Alcance 1C: NC sin factura de origen ni vínculos operativos queda **habilitada** solo con imputación manual por ítem. NC vinculada a factura de origen (control de que no exceda lo facturado por ítem/subcentro) queda **pendiente**; hasta entonces, los tipos `NC_*`/`NC_CPA` no pueden crear vínculos operativos (trigger lo rechaza), evitando saldos incorrectos.

## 4. Fuente única de imputaciones
- Nueva tabla `contab_item_repartos` (fuente para asientos de comprobante):
```sql
CREATE TABLE public.contab_item_repartos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.contab_comprobante_items(id) ON DELETE CASCADE,
  subcentro_id uuid NOT NULL REFERENCES public.contab_subcentros_costo(id) ON DELETE RESTRICT,
  modo text NOT NULL CHECK (modo IN ('importe','porcentaje')),
  porcentaje numeric(9,6) CHECK (porcentaje > 0 AND porcentaje <= 100),
  importe numeric(18,2) NOT NULL CHECK (importe > 0),
  obra_id uuid REFERENCES public.obras(id) ON DELETE RESTRICT,
  obra_atribucion text CHECK (obra_atribucion IN ('economica','informativa')),
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE RESTRICT,
  nota text, created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ir_modo CHECK ((modo='porcentaje') = (porcentaje IS NOT NULL)),
  CONSTRAINT ir_obra_atrib CHECK ((obra_id IS NULL) = (obra_atribucion IS NULL)),
  CONSTRAINT ir_uq UNIQUE (item_id, subcentro_id)
);
-- GRANT SELECT/INSERT/UPDATE/DELETE authenticated, ALL service_role; RLS ver/cargar como vínculos
```
- `contab_comprobante_items` agrega `concepto_fiscal text NOT NULL DEFAULT 'neto' CHECK (IN ('neto','no_gravado','exento','perc_iva','perc_iibb','perc_otras','retencion','otro_fiscal'))`. Solo neto/no_gravado/exento admiten repartos (trigger). IVA sigue en columnas del comprobante y nunca se imputa.
- Trigger de repartos: Σ ≤ neto del ítem; subcentro activo/vigente a la fecha; redondeo de % lo resuelve `contab_normalizar_repartos(item_id)` (último reparto absorbe diferencia).
- `contab_imputaciones_analiticas` agrega `reparto_id uuid REFERENCES contab_item_repartos(id) ON DELETE SET NULL` + `UNIQUE (linea_id, reparto_id) WHERE reparto_id IS NOT NULL`.
- **Bloqueo de edición en el asiento**: trigger en imputaciones rechaza INSERT/UPDATE/DELETE manual cuando el asiento tiene `comprobante_id` y la operación no viene de la función generadora (marca `set_config('contab.gen_cbte', cbte_id, true)` dentro de la transacción). Asientos manuales conservan su editor actual.
- **Regeneración** (`contab_generar_asiento_cbte`, misma firma): `SELECT … FOR UPDATE` del comprobante; si tiene asiento confirmado → error; si tiene borrador → borra sus líneas (cascade a imputaciones) y lo reconstruye en la misma transacción; si no tiene → crea. Una línea por ítem económico, con `item_id` guardado en la línea (columna nueva `contab_asiento_lineas.item_id uuid NULL`) para trazabilidad. Ejecutarla dos veces da el mismo resultado.
- Cuentas: ítem → `cuenta_id` obligatoria; IVA/percepciones → claves de `contab_cuentas_config`; contrapartida → cuenta específica de la ficha (`contab_terceros`) → fallback general `proveedores`/`deudores` → error explícito si falta. Cada línea anota la regla usada.
- Se mantienen `REVOKE … FROM PUBLIC, anon` y `GRANT EXECUTE … TO authenticated` con chequeo interno `contab_puede('cargar')`.

## 5. Inmutabilidad y separación de costos
- Trigger `contab_trg_cbte_inmutable` en comprobantes, ítems, repartos y vínculos: si el asiento del comprobante está confirmado, solo se permite la anulación por función.
- **Sin suma automática** de facturas a costos operativos. Ningún reporte existente lee repartos ni vínculos en 1C. Los costos operativos (mantenimientos, combustible, OC, certificados) siguen siendo la única fuente de rentabilidad; la conciliación explícita queda para 1D.

## 6. Pantallas (sin cambios en módulos operativos)
- Comprobante: por ítem, concepto fiscal y botón "Repartir" (importe/%, restante en vivo, "Completar 100 %"); pestaña "Vínculos" con buscador por tipo de documento, importe a vincular y saldo pendiente.
- Asiento de comprobante: imputaciones en solo lectura con aviso "editar desde el comprobante" y botón "Regenerar borrador".
- Panel "Saldos de vínculos" en Contabilidad.

## 7. Pruebas (transacciones con ROLLBACK, sin concurrencia agresiva en producción)
- Reparto > neto, en IVA/percepción, suma de % y redondeo 3 × 33,33 % → rechazo/ajuste.
- Regenerar borrador 2 veces → mismas líneas e imputaciones, sin duplicados.
- Editar imputación de asiento de comprobante directamente → rechazo; asiento manual → permitido.
- Confirmar con cuenta `requiere_analitica` sin cubrir → rechazo. Editar ítem/reparto/vínculo tras confirmar → rechazo.
- Facturación parcial: OC en 2 facturas hasta saldo; tercera excede → rechazo; anular una libera saldo.
- Vínculo duplicado mismo comprobante/documento → rechazo; documento inexistente → rechazo; NC con vínculo → rechazo.
- NC con imputación manual → efecto económico negativo por lado de línea, sin signo −1.
- Anulación → reversa espejo de 1B intacta.
- Permisos: admin/contador cargan; maquinista sin acceso. Concurrencia: solo verificación de que la función toma el lock (sin pruebas de carga).
- Conteos operativos idénticos antes/después. Vitest para `src/lib/repartos.ts`.

## 8. Orden de migraciones (al aprobar)
1. `contab_1c_a_repartos_vinculos`: columnas nuevas (items.concepto_fiscal, lineas.item_id, imputaciones.reparto_id), tablas `contab_item_repartos` y `contab_vinculos_operativos` (CREATE → GRANT → RLS → policies), triggers de validación, saldo, inmutabilidad, vista de saldos.
2. `contab_1c_b_generador`: verificación de dependencias, reescritura de `contab_generar_asiento_cbte` y ajuste de `contab_anular_comprobante` (anula vínculos), GRANTs.
3. App: hooks y paneles; luego pruebas.

## Pendientes declarados
- NC vinculada a factura de origen (control por ítem/subcentro).
- Cuentas con `requiere_analitica`, cuentas de percepciones/retenciones, fecha de ejercicio y de corte (contador).
- Pruebas de concurrencia real y sesión real de contador.
