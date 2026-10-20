CREATE TABLE public.remitos_materiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  numero_remito text,
  movimiento text NOT NULL DEFAULT 'ingreso_proveedor',
  proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
  obra_origen_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  obra_destino_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  material text NOT NULL,
  cantidad numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'UN',
  precio_unitario numeric NOT NULL DEFAULT 0,
  observaciones text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.remitos_maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  numero_remito text,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES public.maquinarias(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  unidad text NOT NULL DEFAULT 'DIA',
  cantidad numeric NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  operador text,
  observaciones text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remitos_materiales TO authenticated;
GRANT ALL ON public.remitos_materiales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remitos_maquinas TO authenticated;
GRANT ALL ON public.remitos_maquinas TO service_role;
ALTER TABLE public.remitos_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remitos_maquinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rm_select" ON public.remitos_materiales FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()));
CREATE POLICY "rm_insert" ON public.remitos_materiales FOR INSERT TO authenticated
  WITH CHECK (public.can_view_remitos((select auth.uid())) AND created_by = (select auth.uid()));
CREATE POLICY "rm_update" ON public.remitos_materiales FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()));
CREATE POLICY "rm_delete" ON public.remitos_materiales FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()));

CREATE POLICY "rq_select" ON public.remitos_maquinas FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()));
CREATE POLICY "rq_insert" ON public.remitos_maquinas FOR INSERT TO authenticated
  WITH CHECK (public.can_view_remitos((select auth.uid())) AND created_by = (select auth.uid()));
CREATE POLICY "rq_update" ON public.remitos_maquinas FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()))
  WITH CHECK (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()));
CREATE POLICY "rq_delete" ON public.remitos_maquinas FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'capataz') OR created_by = (select auth.uid()));

CREATE TRIGGER trg_rm_updated BEFORE UPDATE ON public.remitos_materiales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rq_updated BEFORE UPDATE ON public.remitos_maquinas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();