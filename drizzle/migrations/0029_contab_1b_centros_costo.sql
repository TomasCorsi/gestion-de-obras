ALTER TABLE public.contab_plan_cuentas
  ADD COLUMN IF NOT EXISTS requiere_analitica boolean NOT NULL DEFAULT false;

CREATE TABLE public.contab_centros_costo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'otro'
    CHECK (tipo IN ('obras','maquinarias','taller','administracion','deposito','generales','otro')),
  activo boolean NOT NULL DEFAULT true,
  vigente_desde date NOT NULL DEFAULT DATE '2000-01-01',
  vigente_hasta date,
  orden int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cc_codigo_formato CHECK (codigo ~ '^[A-Z0-9][A-Z0-9._-]{0,19}$'),
  CONSTRAINT cc_nombre CHECK (btrim(nombre) <> ''),
  CONSTRAINT cc_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
  CONSTRAINT cc_codigo_uq UNIQUE (codigo)
);

CREATE TABLE public.contab_subcentros_costo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id uuid NOT NULL REFERENCES public.contab_centros_costo(id) ON DELETE RESTRICT,
  codigo text NOT NULL,
  nombre text NOT NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE RESTRICT,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE RESTRICT,
  activo boolean NOT NULL DEFAULT true,
  vigente_desde date NOT NULL DEFAULT DATE '2000-01-01',
  vigente_hasta date,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sc_codigo_formato CHECK (codigo ~ '^[A-Z0-9][A-Z0-9._-]{0,29}$'),
  CONSTRAINT sc_nombre CHECK (btrim(nombre) <> ''),
  CONSTRAINT sc_un_vinculo CHECK (num_nonnulls(obra_id, maquinaria_id) <= 1),
  CONSTRAINT sc_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
  CONSTRAINT sc_codigo_uq UNIQUE (centro_id, codigo)
);
CREATE UNIQUE INDEX contab_subcentros_obra_uq ON public.contab_subcentros_costo (obra_id) WHERE obra_id IS NOT NULL;
CREATE UNIQUE INDEX contab_subcentros_maq_uq  ON public.contab_subcentros_costo (maquinaria_id) WHERE maquinaria_id IS NOT NULL;

CREATE TABLE public.contab_imputaciones_analiticas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_id uuid NOT NULL REFERENCES public.contab_asiento_lineas(id) ON DELETE CASCADE,
  subcentro_id uuid NOT NULL REFERENCES public.contab_subcentros_costo(id) ON DELETE RESTRICT,
  obra_id uuid REFERENCES public.obras(id) ON DELETE RESTRICT,
  obra_atribucion text CHECK (obra_atribucion IN ('economica','informativa')),
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE RESTRICT,
  naturaleza text NOT NULL CHECK (naturaleza IN ('ingreso','gasto')),
  importe numeric(18,2) NOT NULL CHECK (importe > 0),
  signo smallint NOT NULL DEFAULT 1 CHECK (signo IN (1,-1)),
  tipo_movimiento text NOT NULL DEFAULT 'original'
    CHECK (tipo_movimiento IN ('original','reversa','ajuste')),
  origen_imputacion_id uuid REFERENCES public.contab_imputaciones_analiticas(id) ON DELETE RESTRICT,
  centro_id_snap uuid,
  centro_codigo_snap text,
  centro_nombre_snap text,
  subcentro_codigo_snap text,
  subcentro_nombre_snap text,
  nota text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ia_obra_atrib CHECK ((obra_id IS NULL) = (obra_atribucion IS NULL)),
  CONSTRAINT ia_tipo CHECK (
       (tipo_movimiento = 'original' AND signo = 1  AND origen_imputacion_id IS NULL)
    OR (tipo_movimiento = 'reversa'  AND signo = -1 AND origen_imputacion_id IS NOT NULL)
    OR (tipo_movimiento = 'ajuste'   AND origen_imputacion_id IS NOT NULL)),
  CONSTRAINT ia_snap CHECK (centro_id_snap IS NOT NULL AND subcentro_codigo_snap IS NOT NULL)
);
CREATE INDEX contab_imput_linea_idx ON public.contab_imputaciones_analiticas (linea_id);
CREATE INDEX contab_imput_sub_idx   ON public.contab_imputaciones_analiticas (subcentro_id);
CREATE INDEX contab_imput_obra_idx  ON public.contab_imputaciones_analiticas (obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX contab_imput_maq_idx   ON public.contab_imputaciones_analiticas (maquinaria_id) WHERE maquinaria_id IS NOT NULL;
CREATE UNIQUE INDEX contab_imput_reversa_uq ON public.contab_imputaciones_analiticas (origen_imputacion_id)
  WHERE tipo_movimiento = 'reversa';

CREATE TABLE public.contab_reversa_permisos (
  asiento_reversa_id uuid NOT NULL,
  txid bigint NOT NULL DEFAULT txid_current(),
  PRIMARY KEY (asiento_reversa_id, txid)
);
REVOKE ALL ON public.contab_reversa_permisos FROM PUBLIC, anon, authenticated;
ALTER TABLE public.contab_reversa_permisos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas TO authenticated;
GRANT ALL ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas TO service_role;

CREATE OR REPLACE FUNCTION public.contab_puede_centros() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL
     AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'))
$$;
REVOKE EXECUTE ON FUNCTION public.contab_puede_centros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_puede_centros() TO authenticated;

CREATE OR REPLACE FUNCTION public.contab_trg_centro_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM contab_subcentros_costo WHERE centro_id = OLD.id) THEN
      RAISE EXCEPTION 'El centro tiene subcentros: desactivalo en lugar de eliminarlo';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.codigo IS DISTINCT FROM OLD.codigo
     AND EXISTS (SELECT 1 FROM contab_subcentros_costo WHERE centro_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede cambiar el código de un centro con subcentros';
  END IF;
  IF NEW.tipo IS DISTINCT FROM OLD.tipo AND EXISTS (
       SELECT 1 FROM contab_subcentros_costo WHERE centro_id = OLD.id
        AND (obra_id IS NOT NULL OR maquinaria_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'No se puede cambiar el tipo de un centro con subcentros vinculados';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_centro_guarda() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_centro_guarda BEFORE UPDATE OR DELETE ON public.contab_centros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_centro_guarda();

CREATE OR REPLACE FUNCTION public.contab_trg_subcentro_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_tipo text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM contab_imputaciones_analiticas WHERE subcentro_id = OLD.id) THEN
      RAISE EXCEPTION 'El subcentro tiene movimientos: desactivalo en lugar de eliminarlo';
    END IF;
    RETURN OLD;
  END IF;
  SELECT tipo INTO v_tipo FROM contab_centros_costo WHERE id = NEW.centro_id;
  IF NEW.obra_id IS NOT NULL AND v_tipo <> 'obras' THEN
    RAISE EXCEPTION 'Una obra solo puede vincularse a un centro de tipo Obras';
  END IF;
  IF NEW.maquinaria_id IS NOT NULL AND v_tipo NOT IN ('maquinarias','taller') THEN
    RAISE EXCEPTION 'Una máquina solo puede vincularse a un centro de Maquinarias o Taller';
  END IF;
  IF TG_OP = 'UPDATE'
     AND (NEW.centro_id IS DISTINCT FROM OLD.centro_id OR NEW.codigo IS DISTINCT FROM OLD.codigo
       OR NEW.obra_id IS DISTINCT FROM OLD.obra_id OR NEW.maquinaria_id IS DISTINCT FROM OLD.maquinaria_id)
     AND EXISTS (SELECT 1 FROM contab_imputaciones_analiticas WHERE subcentro_id = OLD.id) THEN
    RAISE EXCEPTION 'El subcentro tiene movimientos: solo se puede renombrar, cambiar vigencia o desactivar';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_subcentro_guarda() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_subcentro_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_subcentro_guarda();

CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_estado text; v_fecha date; v_rev uuid; v_sub record; v_ori record; v_lr record;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT a.estado INTO v_estado FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
     WHERE l.id = OLD.linea_id FOR UPDATE OF l;
    IF v_estado IS DISTINCT FROM 'borrador' OR OLD.tipo_movimiento <> 'original' THEN
      RAISE EXCEPTION 'No se pueden modificar imputaciones de un asiento % o de una reversa',
        COALESCE(v_estado,'inexistente');
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.linea_id <> OLD.linea_id OR NEW.tipo_movimiento <> OLD.tipo_movimiento
       OR NEW.signo <> OLD.signo OR NEW.origen_imputacion_id IS DISTINCT FROM OLD.origen_imputacion_id THEN
      RAISE EXCEPTION 'Línea, tipo, signo y origen no son editables';
    END IF;
  END IF;

  SELECT a.estado, a.fecha, a.reversa_de INTO v_estado, v_fecha, v_rev
    FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
   WHERE l.id = NEW.linea_id FOR UPDATE OF l;

  IF NEW.tipo_movimiento = 'reversa' THEN
    IF TG_OP <> 'INSERT' OR NOT EXISTS (
         SELECT 1 FROM contab_reversa_permisos p
          WHERE p.asiento_reversa_id = (SELECT asiento_id FROM contab_asiento_lineas WHERE id = NEW.linea_id)
            AND p.txid = txid_current()) THEN
      RAISE EXCEPTION 'Las contraimputaciones solo las genera la reversa del asiento';
    END IF;
    SELECT i.*, lo.orden, lo.asiento_id INTO v_ori
      FROM contab_imputaciones_analiticas i JOIN contab_asiento_lineas lo ON lo.id = i.linea_id
     WHERE i.id = NEW.origen_imputacion_id;
    SELECT orden, asiento_id INTO v_lr FROM contab_asiento_lineas WHERE id = NEW.linea_id;
    IF v_ori.id IS NULL OR v_ori.tipo_movimiento <> 'original' OR v_rev IS DISTINCT FROM v_ori.asiento_id
       OR v_lr.orden <> v_ori.orden OR NEW.importe <> v_ori.importe OR NEW.signo <> -1
       OR NEW.subcentro_id <> v_ori.subcentro_id
       OR NEW.obra_id IS DISTINCT FROM v_ori.obra_id OR NEW.maquinaria_id IS DISTINCT FROM v_ori.maquinaria_id
       OR NEW.obra_atribucion IS DISTINCT FROM v_ori.obra_atribucion OR NEW.naturaleza <> v_ori.naturaleza
       OR NEW.centro_id_snap IS DISTINCT FROM v_ori.centro_id_snap
       OR NEW.centro_codigo_snap IS DISTINCT FROM v_ori.centro_codigo_snap
       OR NEW.centro_nombre_snap IS DISTINCT FROM v_ori.centro_nombre_snap
       OR NEW.subcentro_codigo_snap IS DISTINCT FROM v_ori.subcentro_codigo_snap
       OR NEW.subcentro_nombre_snap IS DISTINCT FROM v_ori.subcentro_nombre_snap THEN
      RAISE EXCEPTION 'La contraimputación no es espejo exacto del original';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tipo_movimiento = 'ajuste' THEN
    RAISE EXCEPTION 'Los ajustes parciales (NC, devoluciones) se habilitan en una fase posterior';
  END IF;

  IF v_estado IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'Solo se imputan líneas de asientos en borrador';
  END IF;

  SELECT s.*, c.codigo AS c_codigo, c.nombre AS c_nombre, c.activo AS c_activo,
         c.vigente_desde AS c_desde, c.vigente_hasta AS c_hasta
    INTO v_sub FROM contab_subcentros_costo s JOIN contab_centros_costo c ON c.id = s.centro_id
   WHERE s.id = NEW.subcentro_id;
  IF NOT (v_sub.activo AND v_sub.c_activo)
     OR v_fecha < GREATEST(v_sub.vigente_desde, v_sub.c_desde)
     OR v_fecha > LEAST(COALESCE(v_sub.vigente_hasta,'infinity'::date), COALESCE(v_sub.c_hasta,'infinity'::date)) THEN
    RAISE EXCEPTION 'Centro o subcentro inactivo o fuera de vigencia para la fecha del asiento';
  END IF;

  IF v_sub.obra_id IS NOT NULL THEN
    IF NEW.obra_id IS NOT NULL AND NEW.obra_id <> v_sub.obra_id THEN
      RAISE EXCEPTION 'La obra no coincide con la del subcentro'; END IF;
    NEW.obra_id := v_sub.obra_id; NEW.obra_atribucion := 'economica';
  END IF;
  IF v_sub.maquinaria_id IS NOT NULL THEN
    IF NEW.maquinaria_id IS NOT NULL AND NEW.maquinaria_id <> v_sub.maquinaria_id THEN
      RAISE EXCEPTION 'La máquina no coincide con la del subcentro'; END IF;
    NEW.maquinaria_id := v_sub.maquinaria_id;
  END IF;
  IF NEW.obra_id IS NOT NULL AND NEW.obra_atribucion IS NULL THEN NEW.obra_atribucion := 'informativa'; END IF;
  IF NEW.obra_id IS NULL THEN NEW.obra_atribucion := NULL; END IF;

  NEW.centro_id_snap := v_sub.centro_id;  NEW.centro_codigo_snap := v_sub.c_codigo;
  NEW.centro_nombre_snap := v_sub.c_nombre;
  NEW.subcentro_codigo_snap := v_sub.codigo; NEW.subcentro_nombre_snap := v_sub.nombre;
  NEW.signo := 1; NEW.origen_imputacion_id := NULL;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_imputacion_guarda() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_imputacion_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_guarda();

CREATE OR REPLACE FUNCTION public.contab_trg_tope_linea() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_linea uuid; v_tope numeric; v_suma numeric;
BEGIN
  v_linea := CASE WHEN TG_TABLE_NAME = 'contab_asiento_lineas' THEN NEW.id ELSE NEW.linea_id END;
  SELECT debe + haber INTO v_tope FROM contab_asiento_lineas WHERE id = v_linea FOR UPDATE;
  IF v_tope IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(sum(importe),0) INTO v_suma FROM contab_imputaciones_analiticas
   WHERE linea_id = v_linea AND tipo_movimiento = 'original';
  IF v_suma > v_tope THEN
    RAISE EXCEPTION 'Las imputaciones (%) superan el importe de la línea (%)', v_suma, v_tope;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_tope_linea() FROM PUBLIC, anon, authenticated;
CREATE CONSTRAINT TRIGGER contab_imputacion_tope AFTER INSERT OR UPDATE ON public.contab_imputaciones_analiticas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.contab_trg_tope_linea();
CREATE CONSTRAINT TRIGGER contab_linea_tope AFTER UPDATE OF debe, haber ON public.contab_asiento_lineas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.contab_trg_tope_linea();

CREATE OR REPLACE FUNCTION public.contab_trg_asiento_analitica() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_falta text;
BEGIN
  IF NEW.reversa_de IS NOT NULL THEN RETURN NULL; END IF;
  SELECT string_agg(c.codigo || ' (línea ' || l.orden || ')', ', ') INTO v_falta
    FROM contab_asiento_lineas l JOIN contab_plan_cuentas c ON c.id = l.cuenta_id
   WHERE l.asiento_id = NEW.id AND c.requiere_analitica
     AND (l.debe + l.haber) <> COALESCE((SELECT sum(i.importe) FROM contab_imputaciones_analiticas i
                                          WHERE i.linea_id = l.id AND i.tipo_movimiento = 'original'), 0);
  IF v_falta IS NOT NULL THEN RAISE EXCEPTION 'Faltan imputar al 100%% las cuentas: %', v_falta; END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_asiento_analitica() FROM PUBLIC, anon, authenticated;
CREATE CONSTRAINT TRIGGER contab_asiento_analitica AFTER UPDATE OF estado ON public.contab_asientos
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado')
  EXECUTE FUNCTION public.contab_trg_asiento_analitica();

CREATE OR REPLACE FUNCTION public.contab_trg_reversa_imputaciones() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO contab_reversa_permisos (asiento_reversa_id) VALUES (NEW.id);
  INSERT INTO contab_imputaciones_analiticas
    (linea_id, subcentro_id, obra_id, obra_atribucion, maquinaria_id, naturaleza, importe,
     signo, tipo_movimiento, origen_imputacion_id,
     centro_id_snap, centro_codigo_snap, centro_nombre_snap, subcentro_codigo_snap, subcentro_nombre_snap,
     nota, created_by)
  SELECT lr.id, i.subcentro_id, i.obra_id, i.obra_atribucion, i.maquinaria_id, i.naturaleza, i.importe,
         -1, 'reversa', i.id,
         i.centro_id_snap, i.centro_codigo_snap, i.centro_nombre_snap, i.subcentro_codigo_snap, i.subcentro_nombre_snap,
         'Reversa', auth.uid()
    FROM contab_asiento_lineas lo
    JOIN contab_imputaciones_analiticas i ON i.linea_id = lo.id AND i.tipo_movimiento = 'original'
    JOIN contab_asiento_lineas lr ON lr.asiento_id = NEW.id AND lr.orden = lo.orden
   WHERE lo.asiento_id = NEW.reversa_de;
  DELETE FROM contab_reversa_permisos WHERE asiento_reversa_id = NEW.id AND txid = txid_current();
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_reversa_imputaciones() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_reversa_imputaciones AFTER UPDATE OF estado ON public.contab_asientos
  FOR EACH ROW WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado' AND NEW.reversa_de IS NOT NULL)
  EXECUTE FUNCTION public.contab_trg_reversa_imputaciones();

CREATE OR REPLACE FUNCTION public.contab_trg_vigencia_historica() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_min date; v_max date;
BEGIN
  IF NEW.vigente_desde IS NOT DISTINCT FROM OLD.vigente_desde
     AND NEW.vigente_hasta IS NOT DISTINCT FROM OLD.vigente_hasta THEN RETURN NEW; END IF;
  SELECT min(a.fecha), max(a.fecha) INTO v_min, v_max
    FROM contab_imputaciones_analiticas i
    JOIN contab_asiento_lineas l ON l.id = i.linea_id JOIN contab_asientos a ON a.id = l.asiento_id
   WHERE CASE WHEN TG_TABLE_NAME = 'contab_centros_costo' THEN i.centro_id_snap ELSE i.subcentro_id END = OLD.id;
  IF v_min IS NOT NULL AND (NEW.vigente_desde > v_min OR COALESCE(NEW.vigente_hasta,'infinity'::date) < v_max) THEN
    RAISE EXCEPTION 'La vigencia debe cubrir las fechas ya imputadas (% a %)', v_min, v_max;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_vigencia_historica() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_centro_vigencia BEFORE UPDATE ON public.contab_centros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_vigencia_historica();
CREATE TRIGGER contab_subcentro_vigencia BEFORE UPDATE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_vigencia_historica();

CREATE TRIGGER contab_auditar_centros AFTER INSERT OR UPDATE OR DELETE ON public.contab_centros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER contab_auditar_subcentros AFTER INSERT OR UPDATE OR DELETE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER contab_auditar_imputaciones AFTER INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

ALTER TABLE public.contab_centros_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contab_subcentros_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contab_imputaciones_analiticas ENABLE ROW LEVEL SECURITY;
CREATE POLICY cc_select ON public.contab_centros_costo FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY cc_insert ON public.contab_centros_costo FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY cc_update ON public.contab_centros_costo FOR UPDATE TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY cc_delete ON public.contab_centros_costo FOR DELETE TO authenticated USING (public.contab_puede_centros());
CREATE POLICY sc_select ON public.contab_subcentros_costo FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY sc_insert ON public.contab_subcentros_costo FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY sc_update ON public.contab_subcentros_costo FOR UPDATE TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY sc_delete ON public.contab_subcentros_costo FOR DELETE TO authenticated USING (public.contab_puede_centros());
CREATE POLICY ia_select ON public.contab_imputaciones_analiticas FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY ia_insert ON public.contab_imputaciones_analiticas FOR INSERT TO authenticated WITH CHECK (public.contab_puede_centros());
CREATE POLICY ia_update ON public.contab_imputaciones_analiticas FOR UPDATE TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY ia_delete ON public.contab_imputaciones_analiticas FOR DELETE TO authenticated USING (public.contab_puede_centros());

CREATE OR REPLACE FUNCTION public.contab_subcentros_sugeridos()
RETURNS TABLE (origen text, ref_id uuid, nombre text, estado text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
    SELECT 'obra'::text, o.id, COALESCE(o.numero || ' - ', '') || o.nombre, o.estado::text
      FROM obras o WHERE NOT EXISTS (SELECT 1 FROM contab_subcentros_costo s WHERE s.obra_id = o.id)
    UNION ALL
    SELECT 'maquina'::text, m.id,
           COALESCE(m.codigo || ' - ', '') || m.nombre || COALESCE(' (' || m.patente || ')', ''), m.estado::text
      FROM maquinarias m WHERE NOT EXISTS (SELECT 1 FROM contab_subcentros_costo s WHERE s.maquinaria_id = m.id);
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_subcentros_sugeridos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_subcentros_sugeridos() TO authenticated;

CREATE VIEW public.contab_analitica_neta WITH (security_invoker = true) AS
SELECT i.id, a.fecha, a.id AS asiento_id, a.estado AS asiento_estado, i.tipo_movimiento,
       i.centro_id_snap AS centro_id, i.centro_codigo_snap AS centro_codigo, i.centro_nombre_snap AS centro_nombre,
       i.subcentro_id, i.subcentro_codigo_snap AS subcentro_codigo, i.subcentro_nombre_snap AS subcentro_nombre,
       i.maquinaria_id, i.obra_id, i.obra_atribucion, i.naturaleza,
       i.importe * i.signo AS importe_neto
  FROM public.contab_imputaciones_analiticas i
  JOIN public.contab_asiento_lineas l ON l.id = i.linea_id
  JOIN public.contab_asientos a ON a.id = l.asiento_id
 WHERE a.estado IN ('confirmado','revertido');
REVOKE ALL ON public.contab_analitica_neta FROM anon, PUBLIC;
GRANT SELECT ON public.contab_analitica_neta TO authenticated;