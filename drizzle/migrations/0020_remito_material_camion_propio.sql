ALTER TABLE public.remitos_materiales
  ADD COLUMN IF NOT EXISTS transporte text NOT NULL DEFAULT 'proveedor' CHECK (transporte IN ('proveedor','propio')),
  ADD COLUMN IF NOT EXISTS camion_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chofer_id uuid REFERENCES public.personal(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cantidad_viajes integer;
ALTER TABLE public.remitos
  ADD COLUMN IF NOT EXISTS remito_material_id uuid REFERENCES public.remitos_materiales(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS remitos_remito_material_id_idx ON public.remitos(remito_material_id);