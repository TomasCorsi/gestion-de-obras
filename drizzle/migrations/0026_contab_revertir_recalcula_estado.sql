CREATE OR REPLACE FUNCTION public.contab_revertir_asiento(_asiento_id uuid, _motivo text, _fecha date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_a public.contab_asientos%ROWTYPE; v_rid uuid; v_cbte uuid; v_cobrado numeric;
BEGIN
  IF NOT public.contab_puede('asiento_revertir') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF NULLIF(btrim(COALESCE(_motivo,'')),'') IS NULL THEN RAISE EXCEPTION 'Indicá el motivo de la reversa'; END IF;
  SELECT * INTO v_a FROM public.contab_asientos WHERE id = _asiento_id FOR UPDATE;
  IF v_a.id IS NULL THEN RAISE EXCEPTION 'Asiento no encontrado'; END IF;
  IF v_a.estado <> 'confirmado' THEN RAISE EXCEPTION 'Solo se revierten asientos confirmados'; END IF;
  INSERT INTO public.contab_asientos (fecha, descripcion, origen, comprobante_id, pago_id, origen_tipo, origen_id,
    clave_evento, reversa_de, motivo, created_by)
  VALUES (COALESCE(_fecha, current_date), 'Reversa: ' || v_a.descripcion, 'REVERSA', v_a.comprobante_id, v_a.pago_id,
    v_a.origen_tipo, v_a.origen_id, 'reversa:' || v_a.id::text, v_a.id, btrim(_motivo), auth.uid())
  RETURNING id INTO v_rid;
  INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, obra_id,
    maquinaria_id, moneda, cotizacion, importe_origen)
  SELECT v_rid, orden, cuenta_id, descripcion, haber, debe, obra_id, maquinaria_id, moneda, cotizacion, importe_origen
    FROM public.contab_asiento_lineas WHERE asiento_id = v_a.id;
  PERFORM public.contab_confirmar_asiento(v_rid);
  UPDATE public.contab_asientos SET estado = 'revertido', revertido_por = v_rid WHERE id = v_a.id;

  -- Si era un pago/cobro, recalcular el estado del comprobante con los pagos vigentes
  IF v_a.pago_id IS NOT NULL THEN
    SELECT comprobante_id INTO v_cbte FROM public.contab_pagos WHERE id = v_a.pago_id;
    IF v_cbte IS NOT NULL THEN
      SELECT COALESCE(SUM(p.monto),0) INTO v_cobrado FROM public.contab_pagos p
        JOIN public.contab_asientos a ON a.id = p.asiento_id
       WHERE p.comprobante_id = v_cbte AND a.estado IN ('borrador','confirmado');
      UPDATE public.contab_comprobantes c SET estado = CASE
          WHEN v_cobrado >= c.total THEN 'pagado'::public.contab_cbte_estado
          WHEN v_cobrado > 0 THEN 'parcial'::public.contab_cbte_estado
          ELSE 'confirmado'::public.contab_cbte_estado END
       WHERE c.id = v_cbte AND c.estado IN ('pagado','parcial','confirmado');
    END IF;
  END IF;
  RETURN v_rid;
END $$;