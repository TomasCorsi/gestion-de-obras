# Fase 1C — SQL concreto corregido (sin ejecutar)

Solo resuelve los cuatro puntos pedidos. La arquitectura funcional aprobada no cambia. Base única Lovable Cloud; sin CONTAD; sin tocar módulos operativos, rentabilidad ni subcentros; 1D no se inicia.

## Hechos verificados en la base actual (solo lectura)
- `contab_generar_asiento_cbte(uuid) → uuid`: SECURITY DEFINER, autoriza con `has_role admin|contador`, usa cuentas **por código fijo** (no `contab_cuentas_config`), no trata NC (una NC hoy sumaría costo/ingreso), y si ya hay asiento lo devuelve sin regenerar. Única llamada: `useContabilidad.ts`.
- `contab_anular_comprobante`: descarta borrador o revierte confirmado vía `contab_revertir_asiento` (0B), que crea la reversa con el mismo `comprobante_id`; el trigger de 1B espeja imputaciones con permiso por transacción.
- 0B distingue escritura directa del usuario de escritura por función privilegiada con `contab_es_usuario_directo()` (`current_user IN ('authenticated','anon')`). Es identidad real de ejecución, no una variable de sesión manipulable. 1C usa este mismo mecanismo.
- `trg_contab_items_con_asiento` (0B) ya bloquea editar ítems y comprobantes con asiento borrador o confirmado.
- 1B: `requiere_analitica`, imputaciones `importe > 0`, `ajuste` rechazado, reversa solo con permiso; política de escritura `contab_puede_centros()` (admin/contador). `contab_puede` no tiene acción `cargar`: no se usa.
- `contab_cuentas_config` tiene: deudores, proveedores, ventas, compras, iva_cf, iva_df, percepciones. `contab_terceros` tiene `cuenta_deudores_id`/`cuenta_proveedores_id`.
- 0 comprobantes en la base: no hay datos que adaptar.

## Cómo quedan resueltos los cuatro puntos
1. **Seguridad del generador**: sin `set_config`. Un trigger rechaza toda escritura directa de usuario sobre imputaciones de asientos con comprobante; solo funciones SECURITY DEFINER (generador y reversa 1B) pueden escribirlas. Antes de confirmar, un trigger diferido compara imputaciones contra repartos y rechaza si difieren. Protecciones 1B intactas.
2. **Vínculos**: columna `clase` = `trazabilidad` (sin importe, no consume saldo, ilimitados) o `facturable` (importe, consume saldo). Control doble: Σ facturable por ítem ≤ neto del ítem, y Σ facturable por documento ≤ importe de referencia. En un ítem todos los vínculos facturables son del mismo tipo de documento (una recepción y su OC no cuentan dos veces). La cabecera de OC solo admite trazabilidad; lo facturable es por ítem de OC.
3. **NC**: el lado de la línea define el signo económico. Vista `contab_analitica_efecto` calcula el efecto solo por Debe/Haber (el `signo` es solo marca de reversa), así NC y reversas restan. Las NC no pueden tener vínculos operativos hasta implementar el vínculo controlado con la factura original (pendiente explícito).
4. **SQL completo** abajo, con verificaciones previas, respaldo automático de funciones y script de recuperación.

---

## Migración 1C-A `contab_1c_a_repartos_vinculos`

```sql
-- A0. Verificaciones previas: aborta todo si algo no coincide
DO $$
DECLARE v int;
BEGIN
  IF to_regprocedure('public.contab_generar_asiento_cbte(uuid)') IS NULL
     OR to_regprocedure('public.contab_anular_comprobante(uuid,text)') IS NULL
     OR to_regprocedure('public.contab_es_usuario_directo()') IS NULL
     OR to_regprocedure('public.contab_puede_centros()') IS NULL
     OR to_regprocedure('public.contab_trg_imputacion_guarda()') IS NULL THEN
    RAISE EXCEPTION '1C: faltan funciones de 0B/1B';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='contab_plan_cuentas' AND column_name='requiere_analitica') THEN
    RAISE EXCEPTION '1C: falta requiere_analitica (1B)';
  END IF;
  SELECT count(*) INTO v FROM public.contab_comprobantes;
  IF v > 0 THEN RAISE EXCEPTION '1C: hay % comprobantes; revisar antes de aplicar', v; END IF;
  SELECT count(*) INTO v FROM public.contab_cuentas_config
   WHERE clave IN ('deudores','proveedores','ventas','compras','iva_cf','iva_df','percepciones') AND cuenta_id IS NOT NULL;
  IF v <> 7 THEN RAISE EXCEPTION '1C: configuración de cuentas incompleta (%/7)', v; END IF;
END $$;

-- A1. Respaldo de definiciones actuales (para recuperación)
CREATE TABLE public.contab_respaldo_funciones (
  id bigserial PRIMARY KEY, fase text NOT NULL, nombre text NOT NULL,
  definicion text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.contab_respaldo_funciones TO service_role;
ALTER TABLE public.contab_respaldo_funciones ENABLE ROW LEVEL SECURITY;  -- sin políticas: solo service_role
INSERT INTO public.contab_respaldo_funciones (fase, nombre, definicion)
SELECT '1C', p.proname, pg_get_functiondef(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('contab_generar_asiento_cbte','contab_anular_comprobante');

-- A2. Columnas aditivas
ALTER TABLE public.contab_comprobante_items
  ADD COLUMN concepto_fiscal text NOT NULL DEFAULT 'neto'
  CHECK (concepto_fiscal IN ('neto','no_gravado','exento'));
COMMENT ON COLUMN public.contab_comprobante_items.concepto_fiscal IS
  'Solo conceptos económicos. IVA y percepciones van en columnas del comprobante; retenciones en pagos.';
COMMENT ON COLUMN public.contab_comprobante_items.obra_id IS 'Informativo; la fuente analítica es contab_item_repartos';
COMMENT ON COLUMN public.contab_comprobante_items.maquinaria_id IS 'Informativo; la fuente analítica es contab_item_repartos';

ALTER TABLE public.contab_asiento_lineas
  ADD COLUMN item_id uuid REFERENCES public.contab_comprobante_items(id) ON DELETE RESTRICT,
  ADD COLUMN regla_cuenta text CHECK (regla_cuenta IN ('item','ficha','general','config'));
CREATE INDEX contab_lineas_item_idx ON public.contab_asiento_lineas (item_id) WHERE item_id IS NOT NULL;

ALTER TABLE public.contab_imputaciones_analiticas
  ADD COLUMN reparto_id uuid,          -- sin FK: el reparto puede cambiar en borrador; la imputación conserva snapshot
  ADD COLUMN item_id uuid,
  ADD COLUMN origen_fuente text NOT NULL DEFAULT 'manual' CHECK (origen_fuente IN ('manual','comprobante'));
CREATE UNIQUE INDEX contab_imput_reparto_uq ON public.contab_imputaciones_analiticas (linea_id, reparto_id)
  WHERE reparto_id IS NOT NULL AND tipo_movimiento = 'original';

-- A3. Repartos por ítem (fuente única para asientos de comprobante)
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
  nota text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ir_modo CHECK ((modo = 'porcentaje') = (porcentaje IS NOT NULL)),
  CONSTRAINT ir_obra_atrib CHECK ((obra_id IS NULL) = (obra_atribucion IS NULL)),
  CONSTRAINT ir_uq UNIQUE (item_id, subcentro_id)
);
CREATE INDEX contab_repartos_sub_idx ON public.contab_item_repartos (subcentro_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_item_repartos TO authenticated;
GRANT ALL ON public.contab_item_repartos TO service_role;
ALTER TABLE public.contab_item_repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ir_select ON public.contab_item_repartos FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY ir_insert ON public.contab_item_repartos FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY ir_update ON public.contab_item_repartos FOR UPDATE TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY ir_delete ON public.contab_item_repartos FOR DELETE TO authenticated USING (public.contab_puede_centros());

CREATE OR REPLACE FUNCTION public.contab_trg_reparto_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_item record; v_c record; v_estado text; v_sub record; v_otros numeric(18,2);
BEGIN
  SELECT it.* INTO v_item FROM contab_comprobante_items it
   WHERE it.id = CASE WHEN TG_OP='DELETE' THEN OLD.item_id ELSE NEW.item_id END;
  SELECT c.* INTO v_c FROM contab_comprobantes c WHERE c.id = v_item.comprobante_id FOR UPDATE;
  IF v_c.estado = 'anulado' THEN RAISE EXCEPTION 'Comprobante anulado: el reparto no se modifica'; END IF;
  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM contab_asientos WHERE id = v_c.asiento_id;
    IF v_estado IS DISTINCT FROM 'borrador' THEN
      RAISE EXCEPTION 'El asiento del comprobante está %: el reparto es inmutable', v_estado;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NEW.item_id <> OLD.item_id THEN RAISE EXCEPTION 'El reparto no cambia de ítem'; END IF;

  SELECT s.*, c.activo AS c_activo, c.vigente_desde AS c_desde, c.vigente_hasta AS c_hasta
    INTO v_sub FROM contab_subcentros_costo s JOIN contab_centros_costo c ON c.id = s.centro_id
   WHERE s.id = NEW.subcentro_id;
  IF NOT (v_sub.activo AND v_sub.c_activo)
     OR v_c.fecha < GREATEST(v_sub.vigente_desde, v_sub.c_desde)
     OR v_c.fecha > LEAST(COALESCE(v_sub.vigente_hasta,'infinity'::date), COALESCE(v_sub.c_hasta,'infinity'::date)) THEN
    RAISE EXCEPTION 'Subcentro inactivo o fuera de vigencia para la fecha del comprobante';
  END IF;
  IF v_sub.obra_id IS NOT NULL THEN
    IF NEW.obra_id IS NOT NULL AND NEW.obra_id <> v_sub.obra_id THEN RAISE EXCEPTION 'La obra no coincide con el subcentro'; END IF;
    NEW.obra_id := v_sub.obra_id; NEW.obra_atribucion := 'economica';
  END IF;
  IF v_sub.maquinaria_id IS NOT NULL THEN
    IF NEW.maquinaria_id IS NOT NULL AND NEW.maquinaria_id <> v_sub.maquinaria_id THEN RAISE EXCEPTION 'La máquina no coincide con el subcentro'; END IF;
    NEW.maquinaria_id := v_sub.maquinaria_id;
  END IF;
  IF NEW.obra_id IS NOT NULL AND NEW.obra_atribucion IS NULL THEN NEW.obra_atribucion := 'informativa'; END IF;
  IF NEW.obra_id IS NULL THEN NEW.obra_atribucion := NULL; END IF;

  -- El usuario no fija el importe de un reparto porcentual; solo la normalización (función privilegiada) ajusta el redondeo
  IF NEW.modo = 'porcentaje' AND public.contab_es_usuario_directo() THEN
    NEW.importe := round(v_item.neto * NEW.porcentaje / 100, 2);
  END IF;
  IF NEW.modo = 'importe' THEN NEW.porcentaje := NULL; END IF;

  SELECT COALESCE(sum(importe),0) INTO v_otros FROM contab_item_repartos
   WHERE item_id = NEW.item_id AND id <> NEW.id;
  IF v_otros + NEW.importe > v_item.neto THEN
    RAISE EXCEPTION 'El reparto (%) supera el neto del ítem (%)', v_otros + NEW.importe, v_item.neto;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_reparto_guarda() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_reparto_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_item_repartos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_reparto_guarda();
CREATE TRIGGER contab_auditar_repartos AFTER INSERT OR UPDATE OR DELETE ON public.contab_item_repartos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

-- Normalización: recalcula porcentajes y absorbe el redondeo en el último reparto cuando suman 100 %
CREATE OR REPLACE FUNCTION public.contab_normalizar_repartos(_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_neto numeric(18,2); v_pct numeric; v_ult uuid; v_suma numeric(18,2);
BEGIN
  IF NOT public.contab_puede_centros() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT neto INTO v_neto FROM contab_comprobante_items WHERE id = _item_id FOR UPDATE;
  IF v_neto IS NULL THEN RAISE EXCEPTION 'Ítem inexistente'; END IF;
  UPDATE contab_item_repartos SET importe = round(v_neto * porcentaje / 100, 2)
   WHERE item_id = _item_id AND modo = 'porcentaje';
  SELECT COALESCE(sum(porcentaje),0) INTO v_pct FROM contab_item_repartos WHERE item_id=_item_id AND modo='porcentaje';
  IF abs(v_pct - 100) < 0.0001 AND NOT EXISTS (SELECT 1 FROM contab_item_repartos WHERE item_id=_item_id AND modo='importe') THEN
    SELECT id INTO v_ult FROM contab_item_repartos WHERE item_id=_item_id ORDER BY porcentaje DESC, created_at DESC, id DESC LIMIT 1;
    SELECT sum(importe) INTO v_suma FROM contab_item_repartos WHERE item_id=_item_id;
    UPDATE contab_item_repartos SET importe = importe + (v_neto - v_suma) WHERE id = v_ult;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_normalizar_repartos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_normalizar_repartos(uuid) TO authenticated;

-- A4. Vínculos operativos
CREATE TABLE public.contab_vinculos_operativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.contab_comprobantes(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES public.contab_comprobante_items(id) ON DELETE RESTRICT,
  clase text NOT NULL CHECK (clase IN ('trazabilidad','facturable')),
  doc_tipo text NOT NULL CHECK (doc_tipo IN ('orden_compra','orden_compra_item','mantenimiento','carga_combustible',
     'movimiento_stock','certificado','remito_maquinas','remito_materiales','otro_gasto')),
  doc_id uuid NOT NULL,
  importe_vinculado numeric(18,2),
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','anulado')),
  anulado_at timestamptz, anulado_motivo text, nota text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vo_clase CHECK (
       (clase = 'facturable'   AND item_id IS NOT NULL AND importe_vinculado > 0)
    OR (clase = 'trazabilidad' AND importe_vinculado IS NULL)),
  CONSTRAINT vo_oc_cabecera CHECK (doc_tipo <> 'orden_compra' OR clase = 'trazabilidad'),
  CONSTRAINT vo_anulado CHECK ((estado = 'anulado') = (anulado_at IS NOT NULL))
);
CREATE UNIQUE INDEX contab_vinc_uq ON public.contab_vinculos_operativos
  (comprobante_id, COALESCE(item_id,'00000000-0000-0000-0000-000000000000'::uuid), clase, doc_tipo, doc_id)
  WHERE estado = 'vigente';
CREATE INDEX contab_vinc_doc_idx ON public.contab_vinculos_operativos (doc_tipo, doc_id) WHERE estado = 'vigente';
GRANT SELECT, INSERT, UPDATE ON public.contab_vinculos_operativos TO authenticated;
GRANT ALL ON public.contab_vinculos_operativos TO service_role;
ALTER TABLE public.contab_vinculos_operativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY vo_select ON public.contab_vinculos_operativos FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY vo_insert ON public.contab_vinculos_operativos FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY vo_update ON public.contab_vinculos_operativos FOR UPDATE TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
-- sin DELETE: los vínculos se anulan, nunca se borran

-- Importe de referencia del documento operativo (solo lectura; NULL = sin importe propio)
CREATE OR REPLACE FUNCTION public.contab_doc_referencia(_tipo text, _id uuid, OUT existe boolean, OUT importe numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  existe := false; importe := NULL;
  CASE _tipo
    WHEN 'orden_compra'      THEN SELECT true, NULL::numeric INTO existe, importe FROM ordenes_compra WHERE id=_id;
    WHEN 'orden_compra_item' THEN SELECT true, subtotal INTO existe, importe FROM orden_compra_items WHERE id=_id;
    WHEN 'mantenimiento'     THEN SELECT true, costo_total INTO existe, importe FROM mantenimientos WHERE id=_id;
    WHEN 'carga_combustible' THEN SELECT true, NULL::numeric INTO existe, importe FROM cargas_combustible_repartidor WHERE id=_id;
    WHEN 'movimiento_stock'  THEN SELECT true, NULL::numeric INTO existe, importe FROM movimientos_stock WHERE id=_id;
    WHEN 'certificado'       THEN SELECT true, subtotal INTO existe, importe FROM certificados WHERE id=_id;
    WHEN 'remito_maquinas'   THEN SELECT true, cantidad*precio_unitario INTO existe, importe FROM remitos_maquinas WHERE id=_id;
    WHEN 'remito_materiales' THEN SELECT true, cantidad*precio_unitario INTO existe, importe FROM remitos_materiales WHERE id=_id;
    WHEN 'otro_gasto'        THEN SELECT true, monto INTO existe, importe FROM otros_gastos WHERE id=_id;
  END CASE;
  existe := COALESCE(existe,false);
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_doc_referencia(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_doc_referencia(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.contab_trg_vinculo_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_c record; v_estado text; v_item record; v_ref record; v_suma numeric(18,2); v_n int;
BEGIN
  SELECT c.* INTO v_c FROM contab_comprobantes c WHERE c.id = NEW.comprobante_id FOR UPDATE;
  IF v_c.asiento_id IS NOT NULL THEN SELECT estado INTO v_estado FROM contab_asientos WHERE id = v_c.asiento_id; END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.comprobante_id <> OLD.comprobante_id OR NEW.item_id IS DISTINCT FROM OLD.item_id OR NEW.clase <> OLD.clase
       OR NEW.doc_tipo <> OLD.doc_tipo OR NEW.doc_id <> OLD.doc_id
       OR NEW.importe_vinculado IS DISTINCT FROM OLD.importe_vinculado THEN
      RAISE EXCEPTION 'Un vínculo no se edita: anulalo y creá otro';
    END IF;
    IF OLD.estado = 'anulado' THEN RAISE EXCEPTION 'El vínculo ya está anulado'; END IF;
    -- usuario directo: solo puede anular mientras el asiento no esté confirmado; la anulación del comprobante la hace la función
    IF public.contab_es_usuario_directo() AND v_estado = 'confirmado' THEN
      RAISE EXCEPTION 'Asiento confirmado: el vínculo solo se anula anulando el comprobante';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- INSERT
  IF v_c.estado = 'anulado' THEN RAISE EXCEPTION 'Comprobante anulado'; END IF;
  IF v_estado = 'confirmado' THEN RAISE EXCEPTION 'Asiento confirmado: no se agregan vínculos'; END IF;
  IF v_c.tipo::text LIKE 'NC%' THEN
    RAISE EXCEPTION 'Las notas de crédito todavía no admiten vínculos operativos (pendiente: vínculo con factura original)';
  END IF;
  IF NEW.estado <> 'vigente' THEN RAISE EXCEPTION 'Un vínculo nace vigente'; END IF;
  IF (NEW.doc_tipo = 'certificado') <> v_c.es_venta THEN
    RAISE EXCEPTION 'Certificados solo en ventas; documentos de costo solo en compras';
  END IF;
  SELECT * INTO v_ref FROM public.contab_doc_referencia(NEW.doc_tipo, NEW.doc_id);
  IF NOT v_ref.existe THEN RAISE EXCEPTION 'Documento operativo inexistente (% %)', NEW.doc_tipo, NEW.doc_id; END IF;
  IF NEW.item_id IS NOT NULL THEN
    SELECT * INTO v_item FROM contab_comprobante_items WHERE id = NEW.item_id FOR UPDATE;
    IF v_item.comprobante_id IS DISTINCT FROM NEW.comprobante_id THEN RAISE EXCEPTION 'El ítem no pertenece al comprobante'; END IF;
  END IF;

  IF NEW.clase = 'facturable' THEN
    -- un tipo de documento facturable por ítem (evita OC-ítem + recepción contados dos veces)
    IF EXISTS (SELECT 1 FROM contab_vinculos_operativos
                WHERE item_id = NEW.item_id AND clase='facturable' AND estado='vigente' AND doc_tipo <> NEW.doc_tipo) THEN
      RAISE EXCEPTION 'El ítem ya tiene vínculos facturables de otro tipo; usá trazabilidad para el resto';
    END IF;
    -- tope por ítem
    SELECT COALESCE(sum(importe_vinculado),0) INTO v_suma FROM contab_vinculos_operativos
     WHERE item_id = NEW.item_id AND clase='facturable' AND estado='vigente';
    IF v_suma + NEW.importe_vinculado > v_item.neto THEN
      RAISE EXCEPTION 'Vinculado por ítem (%) supera su neto (%)', v_suma + NEW.importe_vinculado, v_item.neto;
    END IF;
    -- tope por documento (serializado por documento)
    PERFORM pg_advisory_xact_lock(hashtext('contab_vinc:'||NEW.doc_tipo||':'||NEW.doc_id::text));
    IF v_ref.importe IS NULL THEN
      SELECT count(*) INTO v_n FROM contab_vinculos_operativos v JOIN contab_comprobantes c ON c.id=v.comprobante_id
       WHERE v.doc_tipo=NEW.doc_tipo AND v.doc_id=NEW.doc_id AND v.clase='facturable' AND v.estado='vigente' AND c.estado<>'anulado';
      IF v_n > 0 THEN RAISE EXCEPTION 'Este documento ya está facturado (sin importe propio para facturación parcial)'; END IF;
    ELSE
      SELECT COALESCE(sum(v.importe_vinculado),0) INTO v_suma
        FROM contab_vinculos_operativos v JOIN contab_comprobantes c ON c.id=v.comprobante_id
       WHERE v.doc_tipo=NEW.doc_tipo AND v.doc_id=NEW.doc_id AND v.clase='facturable' AND v.estado='vigente' AND c.estado<>'anulado';
      IF v_suma + NEW.importe_vinculado > v_ref.importe + 0.01 THEN
        RAISE EXCEPTION 'Saldo facturable insuficiente: referencia %, ya vinculado %, nuevo %', v_ref.importe, v_suma, NEW.importe_vinculado;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_vinculo_guarda() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_vinculo_guarda BEFORE INSERT OR UPDATE ON public.contab_vinculos_operativos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_vinculo_guarda();
CREATE TRIGGER contab_auditar_vinculos AFTER INSERT OR UPDATE ON public.contab_vinculos_operativos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

CREATE VIEW public.contab_vinculos_saldos WITH (security_invoker = true) AS
SELECT v.doc_tipo, v.doc_id,
       (public.contab_doc_referencia(v.doc_tipo, v.doc_id)).importe AS importe_referencia,
       sum(v.importe_vinculado) FILTER (WHERE v.clase='facturable') AS facturado,
       (public.contab_doc_referencia(v.doc_tipo, v.doc_id)).importe
         - COALESCE(sum(v.importe_vinculado) FILTER (WHERE v.clase='facturable'),0) AS saldo_pendiente,
       count(DISTINCT v.comprobante_id) AS comprobantes,
       count(*) FILTER (WHERE v.clase='trazabilidad') AS vinculos_trazabilidad
  FROM public.contab_vinculos_operativos v JOIN public.contab_comprobantes c ON c.id = v.comprobante_id
 WHERE v.estado = 'vigente' AND c.estado <> 'anulado'
 GROUP BY v.doc_tipo, v.doc_id;
GRANT SELECT ON public.contab_vinculos_saldos TO authenticated;

-- A5. Imputaciones de comprobante: sin escritura directa de usuarios
CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_fuente() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $$
DECLARE v_cbte uuid;
BEGIN
  SELECT a.comprobante_id INTO v_cbte FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
   WHERE l.id = CASE WHEN TG_OP='DELETE' THEN OLD.linea_id ELSE NEW.linea_id END;
  IF v_cbte IS NOT NULL AND public.contab_es_usuario_directo() THEN
    RAISE EXCEPTION 'Las imputaciones de un comprobante se editan en el reparto del ítem y se regeneran con el asiento';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.origen_fuente := CASE WHEN v_cbte IS NOT NULL THEN 'comprobante' ELSE 'manual' END;
  IF v_cbte IS NULL THEN NEW.reparto_id := NULL; NEW.item_id := NULL; END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_imputacion_fuente() FROM PUBLIC, anon, authenticated;
-- nombre ordenado antes de contab_imputacion_guarda (los BEFORE triggers corren en orden alfabético)
CREATE TRIGGER contab_imputacion_a_fuente BEFORE INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_fuente();

-- A6. Al confirmar: imputaciones == repartos y líneas == ítems
CREATE OR REPLACE FUNCTION public.contab_trg_asiento_cbte_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF NEW.comprobante_id IS NULL OR NEW.reversa_de IS NOT NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM contab_comprobante_items it WHERE it.comprobante_id = NEW.comprobante_id
               AND NOT EXISTS (SELECT 1 FROM contab_asiento_lineas l
                                WHERE l.asiento_id = NEW.id AND l.item_id = it.id AND l.debe + l.haber = it.neto)) THEN
    RAISE EXCEPTION 'El asiento no refleja los ítems del comprobante: regenerá el borrador';
  END IF;
  IF EXISTS (
      (SELECT r.id, r.subcentro_id, r.importe FROM contab_item_repartos r
         JOIN contab_asiento_lineas l ON l.item_id = r.item_id AND l.asiento_id = NEW.id)
      EXCEPT
      (SELECT i.reparto_id, i.subcentro_id, i.importe FROM contab_imputaciones_analiticas i
         JOIN contab_asiento_lineas l ON l.id = i.linea_id
        WHERE l.asiento_id = NEW.id AND i.tipo_movimiento = 'original'))
  OR EXISTS (
      (SELECT i.reparto_id, i.subcentro_id, i.importe FROM contab_imputaciones_analiticas i
         JOIN contab_asiento_lineas l ON l.id = i.linea_id
        WHERE l.asiento_id = NEW.id AND i.tipo_movimiento = 'original')
      EXCEPT
      (SELECT r.id, r.subcentro_id, r.importe FROM contab_item_repartos r
         JOIN contab_asiento_lineas l ON l.item_id = r.item_id AND l.asiento_id = NEW.id)) THEN
    RAISE EXCEPTION 'Los repartos cambiaron después de generar el borrador: regenerá el asiento';
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_asiento_cbte_sync() FROM PUBLIC, anon, authenticated;
CREATE CONSTRAINT TRIGGER contab_asiento_cbte_sync AFTER UPDATE OF estado ON public.contab_asientos
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado')
  EXECUTE FUNCTION public.contab_trg_asiento_cbte_sync();

-- A7. Lectura analítica con signo económico por lado (NC y reversas restan)
CREATE VIEW public.contab_analitica_efecto WITH (security_invoker = true) AS
SELECT i.id, i.linea_id, l.asiento_id, a.fecha, a.estado AS asiento_estado, a.comprobante_id,
       i.subcentro_id, i.centro_id_snap, i.obra_id, i.obra_atribucion, i.maquinaria_id, i.naturaleza,
       i.tipo_movimiento, i.origen_fuente, i.importe,
       (i.importe * CASE WHEN (i.naturaleza = 'gasto') = (l.debe > 0) THEN 1 ELSE -1 END)::numeric(18,2) AS efecto
  FROM public.contab_imputaciones_analiticas i
  JOIN public.contab_asiento_lineas l ON l.id = i.linea_id
  JOIN public.contab_asientos a ON a.id = l.asiento_id;
GRANT SELECT ON public.contab_analitica_efecto TO authenticated;
COMMENT ON VIEW public.contab_analitica_efecto IS
  'Efecto económico = importe × lado (gasto al Debe +, al Haber −; ingreso inverso). signo solo marca reversa; no se multiplica.';
```

## Migración 1C-B `contab_1c_b_generador`

```sql
-- B1. Generador: misma firma y retorno; regenera borrador en la misma transacción
CREATE OR REPLACE FUNCTION public.contab_generar_asiento_cbte(_cbte_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  v_c contab_comprobantes%ROWTYPE; v_t contab_terceros%ROWTYPE;
  v_as uuid; v_estado text; v_nc boolean; v_econ_debe boolean; v_ord int := 1;
  v_iva numeric(18,2); v_perc numeric(18,2); v_items numeric(18,2);
  c_contra uuid; c_iva uuid; c_perc uuid; c_def uuid; v_regla text;
  v_it record; v_linea uuid; v_desc text;
BEGIN
  IF NOT public.contab_puede_centros() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_c FROM contab_comprobantes WHERE id = _cbte_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  IF v_c.estado = 'anulado' THEN RAISE EXCEPTION 'Comprobante anulado'; END IF;

  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM contab_asientos WHERE id = v_c.asiento_id FOR UPDATE;
    IF v_estado <> 'borrador' THEN RAISE EXCEPTION 'El asiento está %: no se regenera', v_estado; END IF;
    v_as := v_c.asiento_id;
    DELETE FROM contab_asiento_lineas WHERE asiento_id = v_as;   -- borra sus imputaciones (cascade, auditado)
  END IF;

  v_nc := v_c.tipo::text LIKE 'NC%';
  v_econ_debe := (NOT v_c.es_venta) <> v_nc;    -- compra FA: Debe; compra NC: Haber; venta FA: Haber; venta NC: Debe

  SELECT * INTO v_t FROM contab_terceros WHERE id = v_c.tercero_id;
  c_contra := CASE WHEN v_c.es_venta THEN v_t.cuenta_deudores_id ELSE v_t.cuenta_proveedores_id END;
  v_regla := 'ficha';
  IF c_contra IS NULL THEN
    SELECT cuenta_id INTO c_contra FROM contab_cuentas_config WHERE clave = CASE WHEN v_c.es_venta THEN 'deudores' ELSE 'proveedores' END;
    v_regla := 'general';
  END IF;
  SELECT cuenta_id INTO c_iva  FROM contab_cuentas_config WHERE clave = CASE WHEN v_c.es_venta THEN 'iva_df' ELSE 'iva_cf' END;
  SELECT cuenta_id INTO c_perc FROM contab_cuentas_config WHERE clave = 'percepciones';
  SELECT cuenta_id INTO c_def  FROM contab_cuentas_config WHERE clave = CASE WHEN v_c.es_venta THEN 'ventas' ELSE 'compras' END;
  IF c_contra IS NULL OR c_iva IS NULL OR c_perc IS NULL OR c_def IS NULL THEN
    RAISE EXCEPTION 'Falta configurar cuentas (contrapartida/IVA/percepciones/default)';
  END IF;

  v_iva  := COALESCE(v_c.iva_21,0) + COALESCE(v_c.iva_105,0) + COALESCE(v_c.iva_27,0);
  v_perc := COALESCE(v_c.perc_iva,0) + COALESCE(v_c.perc_iibb,0) + COALESCE(v_c.perc_otras,0);
  SELECT COALESCE(sum(neto),0) INTO v_items FROM contab_comprobante_items WHERE comprobante_id = v_c.id;
  IF v_items <= 0 THEN RAISE EXCEPTION 'El comprobante no tiene ítems'; END IF;
  IF abs(v_items + v_iva + v_perc - v_c.total) > 0.01 THEN
    RAISE EXCEPTION 'Ítems (%) + IVA (%) + percepciones (%) no coinciden con el total (%)', v_items, v_iva, v_perc, v_c.total;
  END IF;

  SELECT COALESCE(razon_social,'-') INTO v_desc FROM contab_terceros WHERE id = v_c.tercero_id;
  v_desc := v_c.tipo::text||' '||lpad(v_c.punto_venta::text,5,'0')||'-'||lpad(v_c.numero::text,8,'0')||' '||COALESCE(v_desc,'');

  IF v_as IS NULL THEN
    INSERT INTO contab_asientos (fecha, descripcion, origen, comprobante_id, total_debe, total_haber, created_by)
    VALUES (v_c.fecha, v_desc, CASE WHEN v_c.es_venta THEN 'VENTA' ELSE 'COMPRA' END, v_c.id, v_c.total, v_c.total, auth.uid())
    RETURNING id INTO v_as;
  ELSE
    UPDATE contab_asientos SET fecha = v_c.fecha, descripcion = v_desc, total_debe = v_c.total, total_haber = v_c.total
     WHERE id = v_as;
  END IF;

  -- Contrapartida (lado opuesto al económico)
  INSERT INTO contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, regla_cuenta)
  VALUES (v_as, v_ord, c_contra, CASE WHEN v_c.es_venta THEN 'Deudores - ' ELSE 'Proveedores - ' END || v_desc,
          CASE WHEN v_econ_debe THEN 0 ELSE v_c.total END, CASE WHEN v_econ_debe THEN v_c.total ELSE 0 END, v_regla);
  v_ord := v_ord + 1;

  -- Una línea por ítem + imputaciones desde sus repartos
  FOR v_it IN SELECT * FROM contab_comprobante_items WHERE comprobante_id = v_c.id ORDER BY orden, id LOOP
    INSERT INTO contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, obra_id, maquinaria_id, item_id, regla_cuenta)
    VALUES (v_as, v_ord, COALESCE(v_it.cuenta_id, c_def), v_it.descripcion,
            CASE WHEN v_econ_debe THEN v_it.neto ELSE 0 END, CASE WHEN v_econ_debe THEN 0 ELSE v_it.neto END,
            v_it.obra_id, v_it.maquinaria_id, v_it.id, CASE WHEN v_it.cuenta_id IS NULL THEN 'config' ELSE 'item' END)
    RETURNING id INTO v_linea;
    v_ord := v_ord + 1;
    INSERT INTO contab_imputaciones_analiticas
      (linea_id, subcentro_id, obra_id, obra_atribucion, maquinaria_id, naturaleza, importe, reparto_id, item_id, nota)
    SELECT v_linea, r.subcentro_id, r.obra_id, r.obra_atribucion, r.maquinaria_id,
           CASE WHEN v_c.es_venta THEN 'ingreso' ELSE 'gasto' END, r.importe, r.id, r.item_id, r.nota
      FROM contab_item_repartos r WHERE r.item_id = v_it.id ORDER BY r.created_at, r.id;
  END LOOP;

  IF v_iva > 0 THEN
    INSERT INTO contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, regla_cuenta)
    VALUES (v_as, v_ord, c_iva, CASE WHEN v_c.es_venta THEN 'IVA Débito Fiscal' ELSE 'IVA Crédito Fiscal' END,
            CASE WHEN v_econ_debe THEN v_iva ELSE 0 END, CASE WHEN v_econ_debe THEN 0 ELSE v_iva END, 'config');
    v_ord := v_ord + 1;
  END IF;
  IF v_perc > 0 THEN
    INSERT INTO contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, regla_cuenta)
    VALUES (v_as, v_ord, c_perc, 'Percepciones',
            CASE WHEN v_econ_debe THEN v_perc ELSE 0 END, CASE WHEN v_econ_debe THEN 0 ELSE v_perc END, 'config');
  END IF;

  IF v_c.asiento_id IS NULL THEN
    UPDATE contab_comprobantes SET asiento_id = v_as, estado = 'confirmado', confirmado_at = now(), confirmado_por = auth.uid()
     WHERE id = v_c.id;
  END IF;
  RETURN v_as;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_generar_asiento_cbte(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_generar_asiento_cbte(uuid) TO authenticated;

-- B2. Anulación: igual a la actual + anula vínculos vigentes (repartos quedan como historia)
CREATE OR REPLACE FUNCTION public.contab_anular_comprobante(_cbte_id uuid, _motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_c public.contab_comprobantes%ROWTYPE; v_estado text; v_mot text;
BEGIN
  IF NOT public.contab_puede('asiento_revertir') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_c FROM public.contab_comprobantes WHERE id = _cbte_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  IF v_c.estado = 'anulado' THEN RETURN; END IF;
  v_mot := COALESCE(NULLIF(btrim(_motivo),''), 'Anulación de comprobante');
  IF EXISTS (SELECT 1 FROM public.contab_pagos p JOIN public.contab_asientos a ON a.id = p.asiento_id
              WHERE p.comprobante_id = v_c.id AND a.estado IN ('borrador','confirmado')) THEN
    RAISE EXCEPTION 'El comprobante tiene pagos/cobros registrados: revertí esos asientos primero';
  END IF;
  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM public.contab_asientos WHERE id = v_c.asiento_id;
    IF v_estado = 'borrador' THEN
      PERFORM public.contab_descartar_asiento(v_c.asiento_id);
    ELSIF v_estado = 'confirmado' THEN
      PERFORM public.contab_revertir_asiento(v_c.asiento_id, v_mot, NULL);
    END IF;
  END IF;
  UPDATE public.contab_vinculos_operativos SET estado = 'anulado', anulado_at = now(), anulado_motivo = v_mot
   WHERE comprobante_id = v_c.id AND estado = 'vigente';
  UPDATE public.contab_comprobantes SET estado = 'anulado', anulado_at = now() WHERE id = v_c.id;
END $$;
```

## Recuperación (solo si hiciera falta; requiere tu aprobación porque elimina objetos nuevos vacíos)

```sql
DO $$ DECLARE r record; BEGIN
  IF EXISTS (SELECT 1 FROM public.contab_comprobantes) THEN
    RAISE EXCEPTION 'Hay comprobantes: la recuperación debe revisarse a mano';
  END IF;
  FOR r IN SELECT DISTINCT ON (nombre) definicion FROM public.contab_respaldo_funciones
            WHERE fase='1C' ORDER BY nombre, id DESC LOOP
    EXECUTE r.definicion;   -- restaura generador y anulación originales
  END LOOP;
END $$;
DROP VIEW public.contab_analitica_efecto; DROP VIEW public.contab_vinculos_saldos;
DROP TRIGGER contab_asiento_cbte_sync ON public.contab_asientos;
DROP TRIGGER contab_imputacion_a_fuente ON public.contab_imputaciones_analiticas;
DROP TABLE public.contab_vinculos_operativos; DROP TABLE public.contab_item_repartos;
DROP FUNCTION public.contab_trg_asiento_cbte_sync(), public.contab_trg_imputacion_fuente(),
  public.contab_trg_vinculo_guarda(), public.contab_doc_referencia(text,uuid),
  public.contab_normalizar_repartos(uuid), public.contab_trg_reparto_guarda();
DROP INDEX public.contab_imput_reparto_uq;
-- columnas nuevas quedan marcadas DEPRECATED en vez de borrarse (cambio no destructivo)
```

## Compatibilidad con 0B / 1A / 1B (revisada contra las definiciones actuales)
- `contab_confirmar_asiento`, `contab_revertir_asiento`, `contab_descartar_asiento`, reversa de imputaciones y `contab_trg_imputacion_guarda`: sin cambios. La reversa copia imputaciones como funciones privilegiadas → el nuevo trigger las permite y las marca `comprobante`.
- `trg_contab_items_con_asiento`: sigue bloqueando ítems/comprobantes con asiento. Los repartos son tabla aparte: editables solo en borrador, y la confirmación exige regenerar si cambiaron.
- `contab_trg_linea_guarda`: permite borrar líneas solo en borrador → la regeneración funciona; confirmado queda inmutable.
- Permisos: generador pasa de `has_role admin|contador` a `contab_puede_centros()` (mismo conjunto). Lectura con `contab_puede('ver')` como 1B.
- 1A: usa `cuenta_deudores_id`/`cuenta_proveedores_id` de la ficha con respaldo explícito en `contab_cuentas_config`; snapshot fiscal intacto.
- Cambio de conducta declarado: el generador deja de usar códigos fijos de cuentas y pasa a la configuración; la verificación A0 garantiza que las 7 claves existan.
- Ningún objeto toca tablas operativas salvo lectura en `contab_doc_referencia`.

## Validación (al autorizar, antes de dejar aplicado)
1. Ejecutar 1C-A y 1C-B dentro de una transacción con `ROLLBACK` forzado y casos de prueba; solo si todos pasan, aplicar con la herramienta de migración.
2. Casos (todos en transacción revertida, sin concurrencia agresiva):
   - Reparto > neto; reparto en comprobante anulado; reparto tras confirmar → rechazo.
   - 3 × 33,333333 % sobre $100 → normalizado suma $100,00.
   - Generar, editar reparto, generar de nuevo → mismas líneas, imputaciones sin duplicar; confirmar sin regenerar tras editar → rechazo.
   - Insert/update/delete directo de imputación en asiento de comprobante (como usuario) → rechazo; en asiento manual → permitido.
   - Cuenta `requiere_analitica` sin 100 % → rechazo al confirmar (1B).
   - Factura de compra: OC-ítem $100 en dos facturas $60 + $40 → OK; tercera $1 → rechazo; anular una → saldo libera $60.
   - Mismo ítem con OC-ítem facturable + recepción facturable → rechazo; recepción como trazabilidad → OK.
   - Vínculos facturables de un ítem > neto → rechazo; documento inexistente → rechazo; vínculo duplicado → rechazo.
   - Carga de combustible (sin importe propio) en dos facturas → segunda rechazada.
   - NC compra: línea al Haber, efecto −; NC con vínculo → rechazo.
   - Anular factura confirmada → reversa espejo, efecto neto 0 por subcentro, vínculos anulados, repartos conservados.
   - Cuenta de ficha vs respaldo general.
   - Contador/admin sí; maquinista sin acceso.
   - Conteos de obras, máquinas, combustible, stock, remitos, certificados idénticos antes/después.

## Pendientes declarados
- NC vinculada a factura original (control por ítem/subcentro) — bloqueada hasta implementarla.
- Cuentas con `requiere_analitica`, fechas del ejercicio y de corte (contador).
- Concurrencia real y sesión real de contador.
- Pantallas de reparto/vínculos se hacen después de aplicar el SQL.

---

## Correcciones finales (sustituyen lo anterior donde difieran) y ejecución autorizada

1. **Porcentajes**: el trigger de repartos siempre calcula `importe = round(neto × % / 100, 2)` y al final llama a la normalización interna (sin `contab_es_usuario_directo`). La normalización deja el residuo de redondeo en el reparto de mayor % cuando suman 100 %, usando una columna `ajuste_redondeo` (no editable por el usuario) para que el trigger no lo pise. El generador lee `importe + ajuste_redondeo` ya normalizado. Prueba: 3 × 33,333333 % sobre $100 = $100,00.
2. **Estados**: el generador no marca el comprobante como `confirmado` al crear el borrador; queda `borrador` con `asiento_id` (= "asiento generado"). Pasa a `confirmado` solo cuando `contab_confirmar_asiento` confirma el asiento (trigger AFTER sobre asientos), y `contab_descartar_asiento` sigue devolviéndolo a borrador. La UI muestra: registrado / asiento generado / contabilizado / anulado.
3. **Vista analítica**: `contab_analitica_efecto` filtra `estado IN ('confirmado','revertido')` e incluye las reversas (lado opuesto → compensan); NC restan por lado.
4. **Vínculos**: la anulación de un vínculo cuyo asiento está confirmado solo es válida si el comprobante ya está `anulado` en la misma transacción (la función de anulación marca el comprobante primero y después los vínculos). El trigger no intenta identificar al usuario.
5. **Correspondencia al confirmar**: el trigger diferido reconstruye en memoria el asiento esperado (contrapartida con su cuenta, una línea por ítem con cuenta/importe/lado/obra/máquina, IVA, percepciones) y lo compara con las líneas reales (`EXCEPT` en ambos sentidos, con conteo para detectar duplicados), además de imputaciones vs repartos con subcentro, importe, obra y máquina.
6. **Recuperación**: sin `DROP` destructivo. La reversión técnica solo restaura las dos funciones respaldadas (propietario y permisos se verifican antes/después vía `pg_proc.proowner` y `proacl`), deshabilita los triggers nuevos y deja tablas/columnas marcadas DEPRECATED. Se niega a correr si existen comprobantes.

### Procedimiento
1. Corregir el SQL de 1C-A y 1C-B con estos puntos.
2. Ejecutarlo completo dentro de una transacción con ROLLBACK forzado junto con los casos de prueba (generación, regeneración, confirmación, reversa, anulación, porcentajes, permisos admin/contador/maquinista, vínculos parciales) y conteos de obras, máquinas, combustible, remitos, stock y certificados antes/después.
3. Si todo pasa y la recuperación se verifica segura: aplicar 1C-A y 1C-B con la herramienta de migración, luego pantallas de reparto por ítem, vínculos, estado "asiento generado" y saldos.
4. Si algo falla: detener e informar el bloqueo.
5. Informe breve con lo ejecutado, resultados y pendientes. Sin concurrencia agresiva, sin CONTAD, sin 1D, sin otra base.
