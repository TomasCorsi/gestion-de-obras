CREATE TABLE public.remito_sectores_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX remito_sectores_obra_uniq ON public.remito_sectores_obra (obra_id, lower(trim(nombre)));
GRANT SELECT, INSERT, DELETE ON public.remito_sectores_obra TO authenticated;
GRANT ALL ON public.remito_sectores_obra TO service_role;
ALTER TABLE public.remito_sectores_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read sectores obra" ON public.remito_sectores_obra FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert sectores obra" ON public.remito_sectores_obra FOR INSERT TO authenticated WITH CHECK (char_length(trim(nombre)) BETWEEN 1 AND 60 AND created_by = auth.uid());
CREATE POLICY "Admins can delete sectores obra" ON public.remito_sectores_obra FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
ALTER TABLE public.remitos ADD COLUMN sector_obra text;
ALTER TABLE public.remitos_materiales ADD COLUMN sector_obra text;