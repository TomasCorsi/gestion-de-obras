ALTER TABLE public.remitos ADD COLUMN IF NOT EXISTS liquidado boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS liquidado_at timestamptz, ADD COLUMN IF NOT EXISTS liquidado_by uuid;
ALTER TABLE public.remitos_materiales ADD COLUMN IF NOT EXISTS liquidado boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS liquidado_at timestamptz, ADD COLUMN IF NOT EXISTS liquidado_by uuid, ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE public.remitos_maquinas ADD COLUMN IF NOT EXISTS liquidado boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS liquidado_at timestamptz, ADD COLUMN IF NOT EXISTS liquidado_by uuid, ADD COLUMN IF NOT EXISTS foto_url text;

CREATE OR REPLACE FUNCTION public.marcar_remitos_liquidados(_tipo text, _ids uuid[], _valor boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_view_remitos(auth.uid()) THEN RAISE EXCEPTION 'Sin permiso para remitos'; END IF;
  IF NOT _valor AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Solo un administrador puede desmarcar remitos liquidados'; END IF;
  IF _tipo = 'viajes' THEN
    UPDATE public.remitos SET liquidado=_valor, liquidado_at=CASE WHEN _valor THEN now() END, liquidado_by=CASE WHEN _valor THEN auth.uid() END WHERE id = ANY(_ids);
  ELSIF _tipo = 'materiales' THEN
    UPDATE public.remitos_materiales SET liquidado=_valor, liquidado_at=CASE WHEN _valor THEN now() END, liquidado_by=CASE WHEN _valor THEN auth.uid() END WHERE id = ANY(_ids);
  ELSIF _tipo = 'maquinas' THEN
    UPDATE public.remitos_maquinas SET liquidado=_valor, liquidado_at=CASE WHEN _valor THEN now() END, liquidado_by=CASE WHEN _valor THEN auth.uid() END WHERE id = ANY(_ids);
  ELSE RAISE EXCEPTION 'Tipo inválido'; END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.marcar_remitos_liquidados(text, uuid[], boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.marcar_remitos_liquidados(text, uuid[], boolean) TO authenticated;

CREATE POLICY "remitos fotos leer" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='remitos-fotos' AND public.can_view_remitos(auth.uid()));
CREATE POLICY "remitos fotos subir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='remitos-fotos' AND public.can_view_remitos(auth.uid()));
CREATE POLICY "remitos fotos borrar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='remitos-fotos' AND public.has_role(auth.uid(),'admin'));