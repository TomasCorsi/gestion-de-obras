CREATE TABLE public.contab_pago_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL REFERENCES public.contab_pagos(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 1,
  medio public.contab_pago_medio NOT NULL,
  moneda text NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  importe_moneda numeric(16,2) NOT NULL CHECK (importe_moneda > 0),
  cotizacion numeric(16,4) NOT NULL DEFAULT 1 CHECK (cotizacion > 0),
  importe numeric(16,2) NOT NULL CHECK (importe > 0),
  cuenta_id uuid REFERENCES public.contab_plan_cuentas(id),
  referencia text,
  cheque_banco text,
  cheque_numero text,
  cheque_fecha_pago date,
  cheque_librador text,
  cheque_estado text NOT NULL DEFAULT 'en_cartera' CHECK (cheque_estado IN ('en_cartera','depositado','entregado','rechazado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contab_pago_valores_pago_idx ON public.contab_pago_valores(pago_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_pago_valores TO authenticated;
GRANT ALL ON public.contab_pago_valores TO service_role;
ALTER TABLE public.contab_pago_valores ENABLE ROW LEVEL SECURITY;
CREATE POLICY contab_pago_valores_all ON public.contab_pago_valores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE TRIGGER trg_contab_pago_valores_upd BEFORE UPDATE ON public.contab_pago_valores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.contab_guardar_cobro_valores(p_cabecera jsonb, p_valores jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE v_id uuid; v_total numeric := 0; v jsonb; i int := 0; v_imp numeric; v_cot numeric; v_mon text;
BEGIN
  IF jsonb_array_length(COALESCE(p_valores,'[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Cargá al menos un valor'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_valores) LOOP
    v_mon := COALESCE(v->>'moneda','ARS');
    v_cot := CASE WHEN v_mon='ARS' THEN 1 ELSE (v->>'cotizacion')::numeric END;
    IF v_cot IS NULL OR v_cot <= 0 THEN RAISE EXCEPTION 'Falta la cotización del dólar'; END IF;
    v_total := v_total + round((v->>'importe_moneda')::numeric * v_cot, 2);
  END LOOP;
  INSERT INTO public.contab_pagos (es_cobro, fecha, tercero_id, medio, monto, cuenta_id, referencia, observaciones, obra_id, maquinaria_id, comprobante_id, created_by)
  VALUES ((p_cabecera->>'es_cobro')::boolean, (p_cabecera->>'fecha')::date, NULLIF(p_cabecera->>'tercero_id','')::uuid,
    (CASE WHEN jsonb_array_length(p_valores)=1 THEN p_valores->0->>'medio' ELSE 'otro' END)::public.contab_pago_medio,
    v_total, NULL, NULLIF(p_cabecera->>'referencia',''), NULLIF(p_cabecera->>'observaciones',''),
    NULLIF(p_cabecera->>'obra_id','')::uuid, NULLIF(p_cabecera->>'maquinaria_id','')::uuid, NULLIF(p_cabecera->>'comprobante_id','')::uuid, auth.uid())
  RETURNING id INTO v_id;
  FOR v IN SELECT * FROM jsonb_array_elements(p_valores) LOOP
    i := i + 1;
    v_mon := COALESCE(v->>'moneda','ARS');
    v_cot := CASE WHEN v_mon='ARS' THEN 1 ELSE (v->>'cotizacion')::numeric END;
    v_imp := round((v->>'importe_moneda')::numeric * v_cot, 2);
    INSERT INTO public.contab_pago_valores (pago_id, orden, medio, moneda, importe_moneda, cotizacion, importe, cuenta_id, referencia, cheque_banco, cheque_numero, cheque_fecha_pago, cheque_librador)
    VALUES (v_id, i, (v->>'medio')::public.contab_pago_medio, v_mon, (v->>'importe_moneda')::numeric, v_cot, v_imp,
      NULLIF(v->>'cuenta_id','')::uuid, NULLIF(v->>'referencia',''), NULLIF(v->>'cheque_banco',''), NULLIF(v->>'cheque_numero',''),
      NULLIF(v->>'cheque_fecha_pago','')::date, NULLIF(v->>'cheque_librador',''));
  END LOOP;
  PERFORM public.contab_generar_asiento_pago(v_id);
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.contab_guardar_cobro_valores(jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.contab_generar_asiento_pago(_pago_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pago public.contab_pagos%ROWTYPE;
  v_asiento_id uuid; v_tercero text; v_desc text; v_cuenta_contracta uuid; v_cuenta_caja uuid;
  r record; v_orden int := 0; v_hay_valores boolean;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT * INTO v_pago FROM public.contab_pagos WHERE id = _pago_id;
  IF v_pago.id IS NULL THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF v_pago.asiento_id IS NOT NULL THEN RETURN v_pago.asiento_id; END IF;

  SELECT COALESCE(razon_social,'-') INTO v_tercero FROM public.contab_terceros WHERE id = v_pago.tercero_id;
  v_desc := CASE WHEN v_pago.es_cobro THEN 'Cobranza ' ELSE 'Pago ' END || COALESCE(v_tercero,'') || ' - ' || v_pago.medio::text;

  IF v_pago.es_cobro THEN
    SELECT id INTO v_cuenta_contracta FROM public.contab_plan_cuentas WHERE codigo='1.1.2.01' LIMIT 1;
  ELSE
    SELECT id INTO v_cuenta_contracta FROM public.contab_plan_cuentas WHERE codigo='2.1.1.01' LIMIT 1;
  END IF;

  INSERT INTO public.contab_asientos (fecha, descripcion, origen, pago_id, total_debe, total_haber, created_by)
  VALUES (v_pago.fecha, v_desc, CASE WHEN v_pago.es_cobro THEN 'COBRO' ELSE 'PAGO' END, v_pago.id, v_pago.monto, v_pago.monto, auth.uid())
  RETURNING id INTO v_asiento_id;

  SELECT EXISTS(SELECT 1 FROM public.contab_pago_valores WHERE pago_id = v_pago.id) INTO v_hay_valores;

  IF v_pago.es_cobro AND v_hay_valores THEN
    FOR r IN SELECT * FROM public.contab_pago_valores WHERE pago_id = v_pago.id ORDER BY orden LOOP
      v_orden := v_orden + 1;
      v_cuenta_caja := r.cuenta_id;
      IF v_cuenta_caja IS NULL THEN
        SELECT id INTO v_cuenta_caja FROM public.contab_plan_cuentas WHERE codigo = CASE WHEN r.medio = 'efectivo' THEN '1.1.1.01' ELSE '1.1.1.02' END LIMIT 1;
      END IF;
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
      VALUES (v_asiento_id, v_orden, v_cuenta_caja,
        r.medio::text || CASE WHEN r.moneda='USD' THEN ' US$ ' || r.importe_moneda || ' x ' || r.cotizacion ELSE '' END
          || CASE WHEN r.cheque_numero IS NOT NULL THEN ' Nº ' || r.cheque_numero || COALESCE(' ' || r.cheque_banco,'') ELSE '' END,
        r.importe, v_pago.obra_id, v_pago.maquinaria_id);
    END LOOP;
    INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
    VALUES (v_asiento_id, v_orden + 1, v_cuenta_contracta, 'Cancelación deuda', v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
  ELSE
    v_cuenta_caja := v_pago.cuenta_id;
    IF v_cuenta_caja IS NULL THEN
      SELECT id INTO v_cuenta_caja FROM public.contab_plan_cuentas WHERE codigo = CASE WHEN v_pago.medio = 'efectivo' THEN '1.1.1.01' ELSE '1.1.1.02' END LIMIT 1;
    END IF;
    IF v_pago.es_cobro THEN
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
      VALUES (v_asiento_id, 1, v_cuenta_caja, v_desc, v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
      VALUES (v_asiento_id, 2, v_cuenta_contracta, 'Cancelación deuda', v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
    ELSE
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, obra_id, maquinaria_id)
      VALUES (v_asiento_id, 1, v_cuenta_contracta, 'Cancelación deuda', v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
      INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, haber, obra_id, maquinaria_id)
      VALUES (v_asiento_id, 2, v_cuenta_caja, v_desc, v_pago.monto, v_pago.obra_id, v_pago.maquinaria_id);
    END IF;
  END IF;

  UPDATE public.contab_pagos SET asiento_id = v_asiento_id WHERE id = v_pago.id;

  IF v_pago.comprobante_id IS NOT NULL THEN
    UPDATE public.contab_comprobantes c
      SET estado = CASE
        WHEN (SELECT COALESCE(SUM(monto),0) FROM public.contab_pagos WHERE comprobante_id = c.id) >= c.total THEN 'pagado'::public.contab_cbte_estado
        WHEN (SELECT COALESCE(SUM(monto),0) FROM public.contab_pagos WHERE comprobante_id = c.id) > 0 THEN 'parcial'::public.contab_cbte_estado
        ELSE c.estado END
      WHERE id = v_pago.comprobante_id AND estado IN ('confirmado','parcial');
  END IF;

  RETURN v_asiento_id;
END; $function$;