ALTER TABLE public.contab_asientos
  ADD COLUMN ejercicio_id uuid REFERENCES public.contab_ejercicios(id) ON DELETE RESTRICT,
  ADD COLUMN periodo_id uuid REFERENCES public.contab_periodos(id) ON DELETE RESTRICT,
  ADD COLUMN numero_ejercicio bigint,
  ADD COLUMN estado text NOT NULL DEFAULT 'borrador',
  ADD COLUMN origen_tipo text,
  ADD COLUMN origen_id uuid,
  ADD COLUMN clave_evento text NOT NULL DEFAULT 'alta',
  ADD COLUMN reversa_de uuid REFERENCES public.contab_asientos(id) ON DELETE RESTRICT,
  ADD COLUMN revertido_por uuid REFERENCES public.contab_asientos(id) ON DELETE RESTRICT,
  ADD COLUMN confirmado_at timestamptz,
  ADD COLUMN confirmado_por uuid,
  ADD COLUMN motivo text,
  ADD COLUMN version integer NOT NULL DEFAULT 1;

ALTER TABLE public.contab_asientos
  ADD CONSTRAINT chk_asiento_estado CHECK (estado IN ('borrador','confirmado','revertido')),
  ADD CONSTRAINT chk_asiento_origen CHECK ((origen_tipo IS NULL) = (origen_id IS NULL)),
  ADD CONSTRAINT chk_asiento_confirmado CHECK (estado = 'borrador' OR (ejercicio_id IS NOT NULL
      AND periodo_id IS NOT NULL AND numero_ejercicio IS NOT NULL AND confirmado_at IS NOT NULL)),
  ADD CONSTRAINT chk_asiento_reversa_propia CHECK (reversa_de IS NULL OR reversa_de <> id),
  ADD CONSTRAINT chk_asiento_revertido CHECK ((estado = 'revertido') = (revertido_por IS NOT NULL)),
  ADD CONSTRAINT chk_asiento_reversa_clave CHECK (reversa_de IS NULL OR clave_evento = 'reversa:' || reversa_de::text);

CREATE UNIQUE INDEX uq_contab_asiento_numero ON public.contab_asientos (ejercicio_id, numero_ejercicio) WHERE numero_ejercicio IS NOT NULL;
CREATE UNIQUE INDEX uq_contab_asiento_origen_evento ON public.contab_asientos (origen_tipo, origen_id, clave_evento)
  WHERE origen_id IS NOT NULL AND estado IN ('borrador','confirmado');
CREATE UNIQUE INDEX uq_contab_asiento_reversa ON public.contab_asientos (reversa_de) WHERE reversa_de IS NOT NULL;
CREATE INDEX idx_contab_asientos_periodo ON public.contab_asientos (periodo_id, fecha);

ALTER TABLE public.contab_asiento_lineas
  ADD COLUMN moneda text NOT NULL DEFAULT 'ARS',
  ADD COLUMN cotizacion numeric(18,6) NOT NULL DEFAULT 1,
  ADD COLUMN importe_origen numeric(18,2),
  ADD CONSTRAINT chk_linea_montos CHECK (debe >= 0 AND haber >= 0 AND ((debe > 0) <> (haber > 0))),
  ADD CONSTRAINT chk_linea_cotizacion CHECK (cotizacion > 0);
CREATE INDEX idx_contab_lineas_cuenta ON public.contab_asiento_lineas (cuenta_id);

CREATE FUNCTION public.contab_es_usuario_directo()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT current_user IN ('authenticated','anon')
$$;

CREATE FUNCTION public.contab_trg_periodo_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE e public.contab_ejercicios%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.contab_ejercicios WHERE id = NEW.ejercicio_id FOR SHARE;
  IF NEW.fecha_desde < e.fecha_desde OR NEW.fecha_hasta > e.fecha_hasta THEN
    RAISE EXCEPTION 'El período está fuera del ejercicio';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.ejercicio_id, NEW.fecha_desde, NEW.fecha_hasta) IS DISTINCT FROM (OLD.ejercicio_id, OLD.fecha_desde, OLD.fecha_hasta)
       AND EXISTS (SELECT 1 FROM public.contab_asientos a WHERE a.periodo_id = OLD.id) THEN
      RAISE EXCEPTION 'El período tiene asientos: no se pueden cambiar sus fechas';
    END IF;
    IF OLD.estado = 'cerrado' AND NEW.estado = 'abierto' THEN
      IF e.estado = 'cerrado' THEN RAISE EXCEPTION 'El ejercicio está cerrado'; END IF;
      IF NEW.motivo_reapertura IS NULL OR NEW.reabierto_por IS NULL THEN
        RAISE EXCEPTION 'Reabrir un período exige motivo y responsable';
      END IF;
    END IF;
  ELSIF e.estado = 'cerrado' THEN
    RAISE EXCEPTION 'El ejercicio está cerrado';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_periodo_valida BEFORE INSERT OR UPDATE ON public.contab_periodos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_periodo_valida();

CREATE FUNCTION public.contab_trg_asiento_guarda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_per public.contab_periodos%ROWTYPE;
  v_debe numeric; v_haber numeric; v_malas integer; v_dif integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'borrador' THEN RAISE EXCEPTION 'Un asiento nace en borrador'; END IF;
    IF NEW.reversa_de IS NOT NULL AND public.contab_es_usuario_directo() THEN
      RAISE EXCEPTION 'Los contraasientos solo se generan con la función de reversa';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado <> 'borrador' THEN RAISE EXCEPTION 'No se puede borrar un asiento confirmado'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.estado = 'revertido' THEN RAISE EXCEPTION 'Asiento revertido: no admite cambios'; END IF;
  IF OLD.estado = 'confirmado' THEN
    IF public.contab_es_usuario_directo() THEN
      RAISE EXCEPTION 'Asiento confirmado: solo la función de reversa puede marcarlo';
    END IF;
    IF NEW.estado <> 'revertido' OR NEW.revertido_por IS NULL
       OR (to_jsonb(NEW) - ARRAY['estado','revertido_por','updated_at','version'])
          IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['estado','revertido_por','updated_at','version'])
       OR NOT EXISTS (SELECT 1 FROM public.contab_asientos r
                      WHERE r.id = NEW.revertido_por AND r.reversa_de = OLD.id AND r.estado = 'confirmado') THEN
      RAISE EXCEPTION 'Asiento confirmado: solo puede revertirse mediante contraasiento';
    END IF;
    SELECT COUNT(*) INTO v_dif FROM (
      (SELECT cuenta_id, obra_id, maquinaria_id, moneda, cotizacion, importe_origen, debe, haber FROM public.contab_asiento_lineas WHERE asiento_id = OLD.id
       EXCEPT ALL
       SELECT cuenta_id, obra_id, maquinaria_id, moneda, cotizacion, importe_origen, haber, debe FROM public.contab_asiento_lineas WHERE asiento_id = NEW.revertido_por)
      UNION ALL
      (SELECT cuenta_id, obra_id, maquinaria_id, moneda, cotizacion, importe_origen, haber, debe FROM public.contab_asiento_lineas WHERE asiento_id = NEW.revertido_por
       EXCEPT ALL
       SELECT cuenta_id, obra_id, maquinaria_id, moneda, cotizacion, importe_origen, debe, haber FROM public.contab_asiento_lineas WHERE asiento_id = OLD.id)
    ) d;
    IF v_dif > 0 THEN RAISE EXCEPTION 'El contraasiento no es exacto'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.contab_asientos r WHERE r.id = NEW.revertido_por
                   AND r.total_debe = OLD.total_haber AND r.total_haber = OLD.total_debe
                   AND r.ejercicio_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Totales del contraasiento no coinciden';
    END IF;
    NEW.version := OLD.version + 1;
    RETURN NEW;
  END IF;
  IF NEW.estado = 'revertido' THEN RAISE EXCEPTION 'Un borrador no se revierte, se borra'; END IF;
  IF NEW.estado = 'confirmado' THEN
    IF public.contab_es_usuario_directo() THEN
      RAISE EXCEPTION 'La confirmación se hace solo con la función autorizada';
    END IF;
    SELECT * INTO v_per FROM public.contab_periodos WHERE id = NEW.periodo_id FOR SHARE;
    IF v_per.id IS NULL OR v_per.estado <> 'abierto' THEN RAISE EXCEPTION 'Período cerrado o inexistente'; END IF;
    IF v_per.ejercicio_id <> NEW.ejercicio_id THEN RAISE EXCEPTION 'Período y ejercicio no coinciden'; END IF;
    IF NEW.fecha < v_per.fecha_desde OR NEW.fecha > v_per.fecha_hasta THEN RAISE EXCEPTION 'La fecha no corresponde al período'; END IF;
    PERFORM 1 FROM public.contab_plan_cuentas c
      WHERE c.id IN (SELECT cuenta_id FROM public.contab_asiento_lineas WHERE asiento_id = NEW.id) FOR SHARE;
    SELECT COALESCE(SUM(debe),0), COALESCE(SUM(haber),0) INTO v_debe, v_haber
      FROM public.contab_asiento_lineas WHERE asiento_id = NEW.id;
    IF v_debe = 0 OR v_debe <> v_haber THEN RAISE EXCEPTION 'Asiento descuadrado: debe % / haber %', v_debe, v_haber; END IF;
    SELECT COUNT(*) INTO v_malas FROM public.contab_asiento_lineas l
      LEFT JOIN public.contab_plan_cuentas c ON c.id = l.cuenta_id
      WHERE l.asiento_id = NEW.id AND (c.id IS NULL OR NOT c.imputable OR NOT c.activa);
    IF v_malas > 0 THEN RAISE EXCEPTION 'Hay líneas sin cuenta o con cuentas no imputables/inactivas'; END IF;
    NEW.total_debe := v_debe; NEW.total_haber := v_haber;
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_asiento_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_asientos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_asiento_guarda();

CREATE FUNCTION public.contab_trg_linea_guarda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_estado text; v_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.asiento_id <> OLD.asiento_id THEN
    RAISE EXCEPTION 'Una línea no puede cambiar de asiento';
  END IF;
  v_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.asiento_id ELSE NEW.asiento_id END;
  SELECT estado INTO v_estado FROM public.contab_asientos WHERE id = v_id FOR UPDATE;
  IF v_estado IS NOT NULL AND v_estado <> 'borrador' THEN
    RAISE EXCEPTION 'El asiento está confirmado: sus líneas no se modifican';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trg_contab_linea_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_asiento_lineas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_linea_guarda();

CREATE FUNCTION public.contab_trg_cuenta_guarda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF (OLD.imputable AND NOT NEW.imputable) OR (OLD.activa AND NOT NEW.activa) THEN
    IF EXISTS (SELECT 1 FROM public.contab_asiento_lineas l
               JOIN public.contab_asientos a ON a.id = l.asiento_id
               WHERE l.cuenta_id = OLD.id AND a.estado = 'borrador') THEN
      RAISE EXCEPTION 'La cuenta está en asientos borrador: quitela de ellos primero';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_cuenta_guarda BEFORE UPDATE ON public.contab_plan_cuentas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_cuenta_guarda();

REVOKE ALL ON FUNCTION public.contab_trg_asiento_guarda(), public.contab_trg_linea_guarda(),
  public.contab_trg_cuenta_guarda(), public.contab_trg_periodo_valida(), public.contab_trg_ejercicio_valida() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contab_es_usuario_directo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_es_usuario_directo() TO authenticated;