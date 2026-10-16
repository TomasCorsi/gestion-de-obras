CREATE TABLE public.remito_tipos_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.remito_tipos_material TO authenticated;
GRANT ALL ON public.remito_tipos_material TO service_role;

ALTER TABLE public.remito_tipos_material ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tipos material"
  ON public.remito_tipos_material FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert tipos material"
  ON public.remito_tipos_material FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete tipos material"
  ON public.remito_tipos_material FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
