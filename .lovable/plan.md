# Fase 1B — Centros y subcentros de costo: SQL definitivo (para revisión, NO ejecutado)

Base: la misma de Lovable Cloud. Sin borrar datos. Sin 1C. Sin tocar obras, maquinarias, stock, combustible, remitos ni los cálculos de rentabilidad. No se modifican las funciones de Fase 0 ni 1A.

## Pendientes de la Fase 1A (antes de operar con contabilidad real)
1. Corregir los CUIT inválidos de los terceros que se usen (ej.: BRITCOM).
2. Implementar o validar la cuenta contable específica por cliente/proveedor en la generación de asientos (hoy `contab_generar_asiento_cbte` usa las cuentas genéricas).
3. Prueba con sesión real de contador, prueba de concurrencia, fechas del ejercicio fiscal y fecha de corte.

## Hechos verificados en la base (lectura)
- `contab_puede('ver')`: verdadero solo para admin y contador; falso sin sesión y para tesorero, aprobador_pagos y roles operativos.
- `contab_revertir_asiento` copia las líneas con el mismo `orden`, invierte debe/haber, confirma la reversa y marca el original como `revertido`.
- `contab_trg_linea_guarda` ya bloquea alta, cambio y baja de líneas de asientos no borrador.
- Columnas reales: `obras(id, nombre, numero, estado, cliente_id)`, `maquinarias(id, codigo, nombre, patente, estado)`, `contab_plan_cuentas(id, codigo, nombre, imputable, activa, …)`, `contab_asientos.estado` (borrador / confirmado / revertido) y `reversa_de`.
- No existe ninguna tabla de centros de costo.

## Correcciones respecto del diseño anterior

| Punto | Solución |
|---|---|
| 1. NEW/OLD | Un trigger por operación con lógica explícita: INSERT usa NEW, DELETE usa OLD, UPDATE revisa OLD y NEW y prohíbe cambiar de línea. Borrador: alta/edición/baja libres. Confirmado/revertido: todo bloqueado. |
| 2. Tope y suma exacta | Control diferido al cerrar la transacción, con bloqueo `FOR UPDATE` de la línea (serializa operaciones concurrentes). También se revisa cuando cambia el importe de la línea. Nueva marca `requiere_analitica` en la cuenta (por defecto no): al confirmar el asiento, sus líneas deben estar imputadas al 100 %. |
| 3. Reversas | Al confirmar una reversa, un trigger copia las imputaciones del asiento original con `signo = -1` (emparejando por `orden`). Los reportes suman `importe × signo`: el neto queda en cero, sin duplicar. |
| 4. Permisos | Lectura `contab_puede('ver')`; escritura `contab_puede_centros()` (admin o contador, exige sesión). Sin permisos para `anon`; `EXECUTE` revocado a PUBLIC/anon en las funciones nuevas. Las sugerencias pasan a ser una función protegida (no vista) para no depender del acceso de cada rol a obras/maquinarias. |
| 5. Reversión | Procedimiento transaccional que aborta si hay imputaciones, subcentros o centros distintos de los 6 iniciales sin modificar. Nunca borra datos cargados. |
| 6. Máquina + obra | `obra_atribucion`: `economica` (cuenta en el resultado de la obra) o `informativa` (solo referencia). El importe se guarda una vez; por centro/máquina suma todo, por obra suma solo lo económico. |
| 7. Compatibilidad | Las columnas `obra_id`/`maquinaria_id` de líneas e ítems no se tocan. Funciones de 0A/0B/1A sin cambios; solo se agregan triggers nuevos. |
| 8. Esquema | Nombres de columnas confirmados arriba. |

## SQL definitivo — migración `contab_1b_centros_costo`

```sql
-- 0) Marca de cuentas con analítica obligatoria (aditiva, por defecto opcional)
ALTER TABLE public.contab_plan_cuentas
  ADD COLUMN IF NOT EXISTS requiere_analitica boolean NOT NULL DEFAULT false;

-- 1) Tablas
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
  origen_imputacion_id uuid REFERENCES public.contab_imputaciones_analiticas(id) ON DELETE RESTRICT,
  nota text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ia_obra_atrib CHECK ((obra_id IS NULL) = (obra_atribucion IS NULL)),
  CONSTRAINT ia_reversa CHECK ((signo = -1) = (origen_imputacion_id IS NOT NULL))
);
CREATE INDEX contab_imput_linea_idx ON public.contab_imputaciones_analiticas (linea_id);
CREATE INDEX contab_imput_sub_idx   ON public.contab_imputaciones_analiticas (subcentro_id);
CREATE INDEX contab_imput_obra_idx  ON public.contab_imputaciones_analiticas (obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX contab_imput_maq_idx   ON public.contab_imputaciones_analiticas (maquinaria_id) WHERE maquinaria_id IS NOT NULL;
CREATE UNIQUE INDEX contab_imput_origen_uq ON public.contab_imputaciones_analiticas (origen_imputacion_id)
  WHERE origen_imputacion_id IS NOT NULL;

-- 2) Grants (sin anon)
REVOKE ALL ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas TO authenticated;
GRANT ALL ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas TO service_role;

-- 3) Permiso de configuración / imputación
CREATE OR REPLACE FUNCTION public.contab_puede_centros() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.uid() IS NOT NULL
     AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador'))
$$;
REVOKE EXECUTE ON FUNCTION public.contab_puede_centros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_puede_centros() TO authenticated;

-- 4) Centros: no borrar con subcentros, no cambiar tipo con vínculos
CREATE OR REPLACE FUNCTION public.contab_trg_centro_guarda() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
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
CREATE TRIGGER contab_centro_guarda BEFORE UPDATE OR DELETE ON public.contab_centros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_centro_guarda();

-- 5) Subcentros: tipo de centro coherente; con movimientos solo renombrar/desactivar/vigencia
CREATE OR REPLACE FUNCTION public.contab_trg_subcentro_guarda() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
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
CREATE TRIGGER contab_subcentro_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_subcentro_guarda();

-- 6) Imputaciones: NEW/OLD explícitos, solo en borrador, validación de subcentro y dimensiones
CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_guarda() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_estado text; v_fecha date; v_sub record;
BEGIN
  -- Las contraimputaciones de reversa solo las crea el trigger del sistema
  IF current_setting('contab.reversa_en_curso', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT a.estado INTO v_estado FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
     WHERE l.id = OLD.linea_id;
    IF v_estado IS DISTINCT FROM 'borrador' THEN
      RAISE EXCEPTION 'No se pueden modificar imputaciones de un asiento %', COALESCE(v_estado,'inexistente');
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.linea_id <> OLD.linea_id THEN RAISE EXCEPTION 'Una imputación no puede cambiar de línea'; END IF;
    IF NEW.signo <> OLD.signo OR NEW.origen_imputacion_id IS DISTINCT FROM OLD.origen_imputacion_id THEN
      RAISE EXCEPTION 'Datos de reversa no editables';
    END IF;
  END IF;

  -- INSERT o UPDATE: validar con NEW
  SELECT a.estado, a.fecha INTO v_estado, v_fecha
    FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
   WHERE l.id = NEW.linea_id;
  IF v_estado IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'Solo se imputan líneas de asientos en borrador';
  END IF;
  IF NEW.signo = -1 THEN RAISE EXCEPTION 'Las contraimputaciones las genera la reversa'; END IF;

  SELECT s.*, c.activo AS c_activo, c.vigente_desde AS c_desde, c.vigente_hasta AS c_hasta
    INTO v_sub FROM contab_subcentros_costo s JOIN contab_centros_costo c ON c.id = s.centro_id
   WHERE s.id = NEW.subcentro_id;
  IF NOT (v_sub.activo AND v_sub.c_activo)
     OR v_fecha < GREATEST(v_sub.vigente_desde, v_sub.c_desde)
     OR v_fecha > LEAST(COALESCE(v_sub.vigente_hasta,'infinity'::date), COALESCE(v_sub.c_hasta,'infinity'::date)) THEN
    RAISE EXCEPTION 'Centro o subcentro inactivo o fuera de vigencia para la fecha del asiento';
  END IF;

  IF v_sub.obra_id IS NOT NULL THEN            -- subcentro de obra: atribución económica a esa obra
    IF NEW.obra_id IS NOT NULL AND NEW.obra_id <> v_sub.obra_id THEN
      RAISE EXCEPTION 'La obra no coincide con la del subcentro'; END IF;
    NEW.obra_id := v_sub.obra_id; NEW.obra_atribucion := 'economica';
  END IF;
  IF v_sub.maquinaria_id IS NOT NULL THEN
    IF NEW.maquinaria_id IS NOT NULL AND NEW.maquinaria_id <> v_sub.maquinaria_id THEN
      RAISE EXCEPTION 'La máquina no coincide con la del subcentro'; END IF;
    NEW.maquinaria_id := v_sub.maquinaria_id;
  END IF;
  IF NEW.obra_id IS NOT NULL AND NEW.obra_atribucion IS NULL THEN
    NEW.obra_atribucion := 'informativa';      -- por defecto no suma al resultado de la obra
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER contab_imputacion_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_guarda();

-- 7) Tope por línea (diferido, con bloqueo de la línea contra concurrencia)
CREATE OR REPLACE FUNCTION public.contab_validar_tope_linea(_linea_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_tope numeric; v_suma numeric;
BEGIN
  SELECT debe + haber INTO v_tope FROM contab_asiento_lineas WHERE id = _linea_id FOR UPDATE;
  IF v_tope IS NULL THEN RETURN; END IF;     -- línea borrada (cascade)
  SELECT COALESCE(sum(importe),0) INTO v_suma FROM contab_imputaciones_analiticas WHERE linea_id = _linea_id;
  IF v_suma > v_tope THEN
    RAISE EXCEPTION 'Las imputaciones (%) superan el importe de la línea (%)', v_suma, v_tope;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_validar_tope_linea(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_tope() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.contab_validar_tope_linea(NEW.linea_id);
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER contab_imputacion_tope AFTER INSERT OR UPDATE ON public.contab_imputaciones_analiticas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_tope();

CREATE OR REPLACE FUNCTION public.contab_trg_linea_tope() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.contab_validar_tope_linea(NEW.id);
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER contab_linea_tope AFTER UPDATE OF debe, haber ON public.contab_asiento_lineas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.contab_trg_linea_tope();

-- 8) Al confirmar: suma exacta en cuentas con analítica obligatoria
CREATE OR REPLACE FUNCTION public.contab_trg_asiento_analitica() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_falta text;
BEGIN
  IF NEW.reversa_de IS NOT NULL THEN RETURN NULL; END IF;   -- las reversas se espejan solas
  SELECT string_agg(c.codigo || ' (línea ' || l.orden || ')', ', ') INTO v_falta
    FROM contab_asiento_lineas l JOIN contab_plan_cuentas c ON c.id = l.cuenta_id
   WHERE l.asiento_id = NEW.id AND c.requiere_analitica
     AND (l.debe + l.haber) <> COALESCE((SELECT sum(i.importe) FROM contab_imputaciones_analiticas i
                                          WHERE i.linea_id = l.id), 0);
  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'Faltan imputar al 100%% las cuentas: %', v_falta;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER contab_asiento_analitica AFTER UPDATE OF estado ON public.contab_asientos
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado')
  EXECUTE FUNCTION public.contab_trg_asiento_analitica();

-- 9) Reversa: contraimputaciones espejo (no modifica contab_revertir_asiento)
CREATE OR REPLACE FUNCTION public.contab_trg_reversa_imputaciones() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM set_config('contab.reversa_en_curso','on', true);
  INSERT INTO contab_imputaciones_analiticas
    (linea_id, subcentro_id, obra_id, obra_atribucion, maquinaria_id, naturaleza, importe, signo,
     origen_imputacion_id, nota, created_by)
  SELECT lr.id, i.subcentro_id, i.obra_id, i.obra_atribucion, i.maquinaria_id, i.naturaleza, i.importe, -1,
         i.id, 'Reversa', auth.uid()
    FROM contab_asiento_lineas lo
    JOIN contab_imputaciones_analiticas i ON i.linea_id = lo.id AND i.signo = 1
    JOIN contab_asiento_lineas lr ON lr.asiento_id = NEW.id AND lr.orden = lo.orden
   WHERE lo.asiento_id = NEW.reversa_de;
  PERFORM set_config('contab.reversa_en_curso','off', true);
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_reversa_imputaciones() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_reversa_imputaciones AFTER UPDATE OF estado ON public.contab_asientos
  FOR EACH ROW WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado' AND NEW.reversa_de IS NOT NULL)
  EXECUTE FUNCTION public.contab_trg_reversa_imputaciones();

-- 10) Auditoría (función de 0B)
CREATE TRIGGER contab_auditar_centros AFTER INSERT OR UPDATE OR DELETE ON public.contab_centros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER contab_auditar_subcentros AFTER INSERT OR UPDATE OR DELETE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER contab_auditar_imputaciones AFTER INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

-- 11) RLS
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

-- 12) Sugerencias (no crea nada) — función protegida
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

-- 13) Vista de resultados netos (respeta RLS del usuario)
CREATE VIEW public.contab_analitica_neta WITH (security_invoker = true) AS
SELECT i.id, a.fecha, a.id AS asiento_id, a.estado AS asiento_estado,
       s.centro_id, i.subcentro_id, i.maquinaria_id, i.obra_id, i.obra_atribucion,
       i.naturaleza, i.importe * i.signo AS importe_neto
  FROM public.contab_imputaciones_analiticas i
  JOIN public.contab_asiento_lineas l ON l.id = i.linea_id
  JOIN public.contab_asientos a ON a.id = l.asiento_id
  JOIN public.contab_subcentros_costo s ON s.id = i.subcentro_id
 WHERE a.estado IN ('confirmado','revertido');
GRANT SELECT ON public.contab_analitica_neta TO authenticated;
```

Reglas de lectura de reportes: por centro/subcentro/máquina se suma todo `importe_neto`; por obra solo `obra_atribucion = 'economica'`. Original (+) y reversa (−) se compensan, así el costo nunca se duplica.

## Datos iniciales (carga de datos, después de la migración)
OBR Obras · MAQ Maquinarias · TAL Taller · ADM Administración · DEP Depósito / Stock · GG Gastos Generales — `ON CONFLICT (codigo) DO NOTHING`. Ningún subcentro automático. Ninguna cuenta marcada como `requiere_analitica` hasta que lo definas con el contador.

## Verificaciones (todas en transacciones con ROLLBACK; no queda nada guardado)
Seguridad
1. Sin sesión, maquinista, remitero, capataz, tesorero, aprobador: no leen ni escriben las 3 tablas, la vista ni las sugerencias.
2. Admin y contador: alta, edición y desactivación.

Integridad
3. Duplicados: código de centro; código dentro del centro; misma obra o máquina en dos subcentros.
4. Asociaciones inválidas: obra en Taller, máquina en Obras, obra y máquina en el mismo subcentro, obra distinta a la del subcentro.
5. Borrador: alta, edición y baja de imputación permitidas. Confirmado/revertido: edición y baja rechazadas.
6. Tope: superar la línea en una o varias inserciones, y bajar el importe de la línea por debajo de lo imputado → rechazo. Dos sesiones simultáneas sobre la misma línea: la segunda espera y se rechaza si excede.
7. Suma exacta: cuenta marcada sin imputar al 100 % → no confirma; cuenta no marcada → confirma.
8. Reversa: contraimputaciones con signo −1; neto por obra y por máquina = 0; no se duplican.
9. Máquina + obra: un importe; suma a la máquina siempre, a la obra solo si es económica.
10. Desactivación: borrar con movimientos → rechazado; desactivar → permitido; imputar en inactivo o fuera de vigencia → rechazado.

Compatibilidad
11. Conteos de obras, máquinas, partes, remitos, combustible, certificados, clientes y proveedores iguales antes y después.
12. Ciclo completo de 0B (crear ejercicio, asiento manual, confirmar, revertir, cerrar período) y funciones de 1A funcionando dentro de transacción revertida.
13. Rentabilidad sin cambios (no se toca su código ni sus tablas).

## Recuperación — procedimiento inverso transaccional
Solo se ejecuta si se decide desinstalar 1B. Aborta si hay cualquier dato cargado más allá de los 6 centros iniciales sin modificar.

```sql
DO $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') AND current_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION 'Solo administración';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contab_imputaciones_analiticas) THEN
    RAISE EXCEPTION 'Hay imputaciones analíticas: no se revierte 1B'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_subcentros_costo) THEN
    RAISE EXCEPTION 'Hay subcentros cargados: no se revierte 1B'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_centros_costo
              WHERE codigo NOT IN ('OBR','MAQ','TAL','ADM','DEP','GG') OR updated_at <> created_at) THEN
    RAISE EXCEPTION 'Hay centros nuevos o modificados: no se revierte 1B'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_plan_cuentas WHERE requiere_analitica) THEN
    RAISE EXCEPTION 'Hay cuentas con analítica obligatoria: desmarcarlas antes'; END IF;

  DROP TRIGGER contab_reversa_imputaciones ON public.contab_asientos;
  DROP TRIGGER contab_asiento_analitica ON public.contab_asientos;
  DROP TRIGGER contab_linea_tope ON public.contab_asiento_lineas;
  DROP VIEW public.contab_analitica_neta;
  DROP FUNCTION public.contab_subcentros_sugeridos();
  DELETE FROM public.contab_centros_costo WHERE codigo IN ('OBR','MAQ','TAL','ADM','DEP','GG');
  DROP TABLE public.contab_imputaciones_analiticas;
  DROP TABLE public.contab_subcentros_costo;
  DROP TABLE public.contab_centros_costo;
  DROP FUNCTION public.contab_trg_reversa_imputaciones(), public.contab_trg_asiento_analitica(),
    public.contab_trg_linea_tope(), public.contab_trg_imputacion_tope(), public.contab_validar_tope_linea(uuid),
    public.contab_trg_imputacion_guarda(), public.contab_trg_subcentro_guarda(),
    public.contab_trg_centro_guarda(), public.contab_puede_centros();
  -- La columna requiere_analitica queda (aditiva, sin efecto) para no tocar el plan de cuentas.
END $$;
```
Todo el bloque es una única transacción: si algo falla, no se aplica nada.

## Procedimiento de implementación (cuando lo apruebes)
1. Lectura previa: conteos base de todos los módulos.
2. Aplicar `contab_1b_centros_costo`.
3. Cargar los 6 centros iniciales.
4. Ejecutar verificaciones 1–13 con ROLLBACK y comparar conteos.
5. Pantalla Contabilidad → Configuración → Centros de costo (centros, subcentros, sugeridos) e imputación por línea en asientos en borrador; tests y compilación.
6. Prueba en navegador como admin sin guardar datos de prueba.
