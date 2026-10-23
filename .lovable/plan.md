# Contabilidad – Fase 0: diseño técnico cerrado y SQL definitivo de 0A

Solo Fase 0. No se ejecuta nada hasta tu aprobación explícita de 0A. Ningún objeto fuera de `contab_*` y del tipo de roles se modifica.

## 1. División de la fase

| Sub-fase | Contenido | Toca la app | Riesgo |
|---|---|---|---|
| **0A** | Tablas de ejercicios, períodos, cuentas por función; columnas y restricciones de asientos; triggers de inmutabilidad y validación | No | Bajo: tablas contables vacías, cambios aditivos |
| **0B** | Funciones transaccionales, permisos (RLS), auditoría | No | Medio: cambia quién puede escribir |
| **0C** | Conexión de la pantalla Contabilidad, diario, mayor, balance de comprobación, validación integral | Solo módulo Contabilidad | Medio |

Cada sub-fase se ejecuta primero en un **borrador aislado** (copia del proyecto con su propia base, sin datos de producción) y solo después de pasar las pruebas se aplica a producción.

## 2. Backups y recuperación reales en Lovable Cloud

- Backup automático diario, retención de unos 14 días, incluye estructura y datos (no archivos).
- **No hay recuperación a un momento puntual**: solo a la foto diaria. Restaurar pisa toda la base y se pierde todo lo cargado después (remitos, partes, combustible del día). Por eso **no es la vía de vuelta atrás de una sub-fase**; es último recurso ante desastre.
- Exportación completa de la base (Más → Base de datos → Administrar → Configuración → Exportar datos), una cada 24 h. Se hace antes de cada sub-fase en producción y se guarda.
- **Vía principal de vuelta atrás**: script inverso por sub-fase, escrito y probado en el borrador antes de producción (sección 7). Como las tablas contables están vacías y los cambios son aditivos, el script inverso no afecta datos operativos.
- Se elimina la idea de "bandera para volver al guardado antiguo": era contradictoria con bloquear escrituras directas. La vuelta atrás de 0B/0C es script inverso de base + volver a la versión anterior del código, en ese orden coordinado.

## 3. Matriz de permisos

| Acción | admin | contador | tesorero* | aprobador_pagos* | resto |
|---|---|---|---|---|---|
| Leer contabilidad, diario, mayor, balance | Sí | Sí | Sí | Sí | No |
| Crear/editar borradores (asientos, comprobantes) | Sí | Sí | No | No | No |
| Confirmar asiento / comprobante | Sí | Sí | No | No | No |
| Revertir asiento / anular comprobante | Sí | Sí | No | No | No |
| Registrar pago o cobro | Sí | Sí | Sí | No | No |
| Aprobar pagos (Fase 4) | Sí | No | No | Sí | No |
| Abrir/cerrar períodos y ejercicios | Sí | No | No | No | No |
| Reabrir período cerrado | Sí (con motivo, auditado) | No | No | No | No |
| Configurar cuentas por función y plan de cuentas | Sí | No | No | No | No |
| Escribir directo en asientos/líneas/auditoría | **Nadie** (solo funciones) | | | | |
| Leer auditoría | Sí | Sí | No | No | No |

*Roles nuevos, sin usuarios asignados en Fase 0.

## 4. SQL definitivo de 0A

Tres migraciones, en este orden. No incluyen políticas de escritura (las tablas nuevas quedan legibles para admin/contador y sin escritura directa hasta 0B; las existentes conservan sus políticas actuales).

### 0A-1 Roles (migración aparte: un valor nuevo de tipo no puede usarse en la misma transacción)

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tesorero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'aprobador_pagos';
```

### 0A-2 Ejercicios, períodos y cuentas por función

```sql
CREATE TABLE public.contab_ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','cerrado')),
  ultimo_numero bigint NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0),
  cerrado_at timestamptz,
  cerrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT chk_ejercicio_rango CHECK (fecha_hasta > fecha_desde),
  CONSTRAINT uq_ejercicio_desde UNIQUE (fecha_desde)
);

CREATE TABLE public.contab_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id uuid NOT NULL REFERENCES public.contab_ejercicios(id) ON DELETE RESTRICT,
  anio integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','cerrado')),
  cerrado_at timestamptz,
  cerrado_por uuid,
  reabierto_at timestamptz,
  reabierto_por uuid,
  motivo_reapertura text,
  CONSTRAINT chk_periodo_rango CHECK (fecha_hasta >= fecha_desde),
  CONSTRAINT uq_periodo UNIQUE (ejercicio_id, anio, mes),
  CONSTRAINT uq_periodo_desde UNIQUE (fecha_desde)
);
CREATE INDEX idx_contab_periodos_fechas ON public.contab_periodos (fecha_desde, fecha_hasta);

CREATE TABLE public.contab_cuentas_config (
  clave text PRIMARY KEY CHECK (clave ~ '^[a-z_]+$'),
  cuenta_id uuid NOT NULL REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT,
  descripcion text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Sin superposición de ejercicios y períodos dentro de su ejercicio
CREATE OR REPLACE FUNCTION public.contab_trg_ejercicio_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contab_ejercicios e
             WHERE e.id <> NEW.id
               AND daterange(e.fecha_desde, e.fecha_hasta, '[]') && daterange(NEW.fecha_desde, NEW.fecha_hasta, '[]')) THEN
    RAISE EXCEPTION 'El ejercicio se superpone con otro';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado = 'cerrado' AND NEW.estado = 'cerrado'
     AND (NEW.fecha_desde, NEW.fecha_hasta) IS DISTINCT FROM (OLD.fecha_desde, OLD.fecha_hasta) THEN
    RAISE EXCEPTION 'No se pueden cambiar las fechas de un ejercicio cerrado';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_ejercicio_valida BEFORE INSERT OR UPDATE ON public.contab_ejercicios
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_ejercicio_valida();

CREATE OR REPLACE FUNCTION public.contab_trg_periodo_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE e public.contab_ejercicios%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.contab_ejercicios WHERE id = NEW.ejercicio_id;
  IF NEW.fecha_desde < e.fecha_desde OR NEW.fecha_hasta > e.fecha_hasta THEN
    RAISE EXCEPTION 'El período está fuera del ejercicio';
  END IF;
  IF EXISTS (SELECT 1 FROM public.contab_periodos p
             WHERE p.id <> NEW.id
               AND daterange(p.fecha_desde, p.fecha_hasta, '[]') && daterange(NEW.fecha_desde, NEW.fecha_hasta, '[]')) THEN
    RAISE EXCEPTION 'El período se superpone con otro';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.fecha_desde, NEW.fecha_hasta, NEW.ejercicio_id)
        IS DISTINCT FROM (OLD.fecha_desde, OLD.fecha_hasta, OLD.ejercicio_id)
     AND EXISTS (SELECT 1 FROM public.contab_asientos a WHERE a.periodo_id = OLD.id) THEN
    RAISE EXCEPTION 'El período tiene asientos: no se pueden cambiar sus fechas';
  END IF;
  IF e.estado = 'cerrado' AND NEW.estado = 'abierto' AND (TG_OP = 'INSERT' OR OLD.estado = 'cerrado') THEN
    RAISE EXCEPTION 'No se puede abrir un período de un ejercicio cerrado';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_periodo_valida BEFORE INSERT OR UPDATE ON public.contab_periodos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_periodo_valida();

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
-- Sin políticas de escritura: solo funciones de 0B podrán escribir.
```

### 0A-3 Asientos y líneas: columnas, restricciones e inmutabilidad

```sql
-- Asientos
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
  ADD CONSTRAINT chk_asiento_confirmado CHECK (
    estado = 'borrador' OR (ejercicio_id IS NOT NULL AND periodo_id IS NOT NULL
                            AND numero_ejercicio IS NOT NULL AND confirmado_at IS NOT NULL)),
  ADD CONSTRAINT chk_asiento_reversa_propia CHECK (reversa_de IS NULL OR reversa_de <> id),
  ADD CONSTRAINT chk_asiento_revertido CHECK ((estado = 'revertido') = (revertido_por IS NOT NULL)),
  ADD CONSTRAINT chk_asiento_reversa_clave CHECK (reversa_de IS NULL OR clave_evento = 'reversa:' || reversa_de::text);

CREATE UNIQUE INDEX uq_contab_asiento_numero ON public.contab_asientos (ejercicio_id, numero_ejercicio)
  WHERE numero_ejercicio IS NOT NULL;
-- Un solo asiento vigente por hecho: (documento, evento). Los ajustes usan clave 'ajuste:<id del ajuste>'
CREATE UNIQUE INDEX uq_contab_asiento_origen_evento ON public.contab_asientos (origen_tipo, origen_id, clave_evento)
  WHERE origen_id IS NOT NULL AND estado IN ('borrador','confirmado');
-- Un asiento solo puede revertirse una vez
CREATE UNIQUE INDEX uq_contab_asiento_reversa ON public.contab_asientos (reversa_de) WHERE reversa_de IS NOT NULL;
CREATE INDEX idx_contab_asientos_periodo ON public.contab_asientos (periodo_id, fecha);

-- Líneas: montos obligatorios, uno y solo uno positivo, moneda
ALTER TABLE public.contab_asiento_lineas ALTER COLUMN debe SET DEFAULT 0, ALTER COLUMN haber SET DEFAULT 0;
UPDATE public.contab_asiento_lineas SET debe = COALESCE(debe,0), haber = COALESCE(haber,0)
  WHERE debe IS NULL OR haber IS NULL;  -- tabla vacía hoy; respaldo por si acaso
ALTER TABLE public.contab_asiento_lineas ALTER COLUMN debe SET NOT NULL, ALTER COLUMN haber SET NOT NULL;
ALTER TABLE public.contab_asiento_lineas
  ADD COLUMN moneda text NOT NULL DEFAULT 'ARS',
  ADD COLUMN cotizacion numeric(18,6) NOT NULL DEFAULT 1,
  ADD COLUMN importe_origen numeric(18,2),
  ADD CONSTRAINT chk_linea_montos CHECK (debe >= 0 AND haber >= 0 AND ((debe > 0) <> (haber > 0))),
  ADD CONSTRAINT chk_linea_cotizacion CHECK (cotizacion > 0);
-- No se puede borrar una cuenta con movimientos
ALTER TABLE public.contab_asiento_lineas DROP CONSTRAINT contab_asiento_lineas_cuenta_id_fkey;
ALTER TABLE public.contab_asiento_lineas
  ADD CONSTRAINT contab_asiento_lineas_cuenta_id_fkey FOREIGN KEY (cuenta_id)
  REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT;
CREATE INDEX idx_contab_lineas_cuenta ON public.contab_asiento_lineas (cuenta_id);

-- Guardia de asientos
CREATE OR REPLACE FUNCTION public.contab_trg_asiento_guarda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_per public.contab_periodos%ROWTYPE;
  v_debe numeric; v_haber numeric; v_malas integer; v_sin integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'borrador' THEN RAISE EXCEPTION 'Un asiento nace en borrador'; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.estado <> 'borrador' THEN RAISE EXCEPTION 'No se puede borrar un asiento confirmado'; END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.estado = 'revertido' THEN
    RAISE EXCEPTION 'Asiento revertido: no admite cambios';
  END IF;

  IF OLD.estado = 'confirmado' THEN
    -- Única transición permitida: marcar revertido, con un contraasiento confirmado real
    IF NEW.estado <> 'revertido' OR NEW.revertido_por IS NULL
       OR (to_jsonb(NEW) - ARRAY['estado','revertido_por','updated_at'])
          IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['estado','revertido_por','updated_at'])
       OR NOT EXISTS (SELECT 1 FROM public.contab_asientos r
                      WHERE r.id = NEW.revertido_por AND r.reversa_de = OLD.id AND r.estado = 'confirmado') THEN
      RAISE EXCEPTION 'Asiento confirmado: solo puede revertirse mediante contraasiento';
    END IF;
    RETURN NEW;
  END IF;

  -- OLD borrador
  IF NEW.estado = 'revertido' THEN RAISE EXCEPTION 'Un borrador no se revierte, se borra'; END IF;
  IF NEW.estado = 'confirmado' THEN
    SELECT * INTO v_per FROM public.contab_periodos WHERE id = NEW.periodo_id;
    IF v_per.id IS NULL OR v_per.estado <> 'abierto' THEN RAISE EXCEPTION 'Período cerrado o inexistente'; END IF;
    IF NEW.fecha < v_per.fecha_desde OR NEW.fecha > v_per.fecha_hasta THEN RAISE EXCEPTION 'La fecha no corresponde al período'; END IF;
    IF v_per.ejercicio_id <> NEW.ejercicio_id THEN RAISE EXCEPTION 'Período y ejercicio no coinciden'; END IF;
    SELECT COALESCE(SUM(debe),0), COALESCE(SUM(haber),0) INTO v_debe, v_haber
      FROM public.contab_asiento_lineas WHERE asiento_id = NEW.id;
    IF v_debe = 0 OR v_debe <> v_haber THEN RAISE EXCEPTION 'Asiento descuadrado: debe % / haber %', v_debe, v_haber; END IF;
    SELECT COUNT(*) INTO v_sin FROM public.contab_asiento_lineas WHERE asiento_id = NEW.id AND cuenta_id IS NULL;
    SELECT COUNT(*) INTO v_malas FROM public.contab_asiento_lineas l
      JOIN public.contab_plan_cuentas c ON c.id = l.cuenta_id
      WHERE l.asiento_id = NEW.id AND (NOT c.imputable OR NOT c.activa);
    IF v_sin > 0 OR v_malas > 0 THEN RAISE EXCEPTION 'Hay líneas sin cuenta o con cuentas no imputables/inactivas'; END IF;
    NEW.total_debe := v_debe; NEW.total_haber := v_haber;
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_asiento_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_asientos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_asiento_guarda();

-- Guardia de líneas: solo se tocan mientras el asiento es borrador
CREATE OR REPLACE FUNCTION public.contab_trg_linea_guarda()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_estado text;
BEGIN
  SELECT estado INTO v_estado FROM public.contab_asientos
   WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.asiento_id ELSE NEW.asiento_id END;
  IF TG_OP = 'UPDATE' AND NEW.asiento_id <> OLD.asiento_id THEN
    RAISE EXCEPTION 'Una línea no puede cambiar de asiento';
  END IF;
  IF v_estado IS NOT NULL AND v_estado <> 'borrador' THEN
    RAISE EXCEPTION 'El asiento está confirmado: sus líneas no se modifican';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trg_contab_linea_guarda BEFORE INSERT OR UPDATE OR DELETE ON public.contab_asiento_lineas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_linea_guarda();

-- Períodos cerrados: no se cambia el estado de control salvo reapertura (función de 0B, solo admin)
CREATE OR REPLACE FUNCTION public.contab_trg_periodo_cierre()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.estado = 'cerrado' AND NEW.estado = 'abierto'
     AND (NEW.motivo_reapertura IS NULL OR NEW.reabierto_por IS NULL) THEN
    RAISE EXCEPTION 'Reabrir un período exige motivo y responsable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_periodo_cierre BEFORE UPDATE ON public.contab_periodos
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_periodo_cierre();
```

**Por qué no rompe lo existente**: las funciones actuales `contab_generar_asiento_cbte/pago` insertan asientos sin estado → quedan en borrador y siguen funcionando hasta que 0C las reemplace; sus líneas cargan solo debe o solo haber, compatible con la nueva regla. La numeración global (`numero`) se conserva; la correlativa por ejercicio se agrega.

**Datos iniciales (después de 0A, con la herramienta de datos, no en la migración)**: cargar `contab_cuentas_config` con los 7 códigos que hoy están fijos en las funciones (deudores 1.1.2.01, proveedores 2.1.1.01, iva_cf 1.1.4.01, iva_df 2.1.3.01, percepciones 1.1.4.02, ventas 4.1.1.01, compras 5.1.1.01, caja 1.1.1.01, banco 1.1.1.02). Ejercicio y períodos los crea el admin desde la pantalla en 0C.

**Objetos que crea/modifica 0A**: 3 tablas nuevas, 4 funciones de trigger nuevas, 5 triggers, 13 columnas en asientos, 3 en líneas, 7 restricciones, 5 índices, 1 FK recreada, 2 valores de rol. **Riesgos**: el cambio de FK y NOT NULL bloquea brevemente la tabla de líneas (vacía); ningún objeto operativo afectado.

## 5. Diseño de 0B (SQL definitivo se presenta antes de ejecutarla)

**INVOKER vs DEFINER**

| Función | Tipo | Motivo |
|---|---|---|
| `contab_puede(accion)` | DEFINER, STABLE | Lee `user_roles` sin depender de su RLS |
| Vistas de diario, mayor, balance, controles | `security_invoker` | Respetan la RLS de lectura de quien consulta |
| `contab_guardar_asiento_borrador`, `contab_confirmar_asiento`, `contab_revertir_asiento` | DEFINER | Asientos y líneas no tienen escritura directa para nadie |
| `contab_guardar_comprobante`, `contab_confirmar_comprobante`, `contab_anular_comprobante` | DEFINER | Generan asientos |
| `contab_registrar_pago`, `contab_revertir_pago` | DEFINER | Generan asientos y cambian saldos |
| `contab_abrir_ejercicio`, `contab_cerrar_periodo`, `contab_reabrir_periodo`, `contab_set_cuenta_config` | DEFINER | Tablas sin escritura directa |
| Funciones de trigger de guardia | INVOKER (sin privilegio propio) | Solo validan |
| Trigger de auditoría | DEFINER | Única vía de escritura de la auditoría |
| `contab_generar_asiento_cbte/pago` (viejas) | Se reemplazan por envoltorios que llaman a las nuevas | Compatibilidad |

**Reglas comunes de toda función DEFINER**: `SET search_path = public, pg_temp`; primera línea `IF NOT contab_puede('<acción>') THEN RAISE`; valida que el registro exista, su estado y su versión (`FOR UPDATE`); nombres de tablas calificados; `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated`. Las funciones de trigger y helpers internos sin EXECUTE para authenticated.

**RLS después de 0B**: lectura por `contab_puede('leer')`; asientos, líneas, auditoría, ejercicios, períodos y configuración sin INSERT/UPDATE/DELETE para usuarios; comprobantes e ítems: escritura directa solo si `estado = 'borrador'` y `contab_puede('registrar')`; pagos: solo vía función. Se quita al contador el permiso actual de editar/borrar asientos.

**Reversas**
- `contab_revertir_asiento(id, motivo, fecha)` bloquea el original (`FOR UPDATE`), exige `confirmado`, inserta contraasiento con líneas invertidas y `reversa_de`, lo confirma y marca el original `revertido`. El índice único sobre `reversa_de` impide una segunda reversa incluso en concurrencia.
- **Original en período cerrado**: el original no se toca (salvo su marca de control); el contraasiento se fecha en el **primer período abierto** (por defecto la fecha de hoy). No hace falta reabrir. Reabrir es una excepción solo admin, con motivo, auditada.
- Informes: muestran original y contraasiento cada uno en su fecha y período; el balance de un período cerrado no cambia por reversas posteriores.

**Comprobantes con pagos parciales**
- Anular una factura con pagos vigentes **se rechaza**. Opciones: (a) revertir primero los pagos (cada uno con su contraasiento; vuelve el saldo) y luego anular; (b) emitir nota de crédito por el saldo o por el total y aplicarla.
- Anular revierte el asiento del comprobante una sola vez (índice de reversa) y marca anulado en la misma transacción; una segunda anulación falla porque el estado ya es anulado.
- Corrección de importes en factura confirmada: solo por NC/ND, nunca editando.
- Saldo = total − pagos vigentes − NC aplicadas, recalculado dentro de la función con la factura bloqueada; nunca negativo.

**Auditoría**
- `contab_auditoria` sin triggers propios (no hay recursión). Trigger DEFINER en todas las `contab_*` y en `user_roles` (cambios de permisos; solo registra, no modifica su comportamiento).
- Eventos explícitos desde funciones: confirmación, reversa, anulación, cierre y reapertura, con motivo.
- Sin UPDATE/DELETE para nadie; lectura admin/contador.

## 6. 0C (resumen)

Pantalla Contabilidad llama solo a las funciones; Asientos con alta manual, confirmar y revertir; Libro diario, Mayor, Balance de comprobación y Controles con Excel; Configuración de ejercicios/períodos y cuentas por función. Ningún otro módulo.

## 7. Vuelta atrás por sub-fase

- **0A**: script inverso que quita triggers, funciones de guardia, índices, restricciones, columnas nuevas y tablas nuevas (vacías) y restaura la FK original. Los dos valores de rol quedan (sin uso, inocuos). Probado en el borrador.
- **0B**: script que restaura exactamente las políticas y funciones actuales (texto guardado hoy) y elimina las nuevas.
- **0C**: volver a la versión anterior del código desde el historial, **después** de ejecutar el inverso de 0B si se revierte también 0B.
- Antes de cada paso en producción: exportación completa de la base. Restaurar backup diario solo ante desastre, sabiendo que se pierde lo cargado después.

## 8. Pruebas

**En el borrador aislado, para 0A**
- Esquema: comparación de estructura de todas las tablas no contables antes/después (debe ser idéntica).
- Insertar asiento confirmado directo → falla. Confirmar descuadrado, sin cuenta, con cuenta no imputable, en período cerrado, con fecha fuera del período → falla.
- Línea con debe y haber, ambos cero o negativos → falla.
- Editar o borrar asiento/línea confirmados → falla. Marcar revertido sin contraasiento real → falla. Segunda reversa → falla por índice.
- Mismo origen y evento dos veces → falla; reversa + nuevo alta del mismo documento → permitido; dos ajustes con claves distintas → permitido.
- Ejercicios o períodos superpuestos → falla; reabrir sin motivo → falla; borrar cuenta con movimientos → falla.
- Funciones viejas siguen generando asientos borrador correctamente.

**Para 0B (además)**
- Con usuarios reales de cada rol (admin, contador, remitero, maquinista, sin rol) mediante sesiones autenticadas: llamar cada función directamente; los no autorizados reciben error y nada cambia.
- **Concurrencia real con dos conexiones independientes**: dos pagos simultáneos sobre la misma factura (no superan el saldo); dos reversas simultáneas (solo una prospera); dos confirmaciones simultáneas (numeración sin duplicados ni huecos).
- Factura con pagos parciales: anulación rechazada; revertir pagos y anular; NC parcial; saldos consistentes.
- Reversas en período abierto y con original en período cerrado.
- Auditoría completa y no borrable.
- Ejecutar el script inverso y volver a aplicar: mismo resultado.

**Para 0C**
- Ciclo completo en pantalla y diario/mayor/balance cuadrados; vista de controles vacía.
- Comparación de comportamiento de Remitos, Combustible, Obras/Rentabilidad, Partes, Stock y Mantenimiento antes y después (conteos, totales y capturas): sin diferencias.

## 9. Pendiente de tu revisión

- Aprobar el SQL de 0A tal como está, o indicar cambios.
- Confirmar que las pruebas se corren en un borrador aislado antes de producción.
- Confirmar la regla de anulación con pagos (rechazar y exigir revertir pagos o NC).
- Confirmar que el contraasiento de un período cerrado va al primer período abierto.
