# Fase 1B — Centros y subcentros de costo (diseño para revisión, NO ejecutado)

Base: la misma de Lovable Cloud. Sin borrar datos. Sin tocar obras, maquinarias, stock, combustible, remitos ni la rentabilidad actual.

## Pendientes de la Fase 1A (antes de operar con contabilidad real)
1. Corregir los CUIT inválidos de los terceros que se usen (ej.: BRITCOM). La validación los rechaza al crear la ficha fiscal.
2. Implementar o validar el uso de la cuenta contable específica de cada cliente/proveedor (`cuenta_deudores_id` / `cuenta_proveedores_id`) en la generación de asientos. Hoy `contab_generar_asiento_cbte` todavía usa las cuentas genéricas de configuración.
3. Siguen pendientes: prueba con sesión real de contador, prueba de concurrencia, fechas del ejercicio fiscal y fecha de corte.

## Estado actual (verificado)
- No existe ninguna tabla de centros de costo.
- `contab_asiento_lineas` y `contab_comprobante_items` ya tienen `obra_id` y `maquinaria_id` sueltos. Se conservan como están (compatibilidad); la nueva imputación analítica queda en una tabla aparte.

## Modelo

```text
contab_centros_costo (6 iniciales, configurables)
   └── contab_subcentros_costo  (opcional: vinculado a 1 obra o 1 máquina, único)
contab_asiento_lineas
   └── contab_imputaciones_analiticas (N por línea: subcentro + obra y/o máquina + importe + ingreso/gasto)
```

- Centro: código único, nombre, tipo (obras, maquinarias, taller, administracion, deposito, generales, otro), activo, vigencia desde/hasta, orden.
- Subcentro: código único dentro del centro, nombre, vínculo opcional a una obra **o** a una máquina (nunca ambos), una obra/máquina solo puede tener un subcentro. Una obra solo va en centro tipo "obras"; una máquina en "maquinarias" o "taller".
- Imputación: cada importe se registra **una sola vez**; puede llevar a la vez obra y máquina (ej.: retro trabajando en Polo Ezeiza) como dimensiones del mismo importe, así no se duplica el costo. Naturaleza ingreso/gasto para el resultado por obra.
- Creación progresiva: no se generan 112 + 117 subcentros. Una vista lista obras y máquinas sin subcentro como **sugerencias**; el usuario decide crearlas con un botón.
- Desactivar, no borrar: si tiene imputaciones, el borrado se rechaza (FK RESTRICT + trigger con mensaje claro). No se puede imputar a un centro/subcentro inactivo o fuera de vigencia.
- Inmutable: las imputaciones de un asiento confirmado no se modifican (igual que sus líneas).
- La suma de imputaciones de una línea no puede superar el importe de la línea (control diferido al fin de la transacción). No es obligatorio imputar todas las líneas (IVA, bancos, etc.).
- Permisos: configurar centros/subcentros e imputar = admin y contador. Lectura = quienes ya pueden ver contabilidad (`contab_puede('ver')`). Ningún otro rol.

## SQL propuesto (migración `contab_1b_centros_costo`)

```sql
-- 1) Centros
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
  CONSTRAINT cc_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);
CREATE UNIQUE INDEX contab_centros_codigo_uq ON public.contab_centros_costo (codigo);

-- 2) Subcentros
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
  CONSTRAINT sc_un_vinculo CHECK (num_nonnulls(obra_id, maquinaria_id) <= 1),
  CONSTRAINT sc_vigencia CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),
  CONSTRAINT sc_codigo_uq UNIQUE (centro_id, codigo)
);
CREATE UNIQUE INDEX contab_subcentros_obra_uq ON public.contab_subcentros_costo (obra_id) WHERE obra_id IS NOT NULL;
CREATE UNIQUE INDEX contab_subcentros_maq_uq  ON public.contab_subcentros_costo (maquinaria_id) WHERE maquinaria_id IS NOT NULL;

-- 3) Imputaciones analíticas
CREATE TABLE public.contab_imputaciones_analiticas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_id uuid NOT NULL REFERENCES public.contab_asiento_lineas(id) ON DELETE CASCADE,
  subcentro_id uuid NOT NULL REFERENCES public.contab_subcentros_costo(id) ON DELETE RESTRICT,
  obra_id uuid REFERENCES public.obras(id) ON DELETE RESTRICT,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE RESTRICT,
  naturaleza text NOT NULL CHECK (naturaleza IN ('ingreso','gasto')),
  importe numeric(18,2) NOT NULL CHECK (importe > 0),
  nota text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contab_imput_linea_idx ON public.contab_imputaciones_analiticas (linea_id);
CREATE INDEX contab_imput_sub_idx   ON public.contab_imputaciones_analiticas (subcentro_id);
CREATE INDEX contab_imput_obra_idx  ON public.contab_imputaciones_analiticas (obra_id) WHERE obra_id IS NOT NULL;
CREATE INDEX contab_imput_maq_idx   ON public.contab_imputaciones_analiticas (maquinaria_id) WHERE maquinaria_id IS NOT NULL;

-- 4) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas TO authenticated;
GRANT ALL ON public.contab_centros_costo, public.contab_subcentros_costo,
  public.contab_imputaciones_analiticas TO service_role;

-- 5) Helper de permiso de configuración
CREATE OR REPLACE FUNCTION public.contab_puede_centros() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')
$$;

-- 6) Validaciones (triggers)
CREATE OR REPLACE FUNCTION public.contab_trg_subcentro_valida() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _tipo text;
BEGIN
  SELECT tipo INTO _tipo FROM contab_centros_costo WHERE id = NEW.centro_id;
  IF NEW.obra_id IS NOT NULL AND _tipo <> 'obras' THEN
    RAISE EXCEPTION 'Una obra solo puede vincularse a un centro de tipo Obras';
  END IF;
  IF NEW.maquinaria_id IS NOT NULL AND _tipo NOT IN ('maquinarias','taller') THEN
    RAISE EXCEPTION 'Una máquina solo puede vincularse a un centro de Maquinarias o Taller';
  END IF;
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM contab_imputaciones_analiticas WHERE subcentro_id = OLD.id)
     AND (NEW.centro_id IS DISTINCT FROM OLD.centro_id
       OR NEW.obra_id IS DISTINCT FROM OLD.obra_id
       OR NEW.maquinaria_id IS DISTINCT FROM OLD.maquinaria_id
       OR NEW.codigo IS DISTINCT FROM OLD.codigo) THEN
    RAISE EXCEPTION 'El subcentro tiene movimientos: solo se puede renombrar o desactivar';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER contab_subcentro_valida BEFORE INSERT OR UPDATE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_subcentro_valida();

CREATE OR REPLACE FUNCTION public.contab_trg_centro_guarda() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM contab_subcentros_costo WHERE centro_id = OLD.id) THEN
      RAISE EXCEPTION 'El centro tiene subcentros: desactivalo en lugar de eliminarlo';
    END IF;
    RETURN OLD;
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

CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_valida() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _r record; _fecha date; _estado text; _sub record;
BEGIN
  SELECT a.fecha, a.estado INTO _fecha, _estado
    FROM contab_asiento_lineas l JOIN contab_asientos a ON a.id = l.asiento_id
   WHERE l.id = COALESCE(NEW.linea_id, OLD.linea_id);
  IF _estado IS DISTINCT FROM 'borrador' THEN
    RAISE EXCEPTION 'Las imputaciones de un asiento no borrador no se pueden modificar';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  SELECT s.*, c.activo AS c_activo, c.vigente_desde AS c_desde, c.vigente_hasta AS c_hasta
    INTO _sub FROM contab_subcentros_costo s JOIN contab_centros_costo c ON c.id = s.centro_id
   WHERE s.id = NEW.subcentro_id;
  IF NOT (_sub.activo AND _sub.c_activo)
     OR _fecha < GREATEST(_sub.vigente_desde, _sub.c_desde)
     OR _fecha > LEAST(COALESCE(_sub.vigente_hasta,'infinity'), COALESCE(_sub.c_hasta,'infinity')) THEN
    RAISE EXCEPTION 'Centro o subcentro inactivo o fuera de vigencia para la fecha del asiento';
  END IF;
  -- Si el subcentro está vinculado, la dimensión debe coincidir (o se completa sola)
  IF _sub.obra_id IS NOT NULL THEN
    IF NEW.obra_id IS NOT NULL AND NEW.obra_id <> _sub.obra_id THEN
      RAISE EXCEPTION 'La obra no coincide con la obra del subcentro'; END IF;
    NEW.obra_id := _sub.obra_id;
  END IF;
  IF _sub.maquinaria_id IS NOT NULL THEN
    IF NEW.maquinaria_id IS NOT NULL AND NEW.maquinaria_id <> _sub.maquinaria_id THEN
      RAISE EXCEPTION 'La máquina no coincide con la máquina del subcentro'; END IF;
    NEW.maquinaria_id := _sub.maquinaria_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER contab_imputacion_valida BEFORE INSERT OR UPDATE OR DELETE ON public.contab_imputaciones_analiticas
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_valida();

-- Suma de imputaciones <= importe de la línea (al final de la transacción)
CREATE OR REPLACE FUNCTION public.contab_trg_imputacion_tope() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _tope numeric; _suma numeric;
BEGIN
  SELECT debe + haber INTO _tope FROM contab_asiento_lineas WHERE id = NEW.linea_id;
  SELECT COALESCE(sum(importe),0) INTO _suma FROM contab_imputaciones_analiticas WHERE linea_id = NEW.linea_id;
  IF _suma > _tope THEN
    RAISE EXCEPTION 'Las imputaciones (%) superan el importe de la línea (%)', _suma, _tope;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER contab_imputacion_tope AFTER INSERT OR UPDATE ON public.contab_imputaciones_analiticas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.contab_trg_imputacion_tope();

-- Auditoría (reutiliza la de 0B)
CREATE TRIGGER contab_auditar_centros AFTER INSERT OR UPDATE OR DELETE ON public.contab_centros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();
CREATE TRIGGER contab_auditar_subcentros AFTER INSERT OR UPDATE OR DELETE ON public.contab_subcentros_costo
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_auditar();

-- 7) RLS
ALTER TABLE public.contab_centros_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contab_subcentros_costo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contab_imputaciones_analiticas ENABLE ROW LEVEL SECURITY;
CREATE POLICY cc_select ON public.contab_centros_costo FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY cc_write  ON public.contab_centros_costo FOR ALL TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY sc_select ON public.contab_subcentros_costo FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY sc_write  ON public.contab_subcentros_costo FOR ALL TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());
CREATE POLICY ia_select ON public.contab_imputaciones_analiticas FOR SELECT TO authenticated USING (public.contab_puede('ver'));
CREATE POLICY ia_write  ON public.contab_imputaciones_analiticas FOR ALL TO authenticated
  USING (public.contab_puede_centros()) WITH CHECK (public.contab_puede_centros());

-- 8) Sugerencias (no crea nada): obras y máquinas sin subcentro
CREATE VIEW public.contab_subcentros_sugeridos WITH (security_invoker = true) AS
  SELECT 'obra'::text AS origen, o.id AS ref_id, o.nombre AS nombre, o.estado::text AS estado
    FROM public.obras o
   WHERE NOT EXISTS (SELECT 1 FROM public.contab_subcentros_costo s WHERE s.obra_id = o.id)
  UNION ALL
  SELECT 'maquina', m.id, COALESCE(m.codigo || ' - ', '') || m.nombre, m.estado::text
    FROM public.maquinarias m
   WHERE NOT EXISTS (SELECT 1 FROM public.contab_subcentros_costo s WHERE s.maquinaria_id = m.id);
GRANT SELECT ON public.contab_subcentros_sugeridos TO authenticated;
```

Los nombres exactos de columnas de `obras`/`maquinarias` usados en la vista se confirman antes de aplicar.

## Datos iniciales (después de la migración, como carga de datos, no como migración)

| Código | Nombre | Tipo |
|---|---|---|
| OBR | Obras | obras |
| MAQ | Maquinarias | maquinarias |
| TAL | Taller | taller |
| ADM | Administración | administracion |
| DEP | Depósito / Stock | deposito |
| GG | Gastos Generales | generales |

Se insertan con `ON CONFLICT (codigo) DO NOTHING`. Ningún subcentro automático.

## Pantalla (Contabilidad → Configuración → Centros de costo)
- Lista de centros con código, nombre, tipo, vigencia y estado; alta/edición/desactivar (sin botón borrar si tiene subcentros).
- Subcentros del centro elegido, con buscador de obra o máquina (patente/código) para vincular.
- Panel "Sugeridos": obras y máquinas sin subcentro, con botón "Crear subcentro" (código sugerido `OBR-<n>` / `MAQ-<código>` editable).
- En el detalle de un asiento en borrador: por línea, "Imputar" con varios renglones (subcentro, obra/máquina, ingreso/gasto, importe) y el saldo sin imputar.
- Solo visible para admin y contador. Rentabilidad actual sin cambios.

## Pruebas (transacciones que terminan en ROLLBACK, sin dejar datos)
1. Duplicados: mismo código de centro; misma obra en dos subcentros; misma máquina en dos subcentros → rechazado.
2. Asociaciones inválidas: obra en centro Taller; obra y máquina en el mismo subcentro; imputación con obra distinta a la del subcentro → rechazado.
3. Doble dimensión: imputación con subcentro de máquina + obra → un solo importe, suma por obra y por máquina sin duplicar.
4. Tope: dos imputaciones que superan la línea → rechazo al confirmar la transacción.
5. Desactivación: borrar centro/subcentro con movimientos → rechazado; desactivar → permitido; imputar a inactivo o fuera de vigencia → rechazado.
6. Inmutabilidad: modificar imputación de asiento confirmado → rechazado.
7. Permisos: admin y contador configuran; maquinista/remitero/capataz no leen ni escriben.
8. Compatibilidad: conteos de obras, máquinas, remitos, partes, combustible y resultados de rentabilidad idénticos antes y después; las columnas `obra_id`/`maquinaria_id` existentes de líneas e ítems siguen funcionando.
9. Tests de librería para el cálculo de saldo sin imputar y resumen por obra.

## Procedimiento de implementación (cuando lo apruebes)
1. Confirmar columnas de `obras` y `maquinarias` (solo lectura) y conteos base.
2. Aplicar la migración `contab_1b_centros_costo`.
3. Cargar los 6 centros iniciales.
4. Ejecutar las pruebas 1–8 con ROLLBACK y comparar conteos.
5. Construir la pantalla y el diálogo de imputación; tests y compilación.
6. Prueba en el navegador como admin (sin guardar datos de prueba).

## Script inverso (si hubiera que revertir, sin tocar datos operativos)
```sql
DROP VIEW IF EXISTS public.contab_subcentros_sugeridos;
DROP TABLE IF EXISTS public.contab_imputaciones_analiticas;
DROP TABLE IF EXISTS public.contab_subcentros_costo;
DROP TABLE IF EXISTS public.contab_centros_costo;
DROP FUNCTION IF EXISTS public.contab_trg_imputacion_tope(), public.contab_trg_imputacion_valida(),
  public.contab_trg_centro_guarda(), public.contab_trg_subcentro_valida(), public.contab_puede_centros();
```
