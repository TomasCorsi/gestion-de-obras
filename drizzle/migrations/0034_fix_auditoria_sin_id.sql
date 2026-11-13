CREATE OR REPLACE FUNCTION public.contab_trg_auditar()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE _r jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
  INSERT INTO public.contab_auditoria (tabla, registro_id, accion, antes, despues, usuario)
  VALUES (TG_TABLE_NAME,
          NULLIF(COALESCE(_r->>'id', _r->>'cuenta_id'), '')::uuid,
          TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
          auth.uid());
  RETURN COALESCE(NEW, OLD);
END $function$;