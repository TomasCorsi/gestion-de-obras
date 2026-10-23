CREATE TABLE public.contab_ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto',
  ultimo_numero bigint NOT NULL DEFAULT 0,
  cerrado_at timestamptz,
  cerrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT chk_ejercicio_estado CHECK (estado IN ('abierto','cerrado')),
  CONSTRAINT chk_ejercicio_rango CHECK (fecha_hasta > fecha_desde),
  CONSTRAINT chk_ejercicio_numero CHECK (ultimo_numero >= 0),
  CONSTRAINT ex_ejercicio_superpuesto EXCLUDE USING gist (daterange(fecha_desde, fecha_hasta, '[]') WITH &&)
);

CREATE TABLE public.contab_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id uuid NOT NULL REFERENCES public.contab_ejercicios(id) ON DELETE RESTRICT,
  anio integer NOT NULL,
  mes integer NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto',
  cerrado_at timestamptz,
  cerrado_por uuid,
  reabierto_at timestamptz,
  reabierto_por uuid,
  motivo_reapertura text,
  CONSTRAINT chk_periodo_estado CHECK (estado IN ('abierto','cerrado')),
  CONSTRAINT chk_periodo_mes CHECK (mes BETWEEN 1 AND 12),
  CONSTRAINT chk_periodo_rango CHECK (fecha_hasta >= fecha_desde),
  CONSTRAINT uq_periodo UNIQUE (ejercicio_id, anio, mes),
  CONSTRAINT ex_periodo_superpuesto EXCLUDE USING gist (daterange(fecha_desde, fecha_hasta, '[]') WITH &&)
);

CREATE TABLE public.contab_cuentas_config (
  clave text PRIMARY KEY,
  cuenta_id uuid NOT NULL REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT,
  descripcion text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT chk_cuentas_config_clave CHECK (clave ~ '^[a-z_]+$')
);

CREATE FUNCTION public.contab_trg_ejercicio_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF (NEW.fecha_desde, NEW.fecha_hasta) IS DISTINCT FROM (OLD.fecha_desde, OLD.fecha_hasta) THEN
    IF OLD.estado = 'cerrado' THEN RAISE EXCEPTION 'Ejercicio cerrado: no se cambian sus fechas'; END IF;
    IF EXISTS (SELECT 1 FROM public.contab_periodos p WHERE p.ejercicio_id = OLD.id
               AND (p.fecha_desde < NEW.fecha_desde OR p.fecha_hasta > NEW.fecha_hasta)) THEN
      RAISE EXCEPTION 'Hay períodos fuera del nuevo rango del ejercicio';
    END IF;
  END IF;
  IF NEW.ultimo_numero < OLD.ultimo_numero THEN RAISE EXCEPTION 'La numeración no puede retroceder'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_ejercicio_valida BEFORE UPDATE ON public.contab_ejercicios
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_ejercicio_valida();

GRANT SELECT ON public.contab_ejercicios, public.contab_periodos, public.contab_cuentas_config TO authenticated;
GRANT ALL ON public.contab_ejercicios, public.contab_periodos, public.contab_cuentas_config TO service_role;
ALTER TABLE public.contab_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contab_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contab_cuentas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY contab_ejercicios_select ON public.contab_ejercicios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY contab_periodos_select ON public.contab_periodos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));
CREATE POLICY contab_cuentas_config_select ON public.contab_cuentas_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'));