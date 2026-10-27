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

## Ajustes finales (revisión del SQL definitivo)

| Punto | Corrección |
|---|---|
| 1. Reversas seguras | Se eliminó la variable `contab.reversa_en_curso`. Las contraimputaciones solo las puede insertar el trigger privilegiado de reversa (se comprueba el rol efectivo, no una variable). Además se valida que sean espejo exacto: misma línea por `orden`, mismo importe, subcentro, obra, máquina, atribución y naturaleza, del asiento indicado en `reversa_de`. No se pueden editar ni borrar. |
| 2. Permisos de funciones | Ya no existe `contab_validar_tope_linea` suelta. Todas las funciones de trigger son privilegiadas, con ejecución revocada a todos los usuarios (Postgres no exige ese permiso al dispararse). Así validan sobre todas las filas sin depender de la RLS, y nadie las puede llamar directamente. Admin/contador operan por RLS normal. |
| 3. Importes y concurrencia | Cada alta/edición/baja bloquea primero la línea (`FOR UPDATE`): dos sesiones sobre la misma línea se serializan. El tope se revisa al confirmar la transacción, en altas, ediciones y cambios de importe de la línea. La suma exacta se exige al confirmar el asiento en cuentas marcadas. |
| 4. Modelo preparado para NC/ajustes | Nuevo `tipo_movimiento`: original, reversa, ajuste. "Ajuste" (NC, devoluciones, ajustes parciales con signo ±) queda reservado y bloqueado en 1B; no hará falta rediseñar. |
| 5. Historial | Cada imputación guarda un snapshot del centro y subcentro (id, código, nombre). Con imputaciones no se puede cambiar código, tipo ni vínculo, ni acotar la vigencia dejando afuera fechas ya imputadas. Activar/desactivar y renombrar solo afectan el futuro. |
| 6. Pruebas | Ampliadas abajo (permisos efectivos, inmutabilidad, espejo exacto, sumas, doble dimensión). |
| 7. Recuperación | Revisa dependencias externas en el catálogo y aborta si alguna otra estructura depende de 1B; usa borrado restrictivo; conserva la auditoría. |

## Correcciones de la revisión anterior (se mantienen)

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
  -- original = imputación normal; reversa = espejo exacto de una anulación completa;
  -- ajuste = reservado para NC, devoluciones y ajustes parciales (bloqueado en 1B)
  tipo_movimiento text NOT NULL DEFAULT 'original'
    CHECK (tipo_movimiento IN ('original','reversa','ajuste')),
  origen_imputacion_id uuid REFERENCES public.contab_imputaciones_analiticas(id) ON DELETE RESTRICT,
  -- snapshot histórico al imputar
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
-- Una sola reversa por imputación original (los ajustes futuros pueden ser varios)
CREATE UNIQUE INDEX contab_imput_reversa_uq ON public.contab_imputaciones_analiticas (origen_imputacion_id)
  WHERE tipo_movimiento = 'reversa';

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

-- Nota de permisos: todas las funciones de trigger son SECURITY DEFINER (dueño = rol de
-- migración), con EXECUTE revocado a PUBLIC/anon/authenticated. Postgres solo verifica
-- EXECUTE al crear el trigger, no al dispararlo, y una función RETURNS trigger no se puede
-- invocar directamente. Así leen todas las líneas sin depender de la RLS del usuario y
-- nadie puede llamarlas por fuera. No hay funciones auxiliares sueltas invocables.

-- 6) Imputaciones: guarda (NEW/OLD explícitos, bloqueo de línea, snapshot histórico)
CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_guarda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_estado text; v_fecha date; v_rev uuid; v_sub record; v_ori record; v_lr record;
        v_es_sistema boolean := (current_user = (SELECT tableowner FROM pg_tables
                                 WHERE schemaname='public' AND tablename='contab_imputaciones_analiticas'))
                                AND session_user <> current_user;
BEGIN
  -- UPDATE / DELETE: siempre por OLD; nunca sobre asientos no borrador ni reversas
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

  -- Bloqueo de la línea: serializa toda alta/edición concurrente sobre la misma línea
  SELECT a.estado, a.fecha, a.reversa_de INTO v_estado, v_fecha, v_rev
    FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
   WHERE l.id = NEW.linea_id FOR UPDATE OF l;

  IF NEW.tipo_movimiento = 'reversa' THEN
    -- Solo el trigger privilegiado de reversa (SECURITY DEFINER) puede crearlas.
    -- No depende de variables de sesión: lo decide el rol efectivo.
    IF TG_OP <> 'INSERT' OR NOT v_es_sistema THEN
      RAISE EXCEPTION 'Las contraimputaciones solo las genera la reversa del asiento';
    END IF;
    SELECT i.*, lo.orden, lo.asiento_id INTO v_ori
      FROM contab_imputaciones_analiticas i JOIN contab_asiento_lineas lo ON lo.id = i.linea_id
     WHERE i.id = NEW.origen_imputacion_id;
    SELECT orden, asiento_id INTO v_lr FROM contab_asiento_lineas WHERE id = NEW.linea_id;
    IF v_ori.id IS NULL OR v_ori.tipo_movimiento <> 'original' OR v_rev IS DISTINCT FROM v_ori.asiento_id
       OR v_lr.orden <> v_ori.orden OR NEW.importe <> v_ori.importe OR NEW.subcentro_id <> v_ori.subcentro_id
       OR NEW.obra_id IS DISTINCT FROM v_ori.obra_id OR NEW.maquinaria_id IS DISTINCT FROM v_ori.maquinaria_id
       OR NEW.obra_atribucion IS DISTINCT FROM v_ori.obra_atribucion OR NEW.naturaleza <> v_ori.naturaleza THEN
      RAISE EXCEPTION 'La contraimputación no es espejo exacto del original';
    END IF;
    RETURN NEW;   -- copia exacta, incluido el snapshot del original
  END IF;

  IF NEW.tipo_movimiento = 'ajuste' THEN
    RAISE EXCEPTION 'Los ajustes parciales (NC, devoluciones) se habilitan en una fase posterior';
  END IF;

  -- Original: solo en borrador
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

  -- Snapshot histórico: cambios posteriores del centro/subcentro no alteran la interpretación
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

-- 7) Tope por línea: diferido al COMMIT; el bloqueo del paso 6 serializa transacciones
--    concurrentes (la segunda espera y, en READ COMMITTED, ve las filas confirmadas de la primera)
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
-- (DELETE solo reduce la suma; no necesita tope. Borrar una línea arrastra sus imputaciones de borrador.)

-- 8) Al confirmar: suma exacta en cuentas con analítica obligatoria (diferido)
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

-- 9) Reversa: contraimputaciones exactas creadas por el rol privilegiado (sin variables de sesión)
CREATE OR REPLACE FUNCTION public.contab_trg_reversa_imputaciones() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
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
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.contab_trg_reversa_imputaciones() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contab_reversa_imputaciones AFTER UPDATE OF estado ON public.contab_asientos
  FOR EACH ROW WHEN (OLD.estado = 'borrador' AND NEW.estado = 'confirmado' AND NEW.reversa_de IS NOT NULL)
  EXECUTE FUNCTION public.contab_trg_reversa_imputaciones();
-- Como la reversa no exime vigencia/activo, revertir un asiento cuyo subcentro ya se desactivó funciona.

-- 9b) Historial de centros/subcentros: con imputaciones confirmadas no se puede acotar la
--     vigencia excluyendo fechas ya imputadas. Activo/nombre/descr. solo afectan el futuro
--     (los reportes usan el snapshot de la imputación).
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
-- Las funciones de trigger de los pasos 4 y 5 también pasan a SECURITY DEFINER con el mismo REVOKE,
-- para que vean todas las imputaciones al validar sin depender de la RLS.

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

-- 13) Vista de resultados netos (respeta RLS del usuario; usa el snapshot histórico)
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
GRANT SELECT ON public.contab_analitica_neta TO authenticated;
```

Reglas de reportes: por centro/subcentro/máquina se suma todo `importe_neto`; por obra solo `obra_atribucion = 'economica'`. Original (+) y reversa (−) se compensan; los futuros ajustes parciales sumarán con su propio signo. El costo nunca se duplica y los cambios posteriores de nombre o estado no alteran el histórico.

## Datos iniciales (carga de datos, después de la migración)
OBR Obras · MAQ Maquinarias · TAL Taller · ADM Administración · DEP Depósito / Stock · GG Gastos Generales — `ON CONFLICT (codigo) DO NOTHING`. Configurables. Ningún subcentro automático. Ninguna cuenta marcada como `requiere_analitica` hasta definirlo con el contador.

## Controles previos (solo lectura, antes de migrar)
- Conteos de obras, maquinarias, partes, remitos, combustible, stock, certificados, clientes, proveedores, asientos, líneas y auditoría.
- Confirmar que no existen objetos con los nombres de 1B.
- Confirmar dueño de las tablas contables (rol de migración) para el control de rol efectivo de reversas.
- Firma de `contab_revertir_asiento` y `contab_confirmar_asiento` sin cambios respecto de 0B.

## Verificaciones posteriores (transacciones con ROLLBACK; no queda nada guardado)
Permisos efectivos (simulando sesión con `request.jwt.claims` y `SET ROLE authenticated`)
1. Sin sesión, maquinista, remitero, capataz, tesorero y aprobador_pagos: 0 filas al leer las 3 tablas y la vista; altas/ediciones rechazadas; `contab_subcentros_sugeridos()` rechazada.
2. Llamar directamente cualquier función de trigger de 1B como `authenticated` → rechazado.
3. Admin y contador: crear centro y subcentro, imputar, editar y borrar en borrador, confirmar y revertir sin error.

Inmutabilidad y reversas
4. Editar o borrar imputaciones de asiento confirmado o revertido → rechazado (admin y contador).
5. Insertar a mano una imputación `reversa` o `ajuste` (admin y contador) → rechazado.
6. Revertir un asiento con 3 imputaciones (incluida una máquina + obra económica): se crean 3 contraimputaciones con mismo importe, subcentro, dimensiones y snapshot; neto 0 por centro, máquina y obra; una segunda reversa no duplica (índice único + regla de 0B).
7. Revertir después de desactivar el subcentro → funciona.

Importes
8. Superar el importe de la línea en una o varias altas o ediciones → rechazo al confirmar la transacción.
9. Bajar el importe de la línea por debajo de lo imputado → rechazo.
10. Concurrencia: dos sesiones imputan la misma línea; la segunda espera al bloqueo y se rechaza si en conjunto exceden.
11. Cuenta marcada sin imputar al 100 % → no confirma; con 100 % → confirma; cuenta no marcada → confirma sin imputar.

Doble dimensión e historial
12. Subcentro de máquina + obra: un único importe; suma en la máquina siempre y en la obra solo si es económica.
13. Renombrar o desactivar centro/subcentro con imputaciones → los reportes conservan código y nombre originales.
14. Acotar vigencia excluyendo fechas imputadas, cambiar código, tipo o vínculo con imputaciones, o borrar con imputaciones → rechazado.
15. Duplicados y asociaciones inválidas (como en la revisión anterior).

Compatibilidad
16. Conteos de controles previos idénticos.
17. Ciclo completo de 0B y funciones de 1A dentro de transacción revertida.
18. Rentabilidad sin cambios.

## Recuperación — procedimiento inverso transaccional
Solo si se decide desinstalar 1B. Aborta si hay cualquier dato real o si otra estructura depende de 1B. Conserva la auditoría (sus registros de 1B quedan como historial) y la columna aditiva del plan de cuentas.

```sql
DO $$
DECLARE v_dep text;
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Solo el rol de migración'; END IF;

  -- Datos reales: si existen, no se toca nada
  IF EXISTS (SELECT 1 FROM public.contab_imputaciones_analiticas) THEN RAISE EXCEPTION 'Hay imputaciones'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_subcentros_costo) THEN RAISE EXCEPTION 'Hay subcentros'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_centros_costo
              WHERE codigo NOT IN ('OBR','MAQ','TAL','ADM','DEP','GG') OR updated_at <> created_at) THEN
    RAISE EXCEPTION 'Hay centros nuevos o modificados'; END IF;
  IF EXISTS (SELECT 1 FROM public.contab_plan_cuentas WHERE requiere_analitica) THEN
    RAISE EXCEPTION 'Hay cuentas con analítica obligatoria'; END IF;

  -- Dependencias posteriores: vistas, FKs o funciones externas que usen las tablas de 1B
  SELECT string_agg(DISTINCT d.classid::regclass || ':' || d.objid, ', ') INTO v_dep
    FROM pg_depend d
   WHERE d.refobjid IN ('public.contab_centros_costo'::regclass, 'public.contab_subcentros_costo'::regclass,
                        'public.contab_imputaciones_analiticas'::regclass)
     AND d.deptype = 'n'
     AND NOT EXISTS (SELECT 1 FROM pg_rewrite r WHERE r.oid = d.objid
                      AND r.ev_class = 'public.contab_analitica_neta'::regclass)
     AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.oid = d.objid
                      AND c.conrelid IN ('public.contab_subcentros_costo'::regclass,
                                         'public.contab_imputaciones_analiticas'::regclass));
  IF v_dep IS NOT NULL THEN RAISE EXCEPTION 'Otras estructuras dependen de 1B: %', v_dep; END IF;

  -- Retiro en orden, sin CASCADE (si algo no previsto depende, falla y no se aplica nada)
  DROP TRIGGER contab_reversa_imputaciones ON public.contab_asientos;
  DROP TRIGGER contab_asiento_analitica ON public.contab_asientos;
  DROP TRIGGER contab_linea_tope ON public.contab_asiento_lineas;
  DROP VIEW public.contab_analitica_neta;
  DROP FUNCTION public.contab_subcentros_sugeridos();
  ALTER TABLE public.contab_centros_costo DISABLE TRIGGER contab_auditar_centros;
  DELETE FROM public.contab_centros_costo WHERE codigo IN ('OBR','MAQ','TAL','ADM','DEP','GG');
  DROP TABLE public.contab_imputaciones_analiticas RESTRICT;
  DROP TABLE public.contab_subcentros_costo RESTRICT;
  DROP TABLE public.contab_centros_costo RESTRICT;
  DROP FUNCTION public.contab_trg_reversa_imputaciones(), public.contab_trg_asiento_analitica(),
    public.contab_trg_tope_linea(), public.contab_trg_imputacion_guarda(),
    public.contab_trg_vigencia_historica(), public.contab_trg_subcentro_guarda(),
    public.contab_trg_centro_guarda(), public.contab_puede_centros() RESTRICT;
END $$;
```
Todo el bloque es una única transacción: si una verificación o un retiro falla, no se aplica nada.

## Implementación gradual (solo con tu autorización expresa)
1. Controles previos (lectura) y registro de conteos.
2. Aplicar la migración `contab_1b_centros_costo`.
3. Controles posteriores inmediatos: objetos creados, permisos de funciones, RLS activa, conteos iguales.
4. Cargar los 6 centros iniciales.
5. Verificaciones 1–18 con ROLLBACK.
6. Pantalla Contabilidad → Configuración → Centros de costo (centros, subcentros, sugeridos) e imputación por línea en asientos en borrador; tests y compilación.
7. Prueba en navegador como admin, sin dejar datos de prueba.
