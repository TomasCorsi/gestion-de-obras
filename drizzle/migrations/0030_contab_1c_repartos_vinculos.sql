DO $$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.contab_comprobantes;
  IF v > 0 THEN RAISE EXCEPTION '1C: hay % comprobantes', v; END IF;
  SELECT count(*) INTO v FROM public.contab_cuentas_config
   WHERE clave IN ('deudores','proveedores','ventas','compras','iva_cf','iva_df','percepciones') AND cuenta_id IS NOT NULL;
  IF v <> 7 THEN RAISE EXCEPTION '1C: configuración de cuentas incompleta (%/7)', v; END IF;
END $$;

CREATE TABLE public.contab_respaldo_funciones (
  id bigserial PRIMARY KEY, fase text NOT NULL, nombre text NOT NULL, firma text NOT NULL,
  definicion text NOT NULL, owner_oid oid NOT NULL, acl text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.contab_respaldo_funciones TO service_role;
ALTER TABLE public.contab_respaldo_funciones ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.contab_respaldo_funciones IS 'Interno: definiciones previas de funciones para recuperación; sin acceso de la app';
INSERT INTO public.contab_respaldo_funciones (fase, nombre, firma, definicion, owner_oid, acl)
SELECT '1C', p.proname, p.oid::regprocedure::text, pg_get_functiondef(p.oid), p.proowner, p.proacl::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname IN ('contab_generar_asiento_cbte','contab_anular_comprobante','contab_trg_tope_linea');

CREATE OR REPLACE FUNCTION public.contab_trg_tope_linea() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_linea uuid; v_tope numeric; v_suma numeric;
BEGIN
  IF TG_TABLE_NAME = 'contab_asiento_lineas' THEN v_linea := NEW.id; ELSE v_linea := NEW.linea_id; END IF;
  SELECT debe + haber INTO v_tope FROM contab_asiento_lineas WHERE id = v_linea FOR UPDATE;
  IF v_tope IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(sum(importe),0) INTO v_suma FROM contab_imputaciones_analiticas WHERE linea_id = v_linea AND tipo_movimiento = 'original';
  IF v_suma > v_tope THEN RAISE EXCEPTION 'Las imputaciones (%) superan el importe de la línea (%)', v_suma, v_tope; END IF;
  RETURN NULL;
END $$;

ALTER TABLE public.contab_comprobante_items
  ADD COLUMN concepto_fiscal text NOT NULL DEFAULT 'neto' CHECK (concepto_fiscal IN ('neto','no_gravado','exento'));
COMMENT ON COLUMN public.contab_comprobante_items.obra_id IS 'Informativo; la fuente analítica es contab_item_repartos';
COMMENT ON COLUMN public.contab_comprobante_items.maquinaria_id IS 'Informativo; la fuente analítica es contab_item_repartos';
ALTER TABLE public.contab_asiento_lineas
  ADD COLUMN item_id uuid REFERENCES public.contab_comprobante_items(id) ON DELETE RESTRICT,
  ADD COLUMN regla_cuenta text CHECK (regla_cuenta IN ('item','ficha','general','config'));
CREATE INDEX contab_lineas_item_idx ON public.contab_asiento_lineas (item_id) WHERE item_id IS NOT NULL;
ALTER TABLE public.contab_imputaciones_analiticas
  ADD COLUMN reparto_id uuid, ADD COLUMN item_id uuid,
  ADD COLUMN origen_fuente text NOT NULL DEFAULT 'manual' CHECK (origen_fuente IN ('manual','comprobante'));
CREATE UNIQUE INDEX contab_imput_reparto_uq ON public.contab_imputaciones_analiticas (linea_id, reparto_id)
  WHERE reparto_id IS NOT NULL AND tipo_movimiento = 'original';

CREATE TABLE public.contab_item_repartos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.contab_comprobante_items(id) ON DELETE CASCADE,
  subcentro_id uuid NOT NULL REFERENCES public.contab_subcentros_costo(id) ON DELETE RESTRICT,
  modo text NOT NULL CHECK (modo IN ('importe','porcentaje')),
  porcentaje numeric(9,6) CHECK (porcentaje > 0 AND porcentaje <= 100),
  importe numeric(18,2) NOT NULL CHECK (importe > 0),
  ajuste_redondeo numeric(18,2) NOT NULL DEFAULT 0,
  importe_efectivo numeric(18,2) GENERATED ALWAYS AS (importe + ajuste_redondeo) STORED,
  obra_id uuid REFERENCES public.obras(id) ON DELETE RESTRICT,
  obra_atribucion text CHECK (obra_atribucion IN ('economica','informativa')),
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE RESTRICT,
  nota text, created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ir_modo CHECK ((modo = 'porcentaje') = (porcentaje IS NOT NULL)),
  CONSTRAINT ir_obra_atrib CHECK ((obra_id IS NULL) = (obra_atribucion IS NULL)),
  CONSTRAINT ir_efectivo CHECK (importe + ajuste_redondeo > 0),
  CONSTRAINT ir_uq UNIQUE (item_id, subcentro_id));
CREATE INDEX contab_repartos_sub_idx ON public.contab_item_repartos (subcentro_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_item_repartos TO authenticated;
GRANT ALL ON public.contab_item_repartos TO service_role;
ALTER TABLE public.contab_item_repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ir_select ON public.contab_item_repartos FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY ir_insert ON public.contab_item_repartos FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY ir_update ON public.contab_item_repartos FOR UPDATE TO authenticated USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY ir_delete ON public.contab_item_repartos FOR DELETE TO authenticated USING (public.contab_puede_centros());

CREATE OR REPLACE FUNCTION public.contab_trg_reparto_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_item record; v_c record; v_estado text; v_sub record;
BEGIN
  SELECT it.* INTO v_item FROM contab_comprobante_items it WHERE it.id = CASE WHEN TG_OP='DELETE' THEN OLD.item_id ELSE NEW.item_id END;
  SELECT c.* INTO v_c FROM contab_comprobantes c WHERE c.id = v_item.comprobante_id FOR UPDATE;
  IF v_c.estado = 'anulado' THEN RAISE EXCEPTION 'Comprobante anulado: el reparto no se modifica'; END IF;
  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM contab_asientos WHERE id = v_c.asiento_id;
    IF v_estado IS DISTINCT FROM 'borrador' THEN RAISE EXCEPTION 'El asiento del comprobante está %: el reparto es inmutable', v_estado; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NEW.item_id <> OLD.item_id THEN RAISE EXCEPTION 'El reparto no cambia de ítem'; END IF;
  SELECT s.*, c.activo AS c_activo, c.vigente_desde AS c_desde, c.vigente_hasta AS c_hasta
    INTO v_sub FROM contab_subcentros_costo s JOIN contab_centros_costo c ON c.id = s.centro_id WHERE s.id = NEW.subcentro_id;
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
  IF NEW.modo = 'porcentaje' THEN NEW.importe := round(v_item.neto * NEW.porcentaje / 100, 2); ELSE NEW.porcentaje := NULL; END IF;
  IF pg_trigger_depth() <= 1 THEN NEW.ajuste_redondeo := 0; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_reparto_guarda() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.contab_normalizar_repartos(_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_neto numeric(18,2); v_pct numeric; v_ult uuid; v_suma numeric(18,2); v_res numeric(18,2);
BEGIN
  SELECT neto INTO v_neto FROM contab_comprobante_items WHERE id = _item_id;
  IF v_neto IS NULL THEN RETURN; END IF;
  SELECT COALESCE(sum(porcentaje),0) INTO v_pct FROM contab_item_repartos WHERE item_id=_item_id AND modo='porcentaje';
  SELECT id INTO v_ult FROM contab_item_repartos WHERE item_id=_item_id AND modo='porcentaje' ORDER BY porcentaje DESC, created_at DESC, id DESC LIMIT 1;
  SELECT COALESCE(sum(importe),0) INTO v_suma FROM contab_item_repartos WHERE item_id=_item_id;
  v_res := 0;
  IF abs(v_pct - 100) < 0.00001 AND NOT EXISTS (SELECT 1 FROM contab_item_repartos WHERE item_id=_item_id AND modo='importe') THEN
    v_res := v_neto - v_suma;
  END IF;
  UPDATE contab_item_repartos SET ajuste_redondeo = CASE WHEN id = v_ult THEN v_res ELSE 0 END
   WHERE item_id = _item_id AND ajuste_redondeo IS DISTINCT FROM CASE WHEN id = v_ult THEN v_res ELSE 0 END;
  IF (SELECT COALESCE(sum(importe_efectivo),0) FROM contab_item_repartos WHERE item_id=_item_id) > v_neto THEN
    RAISE EXCEPTION 'El reparto supera el neto del ítem (%)', v_neto;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_normalizar_repartos(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.contab_trg_reparto_normaliza() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  PERFORM public.contab_normalizar_repartos(CASE WHEN TG_OP='DELETE' THEN OLD.item_id ELSE NEW.item_id END);
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_reparto_normaliza() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_reparto_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_item_repartos FOR EACH ROW EXECUTE FUNCTION public.contab_trg_reparto_guarda();
CREATE TRIGGER contab_reparto_normaliza AFTER INSERT OR UPDATE OR DELETE ON public.contab_item_repartos FOR EACH ROW EXECUTE FUNCTION public.contab_trg_reparto_normaliza();
CREATE TRIGGER contab_auditar_repartos AFTER INSERT OR UPDATE OR DELETE ON public.contab_item_repartos FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

CREATE OR REPLACE FUNCTION public.contab_trg_item_renormaliza() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF NEW.neto IS DISTINCT FROM OLD.neto THEN
    UPDATE contab_item_repartos SET porcentaje = porcentaje WHERE item_id = NEW.id AND modo = 'porcentaje';
    PERFORM public.contab_normalizar_repartos(NEW.id);
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_item_renormaliza() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_item_renormaliza AFTER UPDATE OF neto ON public.contab_comprobante_items FOR EACH ROW EXECUTE FUNCTION public.contab_trg_item_renormaliza();

CREATE TABLE public.contab_vinculos_operativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comprobante_id uuid NOT NULL REFERENCES public.contab_comprobantes(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES public.contab_comprobante_items(id) ON DELETE RESTRICT,
  clase text NOT NULL CHECK (clase IN ('trazabilidad','facturable')),
  doc_tipo text NOT NULL CHECK (doc_tipo IN ('orden_compra','orden_compra_item','mantenimiento','carga_combustible','movimiento_stock','certificado','remito_maquinas','remito_materiales','otro_gasto')),
  doc_id uuid NOT NULL, importe_vinculado numeric(18,2),
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','anulado')),
  anulado_at timestamptz, anulado_motivo text, nota text, created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vo_clase CHECK ((clase = 'facturable' AND item_id IS NOT NULL AND importe_vinculado > 0) OR (clase = 'trazabilidad' AND importe_vinculado IS NULL)),
  CONSTRAINT vo_oc_cabecera CHECK (doc_tipo <> 'orden_compra' OR clase = 'trazabilidad'),
  CONSTRAINT vo_anulado CHECK ((estado = 'anulado') = (anulado_at IS NOT NULL)));
CREATE UNIQUE INDEX contab_vinc_uq ON public.contab_vinculos_operativos
  (comprobante_id, COALESCE(item_id,'00000000-0000-0000-0000-000000000000'::uuid), clase, doc_tipo, doc_id) WHERE estado = 'vigente';
CREATE INDEX contab_vinc_doc_idx ON public.contab_vinculos_operativos (doc_tipo, doc_id) WHERE estado = 'vigente';
GRANT SELECT, INSERT, UPDATE ON public.contab_vinculos_operativos TO authenticated;
GRANT ALL ON public.contab_vinculos_operativos TO service_role;
ALTER TABLE public.contab_vinculos_operativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY vo_select ON public.contab_vinculos_operativos FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY vo_insert ON public.contab_vinculos_operativos FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY vo_update ON public.contab_vinculos_operativos FOR UPDATE TO authenticated USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());

CREATE OR REPLACE FUNCTION public.contab_doc_referencia(_tipo text, _id uuid, OUT existe boolean, OUT importe numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
BEGIN
  IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
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
    ELSE NULL;
  END CASE;
  existe := COALESCE(existe,false);
  IF importe IS NOT NULL AND importe <= 0 THEN importe := NULL; END IF;
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
       OR NEW.importe_vinculado IS DISTINCT FROM OLD.importe_vinculado OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Un vínculo no se edita: anulalo y creá otro';
    END IF;
    IF OLD.estado = 'anulado' THEN RAISE EXCEPTION 'El vínculo ya está anulado'; END IF;
    IF v_estado IN ('confirmado','revertido') AND v_c.estado <> 'anulado' THEN
      RAISE EXCEPTION 'El comprobante está contabilizado: el vínculo solo se anula anulando el comprobante';
    END IF;
    IF NEW.estado = 'anulado' AND NEW.anulado_at IS NULL THEN NEW.anulado_at := now(); END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante inexistente'; END IF;
  IF v_c.estado = 'anulado' THEN RAISE EXCEPTION 'Comprobante anulado'; END IF;
  IF v_estado IN ('confirmado','revertido') THEN RAISE EXCEPTION 'Comprobante contabilizado: no se agregan vínculos'; END IF;
  IF v_c.tipo::text LIKE 'NC%' THEN RAISE EXCEPTION 'Las notas de crédito todavía no admiten vínculos operativos (pendiente: vínculo con la factura original)'; END IF;
  IF NEW.estado <> 'vigente' THEN RAISE EXCEPTION 'Un vínculo nace vigente'; END IF;
  IF (NEW.doc_tipo = 'certificado') <> v_c.es_venta THEN RAISE EXCEPTION 'Certificados solo en ventas; documentos de costo solo en compras'; END IF;
  SELECT * INTO v_ref FROM public.contab_doc_referencia(NEW.doc_tipo, NEW.doc_id);
  IF NOT v_ref.existe THEN RAISE EXCEPTION 'Documento operativo inexistente (% %)', NEW.doc_tipo, NEW.doc_id; END IF;
  IF NEW.item_id IS NOT NULL THEN
    SELECT * INTO v_item FROM contab_comprobante_items WHERE id = NEW.item_id FOR UPDATE;
    IF v_item.comprobante_id IS DISTINCT FROM NEW.comprobante_id THEN RAISE EXCEPTION 'El ítem no pertenece al comprobante'; END IF;
  END IF;
  IF NEW.clase = 'facturable' THEN
    IF EXISTS (SELECT 1 FROM contab_vinculos_operativos WHERE item_id = NEW.item_id AND clase='facturable' AND estado='vigente' AND doc_tipo <> NEW.doc_tipo) THEN
      RAISE EXCEPTION 'El ítem ya tiene vínculos facturables de otro tipo; registrá este como trazabilidad';
    END IF;
    SELECT COALESCE(sum(importe_vinculado),0) INTO v_suma FROM contab_vinculos_operativos WHERE item_id = NEW.item_id AND clase='facturable' AND estado='vigente';
    IF v_suma + NEW.importe_vinculado > v_item.neto THEN RAISE EXCEPTION 'Vinculado por ítem (%) supera su neto (%)', v_suma + NEW.importe_vinculado, v_item.neto; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('contab_vinc:'||NEW.doc_tipo||':'||NEW.doc_id::text));
    IF v_ref.importe IS NULL THEN
      SELECT count(*) INTO v_n FROM contab_vinculos_operativos v JOIN contab_comprobantes c ON c.id=v.comprobante_id
       WHERE v.doc_tipo=NEW.doc_tipo AND v.doc_id=NEW.doc_id AND v.clase='facturable' AND v.estado='vigente' AND c.estado<>'anulado';
      IF v_n > 0 THEN RAISE EXCEPTION 'Este documento ya está facturado (no tiene importe propio para facturación parcial)'; END IF;
    ELSE
      SELECT COALESCE(sum(v.importe_vinculado),0) INTO v_suma FROM contab_vinculos_operativos v JOIN contab_comprobantes c ON c.id=v.comprobante_id
       WHERE v.doc_tipo=NEW.doc_tipo AND v.doc_id=NEW.doc_id AND v.clase='facturable' AND v.estado='vigente' AND c.estado<>'anulado';
      IF v_suma + NEW.importe_vinculado > v_ref.importe + 0.01 THEN
        RAISE EXCEPTION 'Saldo facturable insuficiente: referencia %, ya vinculado %, nuevo %', v_ref.importe, v_suma, NEW.importe_vinculado;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_vinculo_guarda() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_vinculo_guarda BEFORE INSERT OR UPDATE ON public.contab_vinculos_operativos FOR EACH ROW EXECUTE FUNCTION public.contab_trg_vinculo_guarda();
CREATE TRIGGER contab_auditar_vinculos AFTER INSERT OR UPDATE ON public.contab_vinculos_operativos FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

CREATE VIEW public.contab_vinculos_saldos WITH (security_invoker = true) AS
SELECT x.doc_tipo, x.doc_id, x.ref AS importe_referencia, x.facturado,
       CASE WHEN x.ref IS NULL THEN NULL ELSE x.ref - x.facturado END AS saldo_pendiente
  FROM (SELECT v.doc_tipo, v.doc_id, (public.contab_doc_referencia(v.doc_tipo, v.doc_id)).importe AS ref,
               COALESCE(sum(v.importe_vinculado) FILTER (WHERE v.clase='facturable'),0) AS facturado
          FROM public.contab_vinculos_operativos v JOIN public.contab_comprobantes c ON c.id = v.comprobante_id
         WHERE v.estado = 'vigente' AND c.estado <> 'anulado' GROUP BY v.doc_tipo, v.doc_id) x;
GRANT SELECT ON public.contab_vinculos_saldos TO authenticated;

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
CREATE TRIGGER contab_imputacion_a_fuente BEFORE INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_fuente();

CREATE OR REPLACE FUNCTION public.contab_cbte_lineas_esperadas(_cbte_id uuid)
RETURNS TABLE(orden int, cuenta_id uuid, descripcion text, debe numeric, haber numeric, obra_id uuid, maquinaria_id uuid, item_id uuid, regla_cuenta text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE
  v_c contab_comprobantes%ROWTYPE; v_t contab_terceros%ROWTYPE;
  v_econ_debe boolean; v_ord int := 1; v_iva numeric(18,2); v_perc numeric(18,2); v_items numeric(18,2);
  c_contra uuid; c_iva uuid; c_perc uuid; c_def uuid; v_regla text; v_desc text; v_it record;
BEGIN
  IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_c FROM contab_comprobantes WHERE id = _cbte_id;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  v_econ_debe := (NOT v_c.es_venta) <> (v_c.tipo::text LIKE 'NC%');
  SELECT * INTO v_t FROM contab_terceros WHERE id = v_c.tercero_id;
  c_contra := CASE WHEN v_c.es_venta THEN v_t.cuenta_deudores_id ELSE v_t.cuenta_proveedores_id END;
  v_regla := 'ficha';
  IF c_contra IS NULL THEN
    SELECT k.cuenta_id INTO c_contra FROM contab_cuentas_config k WHERE k.clave = CASE WHEN v_c.es_venta THEN 'deudores' ELSE 'proveedores' END;
    v_regla := 'general';
  END IF;
  SELECT k.cuenta_id INTO c_iva  FROM contab_cuentas_config k WHERE k.clave = CASE WHEN v_c.es_venta THEN 'iva_df' ELSE 'iva_cf' END;
  SELECT k.cuenta_id INTO c_perc FROM contab_cuentas_config k WHERE k.clave = 'percepciones';
  SELECT k.cuenta_id INTO c_def  FROM contab_cuentas_config k WHERE k.clave = CASE WHEN v_c.es_venta THEN 'ventas' ELSE 'compras' END;
  IF c_contra IS NULL OR c_iva IS NULL OR c_perc IS NULL OR c_def IS NULL THEN RAISE EXCEPTION 'Falta configurar cuentas'; END IF;
  v_iva  := COALESCE(v_c.iva_21,0) + COALESCE(v_c.iva_105,0) + COALESCE(v_c.iva_27,0);
  v_perc := COALESCE(v_c.perc_iva,0) + COALESCE(v_c.perc_iibb,0) + COALESCE(v_c.perc_otras,0);
  SELECT COALESCE(sum(i.neto),0) INTO v_items FROM contab_comprobante_items i WHERE i.comprobante_id = v_c.id;
  IF v_items <= 0 THEN RAISE EXCEPTION 'El comprobante no tiene ítems'; END IF;
  IF EXISTS (SELECT 1 FROM contab_comprobante_items i WHERE i.comprobante_id = v_c.id AND i.neto <= 0) THEN RAISE EXCEPTION 'Hay ítems con neto cero o negativo'; END IF;
  IF abs(v_items + v_iva + v_perc - v_c.total) > 0.01 THEN
    RAISE EXCEPTION 'Ítems (%) + IVA (%) + percepciones (%) no coinciden con el total (%)', v_items, v_iva, v_perc, v_c.total;
  END IF;
  v_desc := v_c.tipo::text||' '||lpad(v_c.punto_venta::text,5,'0')||'-'||lpad(v_c.numero::text,8,'0')||' '||COALESCE(v_t.razon_social, v_c.fiscal_razon_social, '');
  orden := v_ord; cuenta_id := c_contra;
  descripcion := CASE WHEN v_c.es_venta THEN 'Deudores - ' ELSE 'Proveedores - ' END || v_desc;
  debe := CASE WHEN v_econ_debe THEN 0 ELSE v_c.total END; haber := CASE WHEN v_econ_debe THEN v_c.total ELSE 0 END;
  obra_id := NULL; maquinaria_id := NULL; item_id := NULL; regla_cuenta := v_regla;
  RETURN NEXT; v_ord := v_ord + 1;
  FOR v_it IN SELECT * FROM contab_comprobante_items i WHERE i.comprobante_id = v_c.id ORDER BY i.orden, i.id LOOP
    orden := v_ord; cuenta_id := COALESCE(v_it.cuenta_id, c_def); descripcion := v_it.descripcion;
    debe := CASE WHEN v_econ_debe THEN v_it.neto ELSE 0 END; haber := CASE WHEN v_econ_debe THEN 0 ELSE v_it.neto END;
    obra_id := v_it.obra_id; maquinaria_id := v_it.maquinaria_id; item_id := v_it.id;
    regla_cuenta := CASE WHEN v_it.cuenta_id IS NULL THEN 'config' ELSE 'item' END;
    RETURN NEXT; v_ord := v_ord + 1;
  END LOOP;
  obra_id := NULL; maquinaria_id := NULL; item_id := NULL; regla_cuenta := 'config';
  IF v_iva > 0 THEN
    orden := v_ord; cuenta_id := c_iva; descripcion := CASE WHEN v_c.es_venta THEN 'IVA Débito Fiscal' ELSE 'IVA Crédito Fiscal' END;
    debe := CASE WHEN v_econ_debe THEN v_iva ELSE 0 END; haber := CASE WHEN v_econ_debe THEN 0 ELSE v_iva END;
    RETURN NEXT; v_ord := v_ord + 1;
  END IF;
  IF v_perc > 0 THEN
    orden := v_ord; cuenta_id := c_perc; descripcion := 'Percepciones';
    debe := CASE WHEN v_econ_debe THEN v_perc ELSE 0 END; haber := CASE WHEN v_econ_debe THEN 0 ELSE v_perc END;
    RETURN NEXT;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_cbte_lineas_esperadas(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_cbte_lineas_esperadas(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.contab_trg_asiento_cbte_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_dif int;
BEGIN
  IF NEW.comprobante_id IS NULL OR NEW.reversa_de IS NOT NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO v_dif FROM (
    (SELECT e.cuenta_id, e.debe::numeric(18,2), e.haber::numeric(18,2), e.obra_id, e.maquinaria_id, e.item_id FROM public.contab_cbte_lineas_esperadas(NEW.comprobante_id) e
     EXCEPT ALL SELECT l.cuenta_id, l.debe::numeric(18,2), l.haber::numeric(18,2), l.obra_id, l.maquinaria_id, l.item_id FROM contab_asiento_lineas l WHERE l.asiento_id = NEW.id)
    UNION ALL
    (SELECT l.cuenta_id, l.debe::numeric(18,2), l.haber::numeric(18,2), l.obra_id, l.maquinaria_id, l.item_id FROM contab_asiento_lineas l WHERE l.asiento_id = NEW.id
     EXCEPT ALL SELECT e.cuenta_id, e.debe::numeric(18,2), e.haber::numeric(18,2), e.obra_id, e.maquinaria_id, e.item_id FROM public.contab_cbte_lineas_esperadas(NEW.comprobante_id) e)) d;
  IF v_dif > 0 THEN RAISE EXCEPTION 'El asiento no corresponde al comprobante (% diferencias en líneas): regenerá el borrador', v_dif; END IF;
  SELECT count(*) INTO v_dif FROM (
    (SELECT r.item_id, r.id, r.subcentro_id, r.importe_efectivo, r.obra_id, r.maquinaria_id FROM contab_item_repartos r JOIN contab_comprobante_items it ON it.id = r.item_id WHERE it.comprobante_id = NEW.comprobante_id
     EXCEPT ALL SELECT i.item_id, i.reparto_id, i.subcentro_id, i.importe, i.obra_id, i.maquinaria_id FROM contab_imputaciones_analiticas i JOIN contab_asiento_lineas l ON l.id = i.linea_id WHERE l.asiento_id = NEW.id AND i.tipo_movimiento = 'original')
    UNION ALL
    (SELECT i.item_id, i.reparto_id, i.subcentro_id, i.importe, i.obra_id, i.maquinaria_id FROM contab_imputaciones_analiticas i JOIN contab_asiento_lineas l ON l.id = i.linea_id WHERE l.asiento_id = NEW.id AND i.tipo_movimiento = 'original'
     EXCEPT ALL SELECT r.item_id, r.id, r.subcentro_id, r.importe_efectivo, r.obra_id, r.maquinaria_id FROM contab_item_repartos r JOIN contab_comprobante_items it ON it.id = r.item_id WHERE it.comprobante_id = NEW.comprobante_id)) d;
  IF v_dif > 0 THEN RAISE EXCEPTION 'Los repartos no coinciden con las imputaciones del borrador (% diferencias): regenerá el asiento', v_dif; END IF;
  IF EXISTS (SELECT 1 FROM contab_imputaciones_analiticas i JOIN contab_asiento_lineas l ON l.id = i.linea_id
              WHERE l.asiento_id = NEW.id AND (l.item_id IS NULL OR i.item_id IS DISTINCT FROM l.item_id)) THEN
    RAISE EXCEPTION 'Hay imputaciones en líneas fiscales o de contrapartida';
  END IF;
  UPDATE contab_comprobantes SET estado = 'confirmado', confirmado_at = now(), confirmado_por = auth.uid() WHERE id = NEW.comprobante_id AND estado = 'borrador';
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_asiento_cbte_sync() FROM PUBLIC, anon, authenticated;
CREATE CONSTRAINT TRIGGER contab_asiento_cbte_sync AFTER UPDATE OF estado ON public.contab_asientos
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado')
  EXECUTE FUNCTION public.contab_trg_asiento_cbte_sync();

CREATE VIEW public.contab_analitica_efecto WITH (security_invoker = true) AS
SELECT i.id, i.linea_id, l.asiento_id, a.fecha, a.estado AS asiento_estado, a.comprobante_id, a.reversa_de,
       i.subcentro_id, i.obra_id, i.maquinaria_id, i.naturaleza, i.tipo_movimiento, i.origen_fuente, i.importe,
       (i.importe * CASE WHEN (i.naturaleza = 'gasto') = (l.debe > 0) THEN 1 ELSE -1 END)::numeric(18,2) AS efecto
  FROM public.contab_imputaciones_analiticas i JOIN public.contab_asiento_lineas l ON l.id = i.linea_id JOIN public.contab_asientos a ON a.id = l.asiento_id
 WHERE a.estado IN ('confirmado','revertido');
GRANT SELECT ON public.contab_analitica_efecto TO authenticated;

CREATE OR REPLACE FUNCTION public.contab_generar_asiento_cbte(_cbte_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_c contab_comprobantes%ROWTYPE; v_as uuid; v_estado text; v_desc text; v_e record; v_linea uuid;
BEGIN
  IF NOT public.contab_puede_centros() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_c FROM contab_comprobantes WHERE id = _cbte_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  IF v_c.estado = 'anulado' THEN RAISE EXCEPTION 'Comprobante anulado'; END IF;
  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM contab_asientos WHERE id = v_c.asiento_id FOR UPDATE;
    IF v_estado <> 'borrador' THEN RAISE EXCEPTION 'El asiento está %: no se regenera', v_estado; END IF;
    v_as := v_c.asiento_id;
    DELETE FROM contab_imputaciones_analiticas WHERE linea_id IN (SELECT id FROM contab_asiento_lineas WHERE asiento_id = v_as);
    DELETE FROM contab_asiento_lineas WHERE asiento_id = v_as;
  END IF;
  SELECT e.descripcion INTO v_desc FROM public.contab_cbte_lineas_esperadas(v_c.id) e WHERE e.orden = 1;
  v_desc := regexp_replace(v_desc, '^(Deudores|Proveedores) - ', '');
  IF v_as IS NULL THEN
    INSERT INTO contab_asientos (fecha, descripcion, origen, comprobante_id, total_debe, total_haber, created_by)
    VALUES (v_c.fecha, v_desc, CASE WHEN v_c.es_venta THEN 'VENTA' ELSE 'COMPRA' END, v_c.id, v_c.total, v_c.total, auth.uid()) RETURNING id INTO v_as;
  ELSE
    UPDATE contab_asientos SET fecha = v_c.fecha, descripcion = v_desc, total_debe = v_c.total, total_haber = v_c.total WHERE id = v_as;
  END IF;
  FOR v_e IN SELECT * FROM public.contab_cbte_lineas_esperadas(v_c.id) ORDER BY 1 LOOP
    INSERT INTO contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, obra_id, maquinaria_id, item_id, regla_cuenta)
    VALUES (v_as, v_e.orden, v_e.cuenta_id, v_e.descripcion, v_e.debe, v_e.haber, v_e.obra_id, v_e.maquinaria_id, v_e.item_id, v_e.regla_cuenta) RETURNING id INTO v_linea;
    IF v_e.item_id IS NOT NULL THEN
      INSERT INTO contab_imputaciones_analiticas (linea_id, subcentro_id, obra_id, obra_atribucion, maquinaria_id, naturaleza, importe, reparto_id, item_id, nota)
      SELECT v_linea, r.subcentro_id, r.obra_id, r.obra_atribucion, r.maquinaria_id, CASE WHEN v_c.es_venta THEN 'ingreso' ELSE 'gasto' END, r.importe_efectivo, r.id, r.item_id, r.nota
        FROM contab_item_repartos r WHERE r.item_id = v_e.item_id ORDER BY r.created_at, r.id;
    END IF;
  END LOOP;
  IF v_c.asiento_id IS NULL THEN UPDATE contab_comprobantes SET asiento_id = v_as WHERE id = v_c.id; END IF;
  RETURN v_as;
END $$;

CREATE OR REPLACE FUNCTION public.contab_anular_comprobante(_cbte_id uuid, _motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_c public.contab_comprobantes%ROWTYPE; v_estado text; v_mot text;
BEGIN
  IF NOT public.contab_puede('asiento_revertir') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_c FROM public.contab_comprobantes WHERE id = _cbte_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  IF v_c.estado = 'anulado' THEN RETURN; END IF;
  v_mot := COALESCE(NULLIF(btrim(_motivo),''), 'Anulación de comprobante');
  IF EXISTS (SELECT 1 FROM public.contab_pagos p JOIN public.contab_asientos a ON a.id = p.asiento_id WHERE p.comprobante_id = v_c.id AND a.estado IN ('borrador','confirmado')) THEN
    RAISE EXCEPTION 'El comprobante tiene pagos/cobros registrados: revertí esos asientos primero';
  END IF;
  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM public.contab_asientos WHERE id = v_c.asiento_id;
    IF v_estado = 'borrador' THEN PERFORM public.contab_descartar_asiento(v_c.asiento_id);
    ELSIF v_estado = 'confirmado' THEN PERFORM public.contab_revertir_asiento(v_c.asiento_id, v_mot, NULL);
    END IF;
  END IF;
  UPDATE public.contab_comprobantes SET estado = 'anulado', anulado_at = now() WHERE id = v_c.id;
  UPDATE public.contab_vinculos_operativos SET estado = 'anulado', anulado_at = now(), anulado_motivo = v_mot WHERE comprobante_id = v_c.id AND estado = 'vigente';
END $$;