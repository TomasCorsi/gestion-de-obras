# Contabilidad – Fase 0A: SQL corregido y validación en entorno aislado

Alcance: solo 0A. Se ejecuta **únicamente en un borrador aislado** (copia del proyecto con base propia, sin datos de producción). Producción no se toca. Al aprobar este plan: creo el borrador, aplico, corro las pruebas y te entrego el informe y el SQL final para que apruebes la publicación.

## 1. Correcciones aplicadas

| # | Pedido | Solución |
|---|---|---|
| 1 | Superposición segura en concurrencia | Restricciones de exclusión `EXCLUDE USING gist (daterange(...) WITH &&)` en ejercicios y períodos (solo rangos: no requiere extensión). La pertenencia del período al ejercicio se valida con bloqueo `FOR SHARE` del ejercicio, y el cambio de fechas del ejercicio toma `FOR UPDATE` y verifica sus períodos. |
| 2 | Reversa solo por función autorizada y exacta | El trigger rechaza confirmar, revertir o insertar contraasientos si quien ejecuta es un usuario de la app (`authenticated`/`anon`): solo funciones privilegiadas (las actuales y las de 0B). Al marcar revertido verifica que el contraasiento sea espejo exacto (misma cuenta, obra, máquina, moneda e importe, debe↔haber). Ambos asientos quedan. |
| 3 | Concurrencia en la confirmación | Al confirmar se bloquean: el período (`FOR SHARE`; el cierre usa `FOR UPDATE`), las líneas y sus cuentas (`FOR SHARE`, así no se desactivan a mitad). El trigger de líneas bloquea el asiento padre (`FOR UPDATE`): no se pueden agregar líneas mientras se confirma. Las cuentas con movimientos confirmados no pueden pasar a no imputables ni inactivas (trigger en plan de cuentas). |
| 4 | Vuelta atrás sin pérdida | El script inverso aborta solo si encuentra cualquier dato en tablas nuevas, cualquier asiento no borrador, cualquier valor en columnas nuevas distinto del default, o cualquier objeto de 0B. |
| 5 | Numeración | **Se implementa en 0B**, no en 0A. Diseño: dentro de la transacción de confirmación `UPDATE contab_ejercicios SET ultimo_numero = ultimo_numero + 1 ... RETURNING` (bloqueo de fila: serializa), sin huecos porque si la transacción falla el número vuelve; el índice único `(ejercicio_id, numero_ejercicio)` es la red de seguridad. Se probará con dos conexiones simultáneas en 0B. |
| 6 | Permisos | Ver sección 3. |
| 7 | Compatibilidad con funciones actuales | Pruebas específicas (sección 5). |
| 8 | Conteo exacto y datos iniciales | Ver secciones 2.4 y 4. |

## 2. SQL corregido

### 2.1 Migración 0A-1 (aparte por regla de Postgres sobre valores nuevos de tipo)

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tesorero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'aprobador_pagos';
```

### 2.2 Migración 0A-2: ejercicios, períodos, cuentas por función

```sql
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

-- Período dentro de su ejercicio; reglas de cierre y reapertura
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

-- Cambio de fechas del ejercicio: no puede dejar períodos afuera
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

REVOKE ALL ON FUNCTION public.contab_trg_periodo_valida(), public.contab_trg_ejercicio_valida() FROM PUBLIC, anon, authenticated;

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
```

### 2.3 Migración 0A-3: asientos, líneas, cuentas

```sql
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

CREATE UNIQUE INDEX uq_contab_asiento_numero ON public.contab_asientos (ejercicio_id, numero_ejercicio)
  WHERE numero_ejercicio IS NOT NULL;
CREATE UNIQUE INDEX uq_contab_asiento_origen_evento ON public.contab_asientos (origen_tipo, origen_id, clave_evento)
  WHERE origen_id IS NOT NULL AND estado IN ('borrador','confirmado');
CREATE UNIQUE INDEX uq_contab_asiento_reversa ON public.contab_asientos (reversa_de) WHERE reversa_de IS NOT NULL;
CREATE INDEX idx_contab_asientos_periodo ON public.contab_asientos (periodo_id, fecha);

ALTER TABLE public.contab_asiento_lineas ALTER COLUMN debe SET DEFAULT 0, ALTER COLUMN haber SET DEFAULT 0;
UPDATE public.contab_asiento_lineas SET debe = COALESCE(debe,0), haber = COALESCE(haber,0)
  WHERE debe IS NULL OR haber IS NULL;
ALTER TABLE public.contab_asiento_lineas ALTER COLUMN debe SET NOT NULL, ALTER COLUMN haber SET NOT NULL;
ALTER TABLE public.contab_asiento_lineas
  ADD COLUMN moneda text NOT NULL DEFAULT 'ARS',
  ADD COLUMN cotizacion numeric(18,6) NOT NULL DEFAULT 1,
  ADD COLUMN importe_origen numeric(18,2),
  ADD CONSTRAINT chk_linea_montos CHECK (debe >= 0 AND haber >= 0 AND ((debe > 0) <> (haber > 0))),
  ADD CONSTRAINT chk_linea_cotizacion CHECK (cotizacion > 0);
ALTER TABLE public.contab_asiento_lineas DROP CONSTRAINT contab_asiento_lineas_cuenta_id_fkey;
ALTER TABLE public.contab_asiento_lineas ADD CONSTRAINT contab_asiento_lineas_cuenta_id_fkey
  FOREIGN KEY (cuenta_id) REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT;
CREATE INDEX idx_contab_lineas_cuenta ON public.contab_asiento_lineas (cuenta_id);

-- ¿Ejecuta un usuario de la app (y no una función privilegiada)?
-- Las funciones privilegiadas corren como su dueño; un usuario directo corre como authenticated/anon.
CREATE FUNCTION public.contab_es_usuario_directo()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT current_user IN ('authenticated','anon')
$$;

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
    -- Contraasiento espejo exacto
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

  -- OLD borrador
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
  -- v_estado nulo: el asiento borrador se está borrando en cascada
  IF v_estado IS NOT NULL AND v_estado <> 'borrador' THEN
    RAISE EXCEPTION 'El asiento está confirmado: sus líneas no se modifican';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trg_contab_linea_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_asiento_lineas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_linea_guarda();

-- Cuentas con movimientos confirmados no pierden su condición de imputable/activa
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
  public.contab_trg_cuenta_guarda() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contab_es_usuario_directo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_es_usuario_directo() TO authenticated;
```

Nota sobre la cuenta: desactivar una cuenta con movimientos **confirmados** se permite (historial intacto, no admite nuevos); lo que se bloquea es desactivarla mientras haya borradores que la usan, para no dejar asientos imposibles de confirmar. Confirmar con cuenta inactiva igual falla por el bloqueo `FOR SHARE` + validación.

### 2.4 Inventario exacto de 0A

- Valores de rol: 2.
- Tablas nuevas: 3.
- Columnas nuevas: 13 en asientos, 3 en líneas. Columnas modificadas: `debe`, `haber` (default 0, NOT NULL).
- Restricciones nuevas: ejercicios 4 (estado, rango, número, exclusión); períodos 5 (estado, mes, rango, único, exclusión); config 1 (clave); asientos 6 CHECK + 4 FK (ejercicio, período, reversa_de, revertido_por); líneas 2 CHECK; 1 FK recreada (cuenta, RESTRICT). Más 2 FK de tablas nuevas (período→ejercicio, config→cuenta).
- Índices nuevos: 4 en asientos (3 únicos parciales + 1), 1 en líneas; más los implícitos de PK, único y exclusión de las tablas nuevas.
- Funciones nuevas: 6 (`contab_es_usuario_directo` + 5 de trigger).
- Triggers nuevos: 5 (períodos, ejercicios, asientos, líneas, plan de cuentas).
- Políticas nuevas: 3 de lectura. Políticas existentes: sin cambios.

## 3. Permisos activos

**En 0A**
- Tablas nuevas: SELECT para authenticated filtrado por RLS a admin/contador; sin INSERT/UPDATE/DELETE para usuarios (ni GRANT ni política). Escritura solo service_role y funciones privilegiadas.
- Tablas existentes `contab_*`: **mantienen sus políticas actuales** (el contador aún puede escribir directo), pero los triggers ya impiden: confirmar o revertir desde un usuario directo, editar o borrar confirmados, crear contraasientos a mano.
- Funciones de trigger: sin EXECUTE para nadie (además no son invocables por la API).
- `contab_generar_asiento_cbte/pago`: siguen con EXECUTE para authenticated y su verificación interna admin/contador (sin cambios).

**Recién en 0B**: quitar escritura directa sobre asientos/líneas/pagos; funciones de confirmación, reversa, numeración, cierre; auditoría; `contab_puede`.

**Funciones contables existentes (verificado en la base)**: `contab_generar_asiento_cbte` y `contab_generar_asiento_pago` son SECURITY DEFINER, propiedad de `postgres`, con EXECUTE para `authenticated` y `service_role`, y validan internamente rol admin/contador. Se re-verifica en el borrador: dueño, `search_path`, EXECUTE de `anon`/`PUBLIC` (debe ser nulo) y que un usuario sin rol reciba "No autorizado".

**Protección transitoria**: distinguir usuario directo de función privilegiada con `current_user` es una medida **provisoria de 0A**. Es válida solo mientras toda función que confirme o revierta sea DEFINER de `postgres`. En 0B se reemplaza por RLS sin escritura directa + `contab_puede(acción)` dentro de cada función; el chequeo de `current_user` queda como segunda barrera.

## 4. Datos iniciales verificados

Las 9 cuentas existen, imputables y activas (verificado hoy en la base):

| clave | código | cuenta |
|---|---|---|
| caja | 1.1.1.01 | Caja en pesos |
| banco | 1.1.1.02 | Banco cuenta corriente |
| deudores | 1.1.2.01 | Deudores por Ventas |
| iva_cf | 1.1.4.01 | IVA Crédito Fiscal |
| percepciones | 1.1.4.02 | Percepciones a Recuperar |
| proveedores | 2.1.1.01 | Proveedores |
| iva_df | 2.1.3.01 | IVA Débito Fiscal |
| ventas | 4.1.1.01 | Ventas de Servicios |
| compras | 5.1.1.01 | Compras de Mercaderías |

Carga (con la herramienta de datos, no en la migración):
```sql
INSERT INTO public.contab_cuentas_config (clave, cuenta_id, descripcion)
SELECT v.clave, c.id, c.nombre FROM (VALUES
 ('caja','1.1.1.01'),('banco','1.1.1.02'),('deudores','1.1.2.01'),('iva_cf','1.1.4.01'),
 ('percepciones','1.1.4.02'),('proveedores','2.1.1.01'),('iva_df','2.1.3.01'),
 ('ventas','4.1.1.01'),('compras','5.1.1.01')) v(clave,codigo)
JOIN public.contab_plan_cuentas c ON c.codigo = v.codigo;
-- verificación: deben ser 9 filas
```

## 5. Ejecución de 0A sobre la base actual (reemplaza al borrador aislado)

Condiciones: una sola base (la actual de Calamina ERP), sin borradores, proyectos ni entornos nuevos. No se ejecuta nada hasta la autorización explícita de este procedimiento. 0B y 0C no se ejecutan automáticamente.

### 5.1 Respaldo real disponible (verificar antes de tocar la base)
- Lovable Cloud hace **una copia automática diaria** de la base (estructura y datos), retenida ~14 días. Se ve en **More → Database → Manage → Backups**, con hora UTC.
- **No hay recuperación a un momento exacto**: solo se puede volver a la copia diaria completa. Restaurar es **en el mismo lugar, total y permanente**: se pierde todo lo cargado después de esa copia (partes, remitos, combustible de ese día), y la base queda unos minutos fuera de servicio.
- No hay restauración por tabla. Los archivos (adjuntos, documentos) no están incluidos.
- La **exportación** (Settings → Export data) es una foto descargable, no un backup restaurable desde la app: sirve como evidencia y resguardo externo, no como vuelta atrás.
- Vuelta atrás **real** de 0A: el script inverso (sección 6), que solo toca objetos contables nuevos. La copia diaria queda como último recurso.
- Acción del usuario antes de empezar: confirmar en Backups que existe copia de hoy y anotar su hora; opcionalmente pedir una exportación.

### 5.2 Auditoría previa sin escritura (solo lectura)
1. Inventario de tablas, columnas, restricciones, índices, triggers, funciones y políticas de todo el esquema `public`.
2. Foto de control de módulos operativos: conteo de filas y suma de control (`md5` de filas ordenadas) por tabla de obras, máquinas, combustible, remitos, stock, personal, certificados, RRHH, cotizaciones y contabilidad actual.
3. Confirmar que no existen objetos con los nombres que crea 0A (tablas, tipos, funciones, índices, triggers).
4. Confirmar valores actuales de `app_role` y quién los usa.
5. Verificar las 9 cuentas usadas por la configuración inicial (existen, imputables, activas).
6. Confirmar que `contab_generar_asiento_cbte` y `contab_generar_asiento_pago` no cambian de definición en 0A.
7. Revisar dependencias de pantallas actuales de Contabilidad sobre las tablas `contab_*` existentes.
8. Linter de seguridad y salud de base como línea de base.

### 5.3 Migraciones graduales (una por vez, con verificación)
Cada paso: aplicar → verificar por lectura → recién entonces el siguiente. Si un paso falla, se deshace solo y se frena.
1. **0A-1** tipos y tablas (ejercicios, períodos, configuración de cuentas, asientos/líneas nuevas) + permisos + RLS. Verificar: objetos creados, permisos y políticas esperadas, foto operativa idéntica.
2. **0A-2** validaciones y triggers (superposición, cuadre, inmutabilidad, reversas). Verificar: definiciones, triggers enganchados solo a tablas contables nuevas.
3. **0A-3** funciones de confirmación/reversa y permisos de ejecución. Verificar: `SECURITY` y `search_path` correctos, sin EXECUTE a `anon`.
4. **Carga de `contab_cuentas_config`**: único dato que se inserta; es configuración real (no ficticia) y se puede quitar con el inverso.
- Nota: si 0A agrega valores a `app_role`, esa parte **no se puede deshacer** limpiamente; se aplica al final y solo si se confirma.

### 5.4 Pruebas posibles sin riesgo en producción
- **Sin escritura**: existencia y definición de objetos, restricciones, índices de exclusión, permisos por rol (`has_table_privilege`, `has_function_privilege`), políticas RLS, foto operativa antes/después.
- **Con escritura revertida**: casos de un solo usuario (superposición de rangos, línea con debe y haber, negativos, confirmar descuadrado, editar confirmado, reversa no exacta, doble reversa, borrar cuenta con movimientos) ejecutados como **un único bloque que termina siempre en ROLLBACK**, simulando roles con `set local role` y `request.jwt.claims`. Nada queda guardado. Requiere confirmar antes, con una prueba vacía, que la herramienta respeta el ROLLBACK; si no, estos casos pasan a pendientes.
- Al terminar: verificar que no quedó ninguna fila de prueba ni función `contab_test_%`.

### 5.5 Pruebas que NO se harán en producción (quedan pendientes)
- **Concurrencia con dos conexiones** (rangos pisados en simultáneo, confirmar mientras otro edita): requiere transacciones abiertas en paralelo y bloqueos sobre la base en uso. Se cubre por diseño (exclusiones y `FOR UPDATE`) y se valida cuando haya uso real controlado.
- **Compatibilidad con escritura real** de `contab_generar_asiento_cbte/pago`: crearía comprobantes y asientos persistentes. Se verifica por lectura que no cambian; la prueba real se hace con el contador sobre el primer comprobante verdadero.
- **Prueba completa del script inverso** (aplicar → revertir → reaplicar): en producción solo se valida su guarda en modo lectura; se ejecuta únicamente si hace falta revertir.

### 5.6 Compatibilidad
- 0A no modifica tablas, funciones ni pantallas existentes (incluida Contabilidad actual). Tras cada paso: foto operativa idéntica y prueba visual de Contabilidad, Remitos, Partes y Combustible.

### 5.7 Informe al cierre de 0A
Migraciones aplicadas con su SQL exacto, resultado de cada verificación, pruebas aprobadas/fallidas, pruebas pendientes con motivo, comparación de fotos operativas, hora de la copia diaria de referencia y riesgos abiertos. Luego se espera autorización para 0B.

## 6. Script inverso de 0A (con guarda)

Se ejecuta como **una sola migración = una sola transacción**: si la guarda aborta o cualquier paso falla, no se revierte nada. La guarda acepta en `contab_cuentas_config` únicamente los 9 registros iniciales exactos (clave + código de cuenta, sin ediciones); cualquier fila distinta o adicional aborta.

```sql
DO $$
DECLARE v_cfg_ok boolean;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.contab_cuentas_config) = 9
    AND NOT EXISTS (
      SELECT cc.clave, c.codigo FROM public.contab_cuentas_config cc
        JOIN public.contab_plan_cuentas c ON c.id = cc.cuenta_id
       WHERE cc.updated_by IS NULL
      EXCEPT
      SELECT * FROM (VALUES ('caja','1.1.1.01'),('banco','1.1.1.02'),('deudores','1.1.2.01'),
        ('iva_cf','1.1.4.01'),('percepciones','1.1.4.02'),('proveedores','2.1.1.01'),
        ('iva_df','2.1.3.01'),('ventas','4.1.1.01'),('compras','5.1.1.01')) v(clave,codigo))
    AND (SELECT COUNT(*) FROM public.contab_cuentas_config WHERE updated_by IS NULL) = 9
  INTO v_cfg_ok;
  IF (SELECT COUNT(*) FROM public.contab_cuentas_config) > 0 AND NOT v_cfg_ok THEN
    RAISE EXCEPTION 'Vuelta atrás abortada: la configuración de cuentas fue modificada';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contab_ejercicios) OR EXISTS (SELECT 1 FROM public.contab_periodos)
     OR EXISTS (SELECT 1 FROM public.contab_asientos WHERE estado <> 'borrador' OR ejercicio_id IS NOT NULL
                OR periodo_id IS NOT NULL OR numero_ejercicio IS NOT NULL OR origen_id IS NOT NULL
                OR reversa_de IS NOT NULL OR revertido_por IS NOT NULL OR clave_evento <> 'alta'
                OR confirmado_at IS NOT NULL OR motivo IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.contab_asiento_lineas WHERE moneda <> 'ARS' OR cotizacion <> 1 OR importe_origen IS NOT NULL)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('contab_confirmar_asiento','contab_revertir_asiento','contab_puede'))
     OR EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE 'contab_test_%') THEN
    RAISE EXCEPTION 'Vuelta atrás abortada: hay datos contables, objetos de prueba o fases posteriores aplicadas';
  END IF;
END $$;
DROP TRIGGER trg_contab_cuenta_guarda ON public.contab_plan_cuentas;
DROP TRIGGER trg_contab_linea_guarda ON public.contab_asiento_lineas;
DROP TRIGGER trg_contab_asiento_guarda ON public.contab_asientos;
DROP FUNCTION public.contab_trg_cuenta_guarda(), public.contab_trg_linea_guarda(),
  public.contab_trg_asiento_guarda(), public.contab_es_usuario_directo();
ALTER TABLE public.contab_asiento_lineas DROP CONSTRAINT contab_asiento_lineas_cuenta_id_fkey;
ALTER TABLE public.contab_asiento_lineas ADD CONSTRAINT contab_asiento_lineas_cuenta_id_fkey
  FOREIGN KEY (cuenta_id) REFERENCES public.contab_plan_cuentas(id) ON DELETE SET NULL;
DROP INDEX public.idx_contab_lineas_cuenta;
ALTER TABLE public.contab_asiento_lineas DROP CONSTRAINT chk_linea_montos, DROP CONSTRAINT chk_linea_cotizacion,
  DROP COLUMN moneda, DROP COLUMN cotizacion, DROP COLUMN importe_origen,
  ALTER COLUMN debe DROP NOT NULL, ALTER COLUMN haber DROP NOT NULL;
DROP INDEX public.uq_contab_asiento_numero, public.uq_contab_asiento_origen_evento,
  public.uq_contab_asiento_reversa, public.idx_contab_asientos_periodo;
ALTER TABLE public.contab_asientos
  DROP CONSTRAINT chk_asiento_estado, DROP CONSTRAINT chk_asiento_origen, DROP CONSTRAINT chk_asiento_confirmado,
  DROP CONSTRAINT chk_asiento_reversa_propia, DROP CONSTRAINT chk_asiento_revertido, DROP CONSTRAINT chk_asiento_reversa_clave,
  DROP COLUMN ejercicio_id, DROP COLUMN periodo_id, DROP COLUMN numero_ejercicio, DROP COLUMN estado,
  DROP COLUMN origen_tipo, DROP COLUMN origen_id, DROP COLUMN clave_evento, DROP COLUMN reversa_de,
  DROP COLUMN revertido_por, DROP COLUMN confirmado_at, DROP COLUMN confirmado_por, DROP COLUMN motivo, DROP COLUMN version;
DROP TRIGGER trg_contab_periodo_valida ON public.contab_periodos;
DROP TRIGGER trg_contab_ejercicio_valida ON public.contab_ejercicios;
DROP FUNCTION public.contab_trg_periodo_valida(), public.contab_trg_ejercicio_valida();
DROP TABLE public.contab_cuentas_config, public.contab_periodos, public.contab_ejercicios;
```
Los defaults originales de `debe`/`haber` se registran en la foto previa y se restauran exactamente. Este script contiene borrados de estructura: se ejecutará solo con tu aprobación explícita en el momento.

## 7. Riesgos pendientes conocidos

- Depender de `current_user` para distinguir funciones privilegiadas: válido mientras todas las funciones contables privilegiadas sean propiedad del dueño de la base; se verificará en el informe y se reemplaza en 0B por `contab_puede` + RLS sin escritura directa.
- Hasta 0B el contador conserva escritura directa sobre borradores (los confirmados ya quedan protegidos).
- `ADD VALUE` de roles no se revierte (inocuo).
- Publicar a producción requiere tu aprobación del informe; el borrador no publica nada por sí mismo.
