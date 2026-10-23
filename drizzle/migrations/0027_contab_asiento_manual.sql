CREATE FUNCTION public.contab_crear_asiento_manual(_fecha date, _descripcion text, _lineas jsonb, _tipo text DEFAULT 'AJUSTE')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_debe numeric; v_haber numeric;
BEGIN
  IF NOT public.contab_puede('asiento_confirmar') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _fecha IS NULL OR NULLIF(btrim(COALESCE(_descripcion,'')),'') IS NULL THEN RAISE EXCEPTION 'Fecha y descripción son obligatorias'; END IF;
  IF _tipo NOT IN ('AJUSTE','RECLASIFICACION','APERTURA','CIERRE','MANUAL') THEN RAISE EXCEPTION 'Tipo de asiento manual inválido'; END IF;
  IF jsonb_typeof(_lineas) IS DISTINCT FROM 'array' OR jsonb_array_length(_lineas) < 2 THEN RAISE EXCEPTION 'El asiento necesita al menos dos líneas'; END IF;
  SELECT COALESCE(SUM(COALESCE((l->>'debe')::numeric,0)),0), COALESCE(SUM(COALESCE((l->>'haber')::numeric,0)),0)
    INTO v_debe, v_haber FROM jsonb_array_elements(_lineas) l;
  IF v_debe = 0 OR v_debe <> v_haber THEN RAISE EXCEPTION 'Asiento descuadrado: debe % / haber %', v_debe, v_haber; END IF;
  INSERT INTO public.contab_asientos (fecha, descripcion, origen, total_debe, total_haber, created_by)
  VALUES (_fecha, btrim(_descripcion), _tipo, v_debe, v_haber, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO public.contab_asiento_lineas (asiento_id, orden, cuenta_id, descripcion, debe, haber, obra_id, maquinaria_id)
  SELECT v_id, ord::int, (l->>'cuenta_id')::uuid, NULLIF(l->>'descripcion',''),
         COALESCE((l->>'debe')::numeric,0), COALESCE((l->>'haber')::numeric,0),
         NULLIF(l->>'obra_id','')::uuid, NULLIF(l->>'maquinaria_id','')::uuid
    FROM jsonb_array_elements(_lineas) WITH ORDINALITY AS t(l, ord);
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.contab_crear_asiento_manual(date,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_crear_asiento_manual(date,text,jsonb,text) TO authenticated;