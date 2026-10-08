CREATE OR REPLACE FUNCTION public.recalcular_horas_maquinas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_h integer := 0;
  v_k integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden recalcular horas';
  END IF;

  WITH stats AS (
    SELECT maquinaria_id, percentile_cont(0.9) WITHIN GROUP (ORDER BY horometro_fin) AS p90, COUNT(*) AS n
    FROM partes_diarios
    WHERE estado = 'completado' AND maquinaria_id IS NOT NULL AND horometro_fin > 0
    GROUP BY maquinaria_id
  ), ultimos AS (
    SELECT DISTINCT ON (p.maquinaria_id) p.maquinaria_id, p.horometro_fin
    FROM partes_diarios p JOIN stats s ON s.maquinaria_id = p.maquinaria_id
    WHERE p.estado = 'completado' AND p.horometro_fin > 0
      AND (s.n < 5 OR p.horometro_fin <= s.p90 * 1.15)
    ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
  )
  UPDATE maquinarias m SET horas_acumuladas = u.horometro_fin
  FROM ultimos u WHERE m.id = u.maquinaria_id;
  GET DIAGNOSTICS v_h = ROW_COUNT;

  WITH stats AS (
    SELECT maquinaria_id, percentile_cont(0.9) WITHIN GROUP (ORDER BY km_camion) AS p90, COUNT(*) AS n
    FROM partes_diarios
    WHERE estado = 'completado' AND maquinaria_id IS NOT NULL AND km_camion > 0
    GROUP BY maquinaria_id
  ), ultimos AS (
    SELECT DISTINCT ON (p.maquinaria_id) p.maquinaria_id, p.km_camion
    FROM partes_diarios p JOIN stats s ON s.maquinaria_id = p.maquinaria_id
    WHERE p.estado = 'completado' AND p.km_camion > 0
      AND (s.n < 5 OR p.km_camion <= s.p90 * 1.15)
    ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
  )
  UPDATE maquinarias m SET km_acumulados = u.km_camion
  FROM ultimos u WHERE m.id = u.maquinaria_id;
  GET DIAGNOSTICS v_k = ROW_COUNT;

  RETURN GREATEST(v_h, v_k);
END;
$$;

REVOKE ALL ON FUNCTION public.recalcular_horas_maquinas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_horas_maquinas() TO authenticated;