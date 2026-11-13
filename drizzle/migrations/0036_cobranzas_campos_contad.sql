ALTER TYPE public.contab_pago_medio ADD VALUE IF NOT EXISTS 'echeck';
ALTER TABLE public.contab_pagos
  ADD COLUMN IF NOT EXISTS recibo_numero text,
  ADD COLUMN IF NOT EXISTS recibo_provisorio text,
  ADD COLUMN IF NOT EXISTS concepto text,
  ADD COLUMN IF NOT EXISTS moneda_declarada text NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS importe_declarado numeric(16,2);
ALTER TABLE public.contab_pago_valores ADD COLUMN IF NOT EXISTS cheque_cuit text;

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
  INSERT INTO public.contab_pagos (es_cobro, fecha, tercero_id, medio, monto, cuenta_id, referencia, observaciones, obra_id, maquinaria_id, comprobante_id, created_by,
    recibo_numero, recibo_provisorio, concepto, moneda_declarada, importe_declarado)
  VALUES ((p_cabecera->>'es_cobro')::boolean, (p_cabecera->>'fecha')::date, NULLIF(p_cabecera->>'tercero_id','')::uuid,
    (CASE WHEN jsonb_array_length(p_valores)=1 THEN p_valores->0->>'medio' ELSE 'otro' END)::public.contab_pago_medio,
    v_total, NULL, NULLIF(p_cabecera->>'referencia',''), NULLIF(p_cabecera->>'observaciones',''),
    NULLIF(p_cabecera->>'obra_id','')::uuid, NULLIF(p_cabecera->>'maquinaria_id','')::uuid, NULLIF(p_cabecera->>'comprobante_id','')::uuid, auth.uid(),
    NULLIF(p_cabecera->>'recibo_numero',''), NULLIF(p_cabecera->>'recibo_provisorio',''), NULLIF(p_cabecera->>'concepto',''),
    COALESCE(NULLIF(p_cabecera->>'moneda_declarada',''),'ARS'), NULLIF(p_cabecera->>'importe_declarado','')::numeric)
  RETURNING id INTO v_id;
  FOR v IN SELECT * FROM jsonb_array_elements(p_valores) LOOP
    i := i + 1;
    v_mon := COALESCE(v->>'moneda','ARS');
    v_cot := CASE WHEN v_mon='ARS' THEN 1 ELSE (v->>'cotizacion')::numeric END;
    v_imp := round((v->>'importe_moneda')::numeric * v_cot, 2);
    INSERT INTO public.contab_pago_valores (pago_id, orden, medio, moneda, importe_moneda, cotizacion, importe, cuenta_id, referencia, cheque_banco, cheque_numero, cheque_fecha_pago, cheque_librador, cheque_cuit)
    VALUES (v_id, i, (v->>'medio')::public.contab_pago_medio, v_mon, (v->>'importe_moneda')::numeric, v_cot, v_imp,
      NULLIF(v->>'cuenta_id','')::uuid, NULLIF(v->>'referencia',''), NULLIF(v->>'cheque_banco',''), NULLIF(v->>'cheque_numero',''),
      NULLIF(v->>'cheque_fecha_pago','')::date, NULLIF(v->>'cheque_librador',''), NULLIF(v->>'cheque_cuit',''));
  END LOOP;
  PERFORM public.contab_generar_asiento_pago(v_id);
  RETURN v_id;
END; $$;