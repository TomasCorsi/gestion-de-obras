-- Auditoría
CREATE TABLE public.contab_auditoria (
  id bigserial PRIMARY KEY,
  tabla text NOT NULL,
  registro_id uuid,
  accion text NOT NULL,
  antes jsonb,
  despues jsonb,
  usuario uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contab_auditoria TO authenticated;
GRANT ALL ON public.contab_auditoria TO service_role;
ALTER TABLE public.contab_auditoria ENABLE ROW LEVEL SECURITY;

-- Permisos por acción
CREATE FUNCTION public.contab_puede(_accion text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN public.has_role(auth.uid(),'admin') THEN true
    WHEN _accion IN ('ver','asiento_confirmar','asiento_revertir','periodo_cerrar','ejercicio_crear')
      THEN public.has_role(auth.uid(),'contador')
    WHEN _accion = 'periodo_reabrir' THEN false
    WHEN _accion IN ('pago_registrar') THEN public.has_role(auth.uid(),'contador') OR public.has_role(auth.uid(),'tesorero')
    WHEN _accion IN ('pago_aprobar') THEN public.has_role(auth.uid(),'aprobador_pagos')
    ELSE false END
$$;
REVOKE ALL ON FUNCTION public.contab_puede(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_puede(text) TO authenticated;

CREATE POLICY contab_auditoria_select ON public.contab_auditoria FOR SELECT TO authenticated
  USING (public.contab_puede('ver'));

CREATE FUNCTION public.contab_trg_auditar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.contab_auditoria (tabla, registro_id, accion, antes, despues, usuario)
  VALUES (TG_TABLE_NAME,
          CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
          TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
          auth.uid());
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.contab_trg_auditar() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_contab_audit_asientos AFTER INSERT OR UPDATE OR DELETE ON public.contab_asientos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER trg_contab_audit_ejercicios AFTER INSERT OR UPDATE OR DELETE ON public.contab_ejercicios
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER trg_contab_audit_periodos AFTER INSERT OR UPDATE OR DELETE ON public.contab_periodos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER trg_contab_audit_cuentas_config AFTER INSERT OR UPDATE OR DELETE ON public.contab_cuentas_config
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

-- Crear ejercicio con sus períodos mensuales
CREATE FUNCTION public.contab_crear_ejercicio(_nombre text, _desde date, _hasta date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_ini date; v_fin date;
BEGIN
  IF NOT public.contab_puede('ejercicio_crear') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _desde IS NULL OR _hasta IS NULL OR _hasta <= _desde THEN RAISE EXCEPTION 'Rango de fechas inválido'; END IF;
  IF _hasta > (_desde + interval '18 months')::date THEN RAISE EXCEPTION 'Un ejercicio no puede superar 18 meses'; END IF;
  INSERT INTO public.contab_ejercicios (nombre, fecha_desde, fecha_hasta, created_by)
  VALUES (btrim(_nombre), _desde, _hasta, auth.uid()) RETURNING id INTO v_id;
  v_ini := _desde;
  WHILE v_ini <= _hasta LOOP
    v_fin := LEAST((date_trunc('month', v_ini) + interval '1 month - 1 day')::date, _hasta);
    INSERT INTO public.contab_periodos (ejercicio_id, anio, mes, fecha_desde, fecha_hasta)
    VALUES (v_id, extract(year from v_ini)::int, extract(month from v_ini)::int, v_ini, v_fin);
    v_ini := v_fin + 1;
  END LOOP;
  RETURN v_id;
END $$;

-- Confirmar con numeración correlativa por ejercicio
CREATE FUNCTION public.contab_confirmar_asiento(_asiento_id uuid)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_a public.contab_asientos%ROWTYPE; v_per public.contab_periodos%ROWTYPE; v_num bigint;
BEGIN
  IF NOT public.contab_puede('asiento_confirmar') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_a FROM public.contab_asientos WHERE id = _asiento_id FOR UPDATE;
  IF v_a.id IS NULL THEN RAISE EXCEPTION 'Asiento no encontrado'; END IF;
  IF v_a.estado <> 'borrador' THEN RAISE EXCEPTION 'El asiento ya está %', v_a.estado; END IF;
  SELECT * INTO v_per FROM public.contab_periodos
   WHERE v_a.fecha BETWEEN fecha_desde AND fecha_hasta FOR SHARE;
  IF v_per.id IS NULL THEN RAISE EXCEPTION 'No hay período contable para la fecha %', v_a.fecha; END IF;
  IF v_per.estado <> 'abierto' THEN RAISE EXCEPTION 'El período %/% está cerrado', v_per.mes, v_per.anio; END IF;
  UPDATE public.contab_ejercicios SET ultimo_numero = ultimo_numero + 1
   WHERE id = v_per.ejercicio_id AND estado = 'abierto' RETURNING ultimo_numero INTO v_num;
  IF v_num IS NULL THEN RAISE EXCEPTION 'El ejercicio está cerrado'; END IF;
  UPDATE public.contab_asientos SET estado = 'confirmado', ejercicio_id = v_per.ejercicio_id,
    periodo_id = v_per.id, numero_ejercicio = v_num, confirmado_at = now(), confirmado_por = auth.uid()
   WHERE id = _asiento_id;
  RETURN v_num;
END $$;

-- Revertir con contraasiento espejo
CREATE FUNCTION public.contab_revertir_asiento(_asiento_id uuid, _motivo text, _fecha date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_a public.contab_asientos%ROWTYPE; v_rid uuid;
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
  RETURN v_rid;
END $$;

-- Cierre y reapertura de períodos
CREATE FUNCTION public.contab_cerrar_periodo(_periodo_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.contab_puede('periodo_cerrar') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  PERFORM 1 FROM public.contab_periodos WHERE id = _periodo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Período no encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_asientos a JOIN public.contab_periodos p ON p.id = _periodo_id
             WHERE a.estado = 'borrador' AND a.fecha BETWEEN p.fecha_desde AND p.fecha_hasta) THEN
    RAISE EXCEPTION 'Hay asientos en borrador dentro del período: confirmalos o borralos antes de cerrar';
  END IF;
  UPDATE public.contab_periodos SET estado = 'cerrado', cerrado_at = now(), cerrado_por = auth.uid()
   WHERE id = _periodo_id AND estado = 'abierto';
END $$;

CREATE FUNCTION public.contab_reabrir_periodo(_periodo_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.contab_puede('periodo_reabrir') THEN RAISE EXCEPTION 'Solo un administrador puede reabrir períodos'; END IF;
  IF NULLIF(btrim(COALESCE(_motivo,'')),'') IS NULL THEN RAISE EXCEPTION 'Indicá el motivo de la reapertura'; END IF;
  UPDATE public.contab_periodos SET estado = 'abierto', reabierto_at = now(), reabierto_por = auth.uid(),
    motivo_reapertura = btrim(_motivo)
   WHERE id = _periodo_id AND estado = 'cerrado';
  IF NOT FOUND THEN RAISE EXCEPTION 'El período no está cerrado'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.contab_crear_ejercicio(text,date,date), public.contab_confirmar_asiento(uuid),
  public.contab_revertir_asiento(uuid,text,date), public.contab_cerrar_periodo(uuid),
  public.contab_reabrir_periodo(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_crear_ejercicio(text,date,date), public.contab_confirmar_asiento(uuid),
  public.contab_revertir_asiento(uuid,text,date), public.contab_cerrar_periodo(uuid),
  public.contab_reabrir_periodo(uuid,text) TO authenticated;

-- Sin escritura directa de usuarios sobre asientos y líneas: solo funciones
DROP POLICY IF EXISTS contab_as_modify ON public.contab_asientos;
DROP POLICY IF EXISTS contab_asl_modify ON public.contab_asiento_lineas;
REVOKE INSERT, UPDATE, DELETE ON public.contab_asientos, public.contab_asiento_lineas FROM anon, authenticated;