-- 1. Secreto interno para llamadas servidor-a-servidor a edge functions
INSERT INTO public.app_config (key, value)
VALUES ('edge_internal_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

-- 2. invoke_edge_function envía el secreto interno en header propio
CREATE OR REPLACE FUNCTION public.invoke_edge_function(_function_name text, _payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  v_base_url TEXT;
  v_anon_key TEXT;
  v_secret TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT value INTO v_base_url FROM public.app_config WHERE key = 'edge_functions_url';
  IF v_base_url IS NULL THEN
    RAISE WARNING 'edge_functions_url not configured';
    RETURN NULL;
  END IF;

  SELECT value INTO v_anon_key FROM public.app_config WHERE key = 'anon_key';
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'edge_internal_secret';

  SELECT net.http_post(
    url := v_base_url || '/' || _function_name,
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_anon_key, ''),
      'x-internal-secret', COALESCE(v_secret, '')
    )
  ) INTO v_request_id;

  RETURN v_request_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_edge_function failed: %', SQLERRM;
  RETURN NULL;
END;
$function$;

-- 3. app_config: solo admins pueden leerla (contiene configuración interna)
DROP POLICY IF EXISTS "Authenticated can read app_config" ON public.app_config;
CREATE POLICY "Admins can read app_config"
ON public.app_config FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. remito_tipos_material: lectura para usuarios autenticados, inserción validada
DROP POLICY IF EXISTS "Authenticated can read tipos material" ON public.remito_tipos_material;
CREATE POLICY "Authenticated can read tipos material"
ON public.remito_tipos_material FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert tipos material" ON public.remito_tipos_material;
CREATE POLICY "Authenticated can insert tipos material"
ON public.remito_tipos_material FOR INSERT TO authenticated
WITH CHECK (
  nombre IS NOT NULL
  AND char_length(trim(nombre)) BETWEEN 1 AND 60
  AND created_by = auth.uid()
);

-- 5. tablero_sesiones: lectura/actualización compartida, alta y borrado solo admin
DROP POLICY IF EXISTS "Autenticados gestionan sesiones de tablero" ON public.tablero_sesiones;

CREATE POLICY "Autenticados leen sesiones de tablero"
ON public.tablero_sesiones FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados actualizan sesiones de tablero"
ON public.tablero_sesiones FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins crean sesiones de tablero"
ON public.tablero_sesiones FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins borran sesiones de tablero"
ON public.tablero_sesiones FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. cotizacion_anticipos: solo admins (datos comerciales sensibles)
DROP POLICY IF EXISTS "Authenticated can manage cotizacion_anticipos" ON public.cotizacion_anticipos;
CREATE POLICY "Admins manage cotizacion_anticipos"
ON public.cotizacion_anticipos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. storage: lectura de adjuntos de mantenimiento limitada a roles operativos
DROP POLICY IF EXISTS "Authenticated users can view mantenimiento adjuntos" ON storage.objects;
CREATE POLICY "Authenticated users can view mantenimiento adjuntos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mantenimiento-adjuntos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'capataz')
    OR public.has_role(auth.uid(), 'maquinista')
    OR public.has_role(auth.uid(), 'ayudante')
    OR public.is_personal_mecanico(auth.uid())
  )
);

-- 8. link_personal_to_user: no se puede vincular a otro usuario ni reclamar un legajo admin
CREATE OR REPLACE FUNCTION public.link_personal_to_user(p_legajo text, p_user_id uuid)
 RETURNS TABLE(success boolean, personal_id uuid, rol rol_personal, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_personal_id uuid;
  v_rol public.rol_personal;
  v_existing_user_id uuid;
  v_app_role public.app_role;
  v_caller_is_admin boolean;
BEGIN
  v_caller_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);

  -- Solo un admin puede vincular el legajo a una cuenta distinta de la propia
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT v_caller_is_admin THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::public.rol_personal, 'No autorizado'::text;
    RETURN;
  END IF;

  SELECT p.id, p.rol, p.user_id
    INTO v_personal_id, v_rol, v_existing_user_id
    FROM public.personal p
   WHERE p.legajo = p_legajo
   LIMIT 1;

  IF v_personal_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::public.rol_personal, 'Legajo no encontrado'::text;
    RETURN;
  END IF;

  IF v_existing_user_id IS NOT NULL AND v_existing_user_id <> p_user_id THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::public.rol_personal, 'Este legajo ya tiene cuenta asociada'::text;
    RETURN;
  END IF;

  v_app_role := public.map_personal_rol_to_app_role(v_rol);

  -- Un legajo que otorga rol admin solo puede ser reclamado por un admin existente
  IF v_app_role = 'admin'::public.app_role AND NOT v_caller_is_admin THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::public.rol_personal, 'Este legajo requiere autorización de un administrador'::text;
    RETURN;
  END IF;

  UPDATE public.personal
     SET user_id = p_user_id
   WHERE id = v_personal_id;

  DELETE FROM public.user_roles
   WHERE user_id = p_user_id
     AND role IN ('admin'::public.app_role, 'capataz'::public.app_role, 'maquinista'::public.app_role, 'ayudante'::public.app_role)
     AND role <> v_app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN QUERY SELECT true, v_personal_id, v_rol, NULL::text;
END;
$function$;