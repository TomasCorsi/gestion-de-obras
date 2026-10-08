CREATE OR REPLACE FUNCTION public.recalcular_horas_maquinas()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_h integer := 0; v_k integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden recalcular horas';
  END IF;

  WITH ultimos AS (
    SELECT DISTINCT ON (p.maquinaria_id) p.maquinaria_id,
      GREATEST(COALESCE(p.horometro_fin,0), COALESCE(p.horometro_inicio,0)) AS h
    FROM partes_diarios p
    WHERE p.maquinaria_id IS NOT NULL
      AND GREATEST(COALESCE(p.horometro_fin,0), COALESCE(p.horometro_inicio,0)) > 0
    ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
  )
  UPDATE maquinarias m SET horas_acumuladas = u.h FROM ultimos u WHERE m.id = u.maquinaria_id;
  GET DIAGNOSTICS v_h = ROW_COUNT;

  WITH ultimos AS (
    SELECT DISTINCT ON (p.maquinaria_id) p.maquinaria_id, p.km_camion
    FROM partes_diarios p
    WHERE p.maquinaria_id IS NOT NULL AND p.km_camion > 0
    ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
  )
  UPDATE maquinarias m SET km_acumulados = u.km_camion FROM ultimos u WHERE m.id = u.maquinaria_id;
  GET DIAGNOSTICS v_k = ROW_COUNT;

  RETURN GREATEST(v_h, v_k);
END;
$function$;