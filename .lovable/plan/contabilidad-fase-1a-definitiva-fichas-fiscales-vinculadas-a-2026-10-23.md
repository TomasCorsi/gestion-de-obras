# Contabilidad – Fase 1A definitiva: fichas fiscales vinculadas a clientes y proveedores

Solo para revisar: no se ejecuta nada hasta tu autorización. Base única actual, sin datos de CONTAD. 1B, 1C y 1D no se implementan.

## Hallazgos que cambian el diseño (verificados en la base)
- **El contador hoy no puede ver clientes ni proveedores.** Solo los ven admin y capataz (para gestionar), y maquinista y remitero (solo lectura). Sin un permiso de lectura para el contador, la vista de estado le aparecería vacía. Se agrega **solo lectura para contador** en esas dos tablas; los usuarios operativos no cambian.
- Las fichas fiscales tienen hoy copia propia de nombre, domicilio, teléfono, email, banco y CBU. Hay 0 fichas cargadas, así que se puede corregir sin migrar datos.
- Clientes: 64 (59 sin CUIT). Proveedores: 44 (25 sin CUIT). No hay CUIT repetidos.
- Los comprobantes no guardan los datos fiscales del momento: solo el vínculo a la ficha.

## Decisiones
1. **Sin duplicación.** Nombre comercial, domicilio de contacto, teléfono y email se leen siempre del cliente o proveedor. La ficha guarda solo datos tributarios: razón social legal, tipo y número de identificación, condición ante IVA, IIBB, Ganancias, exenciones, domicilio fiscal, banco y CBU, y plazo. Las columnas de teléfono, email y localidad de la ficha quedan marcadas como **en desuso**: no se borran, pero la app deja de usarlas.
2. **Foto histórica por comprobante.** Al registrar un comprobante se guardan razón social, identificación, condición ante IVA y domicilio fiscal vigentes en ese momento. Mientras el comprobante esté en borrador, la foto se actualiza; una vez que tiene asiento ya no se puede modificar, por la regla que ya existe.
3. **Identificación.** Tipos: CUIT, CUIL, CDI, DNI, Pasaporte, Extranjero y Sin identificar. CUIT, CUIL y CDI se validan con prefijo y dígito verificador; DNI con 7 u 8 dígitos. No puede haber dos fichas con el mismo tipo y número. **Nunca se fusiona nada automáticamente**: ante un duplicado, el sistema avisa y sugiere vincular a mano.
4. **Cuentas separadas.** Cada ficha tiene una cuenta de deudores (cliente) y otra de proveedores, por separado. No hay compensación automática de saldos. En 1A solo se guardan: las funciones de generación de asientos de la Fase 0 **no cambian** y siguen usando las cuentas configuradas. Su uso se incorpora en un paso posterior, con tu aprobación.
5. **Experiencia de carga.** En ventas se elige un cliente existente y en compras un proveedor. Si no tiene ficha, aparece una ventana chica dentro del mismo formulario, con razón social precargada, tipo y número de identificación, y condición ante IVA. Al guardar, la ficha queda creada y elegida, sin salir del comprobante.

## Procedimiento de ejecución

### Paso 0 – verificaciones previas (solo lectura)
- Conteos de clientes, proveedores, obras, máquinas, partes, remitos, combustible, personal, certificados y stock. Tienen que dar idénticos al final.
- Confirmar 0 fichas, 0 comprobantes y 0 pagos contables.
- Confirmar que no existen objetos con los nombres nuevos.
- Copia del texto de las políticas actuales de clientes y proveedores, para poder restaurarlas.
- Prueba de la función de CUIT con casos conocidos, en un bloque que se deshace al final.

### Paso 1 – migración 1A (una sola, todo o nada)
SQL completo en la sección técnica.

### Paso 2 – verificaciones posteriores (solo lectura)
Columnas, restricciones, índices, triggers, funciones, permisos y políticas esperados; conteos operativos idénticos.

### Paso 3 – pruebas que siempre se deshacen al final
- Crear una ficha desde un cliente.
- Crear desde un proveedor con el mismo CUIT: rechazada, con sugerencia de vincular.
- Vincular: la ficha pasa a "ambos" y conserva sus dos cuentas separadas.
- CUIT con dígito inválido, con prefijo inválido y DNI de 6 dígitos: rechazados.
- Duplicado de tipo y número: rechazado.
- Desvincular una ficha con comprobantes: rechazado.
- Foto histórica: se completa al crear un comprobante; con el comprobante ya contabilizado, cambiar la ficha no altera la foto.
- Permisos por rol:
  - Contador: ve la vista completa y crea fichas.
  - Maquinista: no ve fichas y la vista le aparece vacía.
  - Contador: no puede editar clientes.
- Funciones de la Fase 0 sin cambios: circuito venta → asiento → confirmación → cobro.

### Paso 4 – aplicación
Hooks, pestaña Terceros, selector con creación rápida de ficha dentro del comprobante. Se verifica en pantalla con sesión de administrador.

### Recuperación
- Si la migración falla, se deshace sola y no queda nada aplicado.
- Vuelta atrás manual, en una sola operación: aborta si hay alguna ficha vinculada o algún comprobante con foto. Si no, quita lo agregado y restaura las políticas originales. Solo se ejecuta con tu aprobación.
- Último recurso: la copia diaria automática de la base.

## Detalles técnicos

### SQL de la migración 1A

```sql
-- 1. Validación de identificación (inmutable, usable en CHECK)
CREATE FUNCTION public.contab_cuit_valido(_n text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE w int[] := ARRAY[5,4,3,2,7,6,5,4,3,2]; s int := 0; r int; i int;
BEGIN
  IF _n IS NULL OR _n !~ '^\d{11}$' THEN RETURN false; END IF;
  IF left(_n,2) NOT IN ('20','23','24','25','26','27','30','33','34','50','51','55') THEN RETURN false; END IF;
  FOR i IN 1..10 LOOP s := s + substr(_n,i,1)::int * w[i]; END LOOP;
  r := 11 - (s % 11);
  IF r = 11 THEN r := 0; ELSIF r = 10 THEN RETURN false; END IF;
  RETURN r = substr(_n,11,1)::int;
END $$;

CREATE FUNCTION public.contab_doc_valido(_tipo text, _n text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN _tipo IN ('CUIT','CUIL','CDI') THEN public.contab_cuit_valido(_n)
    WHEN _tipo = 'DNI' THEN _n ~ '^\d{7,8}$'
    WHEN _tipo IN ('PASAPORTE','EXTRANJERO') THEN _n ~ '^[A-Z0-9]{5,20}$'
    WHEN _tipo = 'SIN' THEN _n IS NULL
    ELSE false END
$$;

-- 2. Ficha fiscal: vínculos, identificación, datos tributarios, cuentas separadas
ALTER TABLE public.contab_terceros
  ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE RESTRICT,
  ADD COLUMN proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  ADD COLUMN doc_tipo text NOT NULL DEFAULT 'CUIT',
  ADD COLUMN doc_numero text GENERATED ALWAYS AS (NULLIF(upper(regexp_replace(COALESCE(cuit,''),'[^A-Za-z0-9]','','g')),'')) STORED,
  ADD COLUMN domicilio_fiscal text,
  ADD COLUMN iibb_condicion text,
  ADD COLUMN iibb_numero text,
  ADD COLUMN iibb_jurisdiccion text,
  ADD COLUMN ganancias_regimen text,
  ADD COLUMN exencion_detalle text,
  ADD COLUMN exencion_vigencia_hasta date,
  ADD COLUMN cbu_alias text,
  ADD COLUMN plazo_pago_dias integer,
  ADD COLUMN cuenta_deudores_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT,
  ADD COLUMN cuenta_proveedores_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_terc_doc_tipo CHECK (doc_tipo IN ('CUIT','CUIL','CDI','DNI','PASAPORTE','EXTRANJERO','SIN')),
  ADD CONSTRAINT chk_terc_doc_valido CHECK (public.contab_doc_valido(doc_tipo, doc_numero)),
  ADD CONSTRAINT chk_terc_vinculo CHECK (cliente_id IS NOT NULL OR proveedor_id IS NOT NULL),
  ADD CONSTRAINT chk_terc_iibb CHECK (iibb_condicion IS NULL OR iibb_condicion IN ('local','convenio','exento','no_inscripto')),
  ADD CONSTRAINT chk_terc_plazo CHECK (plazo_pago_dias IS NULL OR plazo_pago_dias BETWEEN 0 AND 365);

CREATE UNIQUE INDEX uq_contab_terc_cliente   ON public.contab_terceros (cliente_id)   WHERE cliente_id IS NOT NULL;
CREATE UNIQUE INDEX uq_contab_terc_proveedor ON public.contab_terceros (proveedor_id) WHERE proveedor_id IS NOT NULL;
CREATE UNIQUE INDEX uq_contab_terc_doc       ON public.contab_terceros (doc_tipo, doc_numero) WHERE doc_numero IS NOT NULL;

COMMENT ON COLUMN public.contab_terceros.telefono  IS 'DEPRECATED: se lee del cliente/proveedor vinculado';
COMMENT ON COLUMN public.contab_terceros.email     IS 'DEPRECATED: se lee del cliente/proveedor vinculado';
COMMENT ON COLUMN public.contab_terceros.localidad IS 'DEPRECATED: se lee del cliente/proveedor vinculado';
COMMENT ON COLUMN public.contab_terceros.domicilio IS 'DEPRECATED: reemplazado por domicilio_fiscal';
COMMENT ON COLUMN public.contab_terceros.cbu IS 'CBU para pagos; cbu_alias complementa';

-- 3. Coherencia de tipo y protección de vínculos
CREATE FUNCTION public.contab_trg_tercero_valida()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.tipo := CASE
    WHEN NEW.cliente_id IS NOT NULL AND NEW.proveedor_id IS NOT NULL THEN 'ambos'
    WHEN NEW.cliente_id IS NOT NULL THEN 'cliente' ELSE 'proveedor' END::public.contab_tercero_tipo;
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.cliente_id IS NOT NULL AND NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
          AND EXISTS (SELECT 1 FROM public.contab_comprobantes WHERE tercero_id = OLD.id AND es_venta))
    OR (OLD.proveedor_id IS NOT NULL AND NEW.proveedor_id IS DISTINCT FROM OLD.proveedor_id
          AND EXISTS (SELECT 1 FROM public.contab_comprobantes WHERE tercero_id = OLD.id AND NOT es_venta)) THEN
      RAISE EXCEPTION 'La ficha tiene comprobantes: no se puede cambiar ni quitar ese vínculo';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_tercero_valida BEFORE INSERT OR UPDATE ON public.contab_terceros
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_tercero_valida();

CREATE FUNCTION public.contab_trg_tercero_borrar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contab_comprobantes WHERE tercero_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.contab_pagos WHERE tercero_id = OLD.id) THEN
    RAISE EXCEPTION 'La ficha tiene movimientos: desactivala en lugar de borrarla';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_contab_tercero_borrar BEFORE DELETE ON public.contab_terceros
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_tercero_borrar();

-- 4. Foto fiscal histórica en el comprobante
ALTER TABLE public.contab_comprobantes
  ADD COLUMN fiscal_razon_social text,
  ADD COLUMN fiscal_doc_tipo text,
  ADD COLUMN fiscal_doc_numero text,
  ADD COLUMN fiscal_condicion_iva public.contab_cond_iva,
  ADD COLUMN fiscal_domicilio text;

CREATE FUNCTION public.contab_trg_cbte_foto_fiscal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE t public.contab_terceros%ROWTYPE;
BEGIN
  IF NEW.asiento_id IS NOT NULL AND TG_OP = 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.tercero_id IS NULL THEN
    NEW.fiscal_razon_social := NULL; NEW.fiscal_doc_tipo := NULL; NEW.fiscal_doc_numero := NULL;
    NEW.fiscal_condicion_iva := NULL; NEW.fiscal_domicilio := NULL;
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM public.contab_terceros WHERE id = NEW.tercero_id;
  NEW.fiscal_razon_social := t.razon_social; NEW.fiscal_doc_tipo := t.doc_tipo;
  NEW.fiscal_doc_numero := t.doc_numero; NEW.fiscal_condicion_iva := t.condicion_iva;
  NEW.fiscal_domicilio := COALESCE(t.domicilio_fiscal, t.domicilio);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_contab_cbte_foto_fiscal BEFORE INSERT OR UPDATE OF tercero_id, estado ON public.contab_comprobantes
  FOR EACH ROW EXECUTE FUNCTION public.contab_trg_cbte_foto_fiscal();

REVOKE ALL ON FUNCTION public.contab_trg_tercero_valida(), public.contab_trg_tercero_borrar(),
  public.contab_trg_cbte_foto_fiscal() FROM PUBLIC, anon, authenticated;

-- 5. Lectura de maestros para contador (solo SELECT; operativos sin cambios)
CREATE POLICY "Contadores pueden ver clientes" ON public.clientes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'contador'));
CREATE POLICY "Contadores pueden ver proveedores" ON public.proveedores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'contador'));

-- 6. Vista de estado (respeta RLS de quien consulta)
CREATE VIEW public.contab_terceros_estado WITH (security_invoker = true) AS
SELECT 'cliente'::text AS rol, c.id AS maestro_id, c.nombre, c.cuit AS cuit_maestro,
       c.direccion, c.localidad, c.telefono, c.email, c.activo,
       t.id AS tercero_id, t.razon_social, t.doc_tipo, t.doc_numero, t.condicion_iva, t.tipo,
       (SELECT t2.id FROM public.contab_terceros t2
         WHERE t.id IS NULL AND t2.doc_numero IS NOT NULL
           AND t2.doc_numero = NULLIF(regexp_replace(COALESCE(c.cuit,''),'\D','','g'),'')
         LIMIT 1) AS sugerencia_tercero_id
  FROM public.clientes c LEFT JOIN public.contab_terceros t ON t.cliente_id = c.id
 WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador')
UNION ALL
SELECT 'proveedor', p.id, p.nombre, p.cuit, p.direccion, p.localidad, p.telefono, p.email, p.activo,
       t.id, t.razon_social, t.doc_tipo, t.doc_numero, t.condicion_iva, t.tipo,
       (SELECT t2.id FROM public.contab_terceros t2
         WHERE t.id IS NULL AND t2.doc_numero IS NOT NULL
           AND t2.doc_numero = NULLIF(regexp_replace(COALESCE(p.cuit,''),'\D','','g'),'')
         LIMIT 1)
  FROM public.proveedores p LEFT JOIN public.contab_terceros t ON t.proveedor_id = p.id
 WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contador');
GRANT SELECT ON public.contab_terceros_estado TO authenticated;

-- 7. Funciones autorizadas
CREATE FUNCTION public.contab_ficha_desde_maestro(
  _cliente_id uuid, _proveedor_id uuid, _razon_social text, _doc_tipo text, _doc_numero text,
  _condicion_iva public.contab_cond_iva)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_norm text; v_otro uuid;
BEGIN
  IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF (_cliente_id IS NULL) = (_proveedor_id IS NULL) THEN RAISE EXCEPTION 'Indicá un cliente o un proveedor'; END IF;
  SELECT id INTO v_id FROM public.contab_terceros
   WHERE (cliente_id = _cliente_id) OR (proveedor_id = _proveedor_id);
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  v_norm := NULLIF(upper(regexp_replace(COALESCE(_doc_numero,''),'[^A-Za-z0-9]','','g')),'');
  IF NOT public.contab_doc_valido(_doc_tipo, v_norm) THEN RAISE EXCEPTION 'Identificación inválida para el tipo %', _doc_tipo; END IF;
  SELECT id INTO v_otro FROM public.contab_terceros WHERE doc_tipo = _doc_tipo AND doc_numero = v_norm;
  IF v_otro IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe una ficha con ese % (%). Vinculala en lugar de crear otra.', _doc_tipo, v_otro;
  END IF;
  INSERT INTO public.contab_terceros (cliente_id, proveedor_id, razon_social, doc_tipo, cuit, condicion_iva)
  VALUES (_cliente_id, _proveedor_id,
          COALESCE(NULLIF(btrim(_razon_social),''),
                   (SELECT nombre FROM public.clientes WHERE id = _cliente_id),
                   (SELECT nombre FROM public.proveedores WHERE id = _proveedor_id)),
          _doc_tipo, v_norm, _condicion_iva)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE FUNCTION public.contab_vincular_ficha(_tercero_id uuid, _cliente_id uuid, _proveedor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF (_cliente_id IS NULL) = (_proveedor_id IS NULL) THEN RAISE EXCEPTION 'Indicá un cliente o un proveedor'; END IF;
  UPDATE public.contab_terceros
     SET cliente_id = COALESCE(_cliente_id, cliente_id), proveedor_id = COALESCE(_proveedor_id, proveedor_id)
   WHERE id = _tercero_id
     AND ((_cliente_id IS NOT NULL AND cliente_id IS NULL) OR (_proveedor_id IS NOT NULL AND proveedor_id IS NULL));
  IF NOT FOUND THEN RAISE EXCEPTION 'La ficha no existe o ya tiene ese vínculo'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.contab_ficha_desde_maestro(uuid,uuid,text,text,text,public.contab_cond_iva),
  public.contab_vincular_ficha(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contab_ficha_desde_maestro(uuid,uuid,text,text,text,public.contab_cond_iva),
  public.contab_vincular_ficha(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contab_cuit_valido(text), public.contab_doc_valido(text,text) TO authenticated;
```

Notas técnicas:
- La columna `cuit` existente pasa a guardar el número de cualquier tipo de identificación; `doc_numero` es su versión normalizada.
- La ficha exige al menos un vínculo con cliente o proveedor. Como hoy no hay fichas, esa regla no rompe nada.
- La foto fiscal se actualiza solo mientras el comprobante no tiene asiento. Después, el bloqueo de documentos con asiento de la Fase 0 impide cualquier cambio.
- `contab_puede('ver')` significa admin o contador. No se agregan acciones nuevas.
- Las funciones de la Fase 0 (generar, confirmar, revertir, descartar, anular, cerrar y reabrir, asiento manual) no se modifican.

### Vuelta atrás manual (solo con tu aprobación)
```sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.contab_terceros) OR EXISTS (SELECT 1 FROM public.contab_comprobantes WHERE fiscal_razon_social IS NOT NULL) THEN
    RAISE EXCEPTION 'Vuelta atrás abortada: hay fichas o comprobantes con datos fiscales';
  END IF; END $$;
DROP FUNCTION public.contab_vincular_ficha(uuid,uuid,uuid), public.contab_ficha_desde_maestro(uuid,uuid,text,text,text,public.contab_cond_iva);
DROP VIEW public.contab_terceros_estado;
DROP POLICY "Contadores pueden ver clientes" ON public.clientes;
DROP POLICY "Contadores pueden ver proveedores" ON public.proveedores;
DROP TRIGGER trg_contab_cbte_foto_fiscal ON public.contab_comprobantes;
DROP TRIGGER trg_contab_tercero_borrar ON public.contab_terceros;
DROP TRIGGER trg_contab_tercero_valida ON public.contab_terceros;
DROP FUNCTION public.contab_trg_cbte_foto_fiscal(), public.contab_trg_tercero_borrar(), public.contab_trg_tercero_valida();
ALTER TABLE public.contab_comprobantes DROP COLUMN fiscal_razon_social, DROP COLUMN fiscal_doc_tipo,
  DROP COLUMN fiscal_doc_numero, DROP COLUMN fiscal_condicion_iva, DROP COLUMN fiscal_domicilio;
ALTER TABLE public.contab_terceros DROP CONSTRAINT chk_terc_doc_valido, DROP CONSTRAINT chk_terc_doc_tipo,
  DROP CONSTRAINT chk_terc_vinculo, DROP CONSTRAINT chk_terc_iibb, DROP CONSTRAINT chk_terc_plazo,
  DROP COLUMN cliente_id, DROP COLUMN proveedor_id, DROP COLUMN doc_numero, DROP COLUMN doc_tipo,
  DROP COLUMN domicilio_fiscal, DROP COLUMN iibb_condicion, DROP COLUMN iibb_numero, DROP COLUMN iibb_jurisdiccion,
  DROP COLUMN ganancias_regimen, DROP COLUMN exencion_detalle, DROP COLUMN exencion_vigencia_hasta,
  DROP COLUMN cbu_alias, DROP COLUMN plazo_pago_dias, DROP COLUMN cuenta_deudores_id, DROP COLUMN cuenta_proveedores_id;
DROP FUNCTION public.contab_doc_valido(text,text), public.contab_cuit_valido(text);
```
Este script borra estructura, así que requiere habilitar los cambios no compatibles en las preferencias del agente. Si hay que usarlo, se te avisa antes.

### Aplicación (después de aplicar la migración)
- `useTercerosEstado` lee la vista; las mutaciones usan `contab_ficha_desde_maestro` y `contab_vincular_ficha`.
- Pestaña "Terceros": filtros con/sin ficha, cliente/proveedor y sugerencia por CUIT; botones "Crear ficha" y "Vincular".
- En el comprobante, el selector lista clientes (venta) o proveedores (compra); si falta la ficha, se abre una ventana de creación rápida sin perder lo cargado.
- Edición de datos fiscales de la ficha en un diálogo, con las dos cuentas por separado.

## Pendientes heredados
Concurrencia real con dos sesiones, ingreso con una sesión real de contador, fechas del ejercicio y fecha de corte del ERP.
