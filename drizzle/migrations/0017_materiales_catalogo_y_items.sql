CREATE OR REPLACE FUNCTION public.normalizar_material(_t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          translate(lower(coalesce(_t,'')), 'áéíóúüñøØ', 'aeiouun  '),
          '(\d)\s*mm\b', '\1', 'g'),
        '[^a-z0-9,.]+', ' ', 'g'),
      '\m(del|de|nro|n)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;

CREATE TABLE public.materiales_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nombre_normalizado text NOT NULL,
  unidad_default text NOT NULL DEFAULT 'UN',
  categoria text,
  activo boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX materiales_catalogo_norm_uq ON public.materiales_catalogo(nombre_normalizado);

CREATE OR REPLACE FUNCTION public.set_material_normalizado() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.nombre := btrim(regexp_replace(NEW.nombre, '\s+', ' ', 'g'));
  NEW.nombre_normalizado := public.normalizar_material(NEW.nombre);
  IF NEW.nombre_normalizado = '' THEN RAISE EXCEPTION 'Nombre de material vacío'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_material_norm BEFORE INSERT OR UPDATE ON public.materiales_catalogo
FOR EACH ROW EXECUTE FUNCTION public.set_material_normalizado();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiales_catalogo TO authenticated;
GRANT ALL ON public.materiales_catalogo TO service_role;
ALTER TABLE public.materiales_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY mc_select ON public.materiales_catalogo FOR SELECT TO authenticated USING (true);
CREATE POLICY mc_insert ON public.materiales_catalogo FOR INSERT TO authenticated
  WITH CHECK (public.can_view_remitos((SELECT auth.uid())) AND created_by = (SELECT auth.uid()));
CREATE POLICY mc_update ON public.materiales_catalogo FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin')) WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));
CREATE POLICY mc_delete ON public.materiales_catalogo FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE TABLE public.remito_material_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remito_id uuid NOT NULL REFERENCES public.remitos_materiales(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiales_catalogo(id),
  cantidad numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'UN',
  precio_unitario numeric NOT NULL DEFAULT 0,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rmi_remito_idx ON public.remito_material_items(remito_id);
CREATE INDEX rmi_material_idx ON public.remito_material_items(material_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remito_material_items TO authenticated;
GRANT ALL ON public.remito_material_items TO service_role;
ALTER TABLE public.remito_material_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY rmi_all ON public.remito_material_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.remitos_materiales r WHERE r.id = remito_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.remitos_materiales r WHERE r.id = remito_id));

CREATE OR REPLACE FUNCTION public.unificar_materiales(_origen uuid, _destino uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Solo administradores'; END IF;
  IF _origen = _destino THEN RETURN; END IF;
  UPDATE public.remito_material_items SET material_id = _destino WHERE material_id = _origen;
  DELETE FROM public.materiales_catalogo WHERE id = _origen;
END $$;
REVOKE EXECUTE ON FUNCTION public.unificar_materiales(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unificar_materiales(uuid, uuid) TO authenticated;

COMMENT ON COLUMN public.remitos_materiales.material IS 'DEPRECATED: resumen; detalle en remito_material_items';
COMMENT ON COLUMN public.remitos_materiales.cantidad IS 'DEPRECATED: detalle en remito_material_items';
COMMENT ON COLUMN public.remitos_materiales.precio_unitario IS 'DEPRECATED: detalle en remito_material_items';