-- Documentos con asiento vigente (borrador o confirmado) no se editan ni borran directamente
CREATE FUNCTION public.contab_trg_doc_con_asiento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_asiento uuid; v_estado text;
BEGIN
  IF NOT public.contab_es_usuario_directo() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_TABLE_NAME = 'contab_comprobante_items' THEN
    SELECT c.asiento_id INTO v_asiento FROM public.contab_comprobantes c
     WHERE c.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.comprobante_id ELSE NEW.comprobante_id END;
  ELSIF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSE
    v_asiento := OLD.asiento_id;
  END IF;
  IF v_asiento IS NOT NULL THEN
    SELECT estado INTO v_estado FROM public.contab_asientos WHERE id = v_asiento;
    IF v_estado IN ('borrador','confirmado') THEN
      RAISE EXCEPTION 'El documento tiene un asiento % : descartalo (si es borrador) o revertilo antes de modificarlo', v_estado;
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.contab_trg_doc_con_asiento() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_contab_cbte_con_asiento BEFORE UPDATE OR DELETE ON public.contab_comprobantes
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_doc_con_asiento();
CREATE TRIGGER trg_contab_pago_con_asiento BEFORE UPDATE OR DELETE ON public.contab_pagos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_doc_con_asiento();
CREATE TRIGGER trg_contab_items_con_asiento BEFORE INSERT OR UPDATE OR DELETE ON public.contab_comprobante_items
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_doc_con_asiento();

-- Descartar un asiento en borrador y liberar su documento
CREATE FUNCTION public.contab_descartar_asiento(_asiento_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_a public.contab_asientos%ROWTYPE;
BEGIN
  IF NOT public.contab_puede('asiento_confirmar') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_a FROM public.contab_asientos WHERE id = _asiento_id FOR UPDATE;
  IF v_a.id IS NULL THEN RAISE EXCEPTION 'Asiento no encontrado'; END IF;
  IF v_a.estado <> 'borrador' THEN RAISE EXCEPTION 'Solo se descartan borradores; un asiento confirmado se revierte'; END IF;
  UPDATE public.contab_comprobantes SET asiento_id = NULL,
    estado = CASE WHEN estado = 'confirmado' THEN 'borrador'::public.contab_cbte_estado ELSE estado END,
    confirmado_at = NULL, confirmado_por = NULL
   WHERE asiento_id = v_a.id;
  UPDATE public.contab_pagos SET asiento_id = NULL WHERE asiento_id = v_a.id;
  DELETE FROM public.contab_asientos WHERE id = v_a.id;
END $$;

-- Anular un comprobante: descarta o revierte su asiento
CREATE FUNCTION public.contab_anular_comprobante(_cbte_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_c public.contab_comprobantes%ROWTYPE; v_estado text;
BEGIN
  IF NOT public.contab_puede('asiento_revertir') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_c FROM public.contab_comprobantes WHERE id = _cbte_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Comprobante no encontrado'; END IF;
  IF v_c.estado = 'anulado' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_pagos p JOIN public.contab_asientos a ON a.id = p.asiento_id
             WHERE p.comprobante_id = v_c.id AND a.estado IN ('borrador','confirmado')) THEN
    RAISE EXCEPTION 'El comprobante tiene pagos/cobros registrados: revertí esos asientos primero';
  END IF;
  IF v_c.asiento_id IS NOT NULL THEN
    SELECT estado INTO v_estado FROM public.contab_asientos WHERE id = v_c.asiento_id;
    IF v_estado = 'borrador' THEN
      PERFORM public.contab_descartar_asiento(v_c.asiento_id);
    ELSIF v_estado = 'confirmado' THEN
      PERFORM public.contab_revertir_asiento(v_c.asiento_id, COALESCE(NULLIF(btrim(_motivo),''), 'Anulación de comprobante'), NULL);
    END IF;
  END IF;
  UPDATE public.contab_comprobantes SET estado = 'anulado', anulado_at = now() WHERE id = v_c.id;
END $$;

REVOKE ALL ON FUNCTION public.contab_descartar_asiento(uuid), public.contab_anular_comprobante(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_descartar_asiento(uuid), public.contab_anular_comprobante(uuid,text) TO authenticated;