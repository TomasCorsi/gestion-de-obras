CREATE TABLE public.remito_maquina_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 remito_id uuid NOT NULL REFERENCES public.remitos_maquinas(id) ON DELETE CASCADE,
 maquinaria_id uuid NOT NULL REFERENCES public.maquinarias(id),
 orden integer NOT NULL DEFAULT 0,
 unidad text NOT NULL DEFAULT 'DIA' CHECK (unidad IN ('DIA','HORA')),
 cantidad numeric NOT NULL DEFAULT 1 CHECK (cantidad > 0),
 precio_unitario numeric NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
 operador text,
 observaciones text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remito_maquina_items TO authenticated;
GRANT ALL ON public.remito_maquina_items TO service_role;
ALTER TABLE public.remito_maquina_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY items_select ON public.remito_maquina_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.remitos_maquinas r WHERE r.id=remito_id));
CREATE POLICY items_insert ON public.remito_maquina_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.remitos_maquinas r WHERE r.id=remito_id AND (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'capataz') OR r.created_by=(SELECT auth.uid()))));
CREATE POLICY items_update ON public.remito_maquina_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.remitos_maquinas r WHERE r.id=remito_id AND (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'capataz') OR r.created_by=(SELECT auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.remitos_maquinas r WHERE r.id=remito_id AND (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'capataz') OR r.created_by=(SELECT auth.uid()))));
CREATE POLICY items_delete ON public.remito_maquina_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.remitos_maquinas r WHERE r.id=remito_id AND (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'capataz') OR r.created_by=(SELECT auth.uid()))));
CREATE INDEX remito_maquina_items_remito_idx ON public.remito_maquina_items(remito_id,orden);
INSERT INTO public.remito_maquina_items(remito_id,maquinaria_id,unidad,cantidad,precio_unitario,operador) SELECT id,maquinaria_id,unidad,cantidad,precio_unitario,operador FROM public.remitos_maquinas WHERE maquinaria_id IS NOT NULL AND cantidad>0 AND precio_unitario>=0 AND unidad IN ('DIA','HORA');
COMMENT ON COLUMN public.remitos_maquinas.maquinaria_id IS 'DEPRECATED: machinery lines are stored in remito_maquina_items; retained as first-line compatibility mirror';
COMMENT ON COLUMN public.remitos_maquinas.unidad IS 'DEPRECATED: replaced by remito_maquina_items.unidad; first-line compatibility mirror';
COMMENT ON COLUMN public.remitos_maquinas.cantidad IS 'DEPRECATED: replaced by remito_maquina_items.cantidad; first-line compatibility mirror';
COMMENT ON COLUMN public.remitos_maquinas.precio_unitario IS 'DEPRECATED: replaced by remito_maquina_items.precio_unitario; first-line compatibility mirror';
COMMENT ON COLUMN public.remitos_maquinas.operador IS 'DEPRECATED: replaced by remito_maquina_items.operador; first-line compatibility mirror';
CREATE OR REPLACE FUNCTION public.guardar_remito_maquinas(p_cabecera jsonb,p_items jsonb,p_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_id uuid; v_first jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debés iniciar sesión'; END IF;
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Agregá al menos una máquina'; END IF;
 v_first := p_items->0;
 IF p_id IS NULL THEN
 INSERT INTO public.remitos_maquinas(fecha,numero_remito,obra_id,cliente_id,observaciones,created_by,maquinaria_id,unidad,cantidad,precio_unitario,operador)
 VALUES ((p_cabecera->>'fecha')::date,NULLIF(p_cabecera->>'numero_remito',''),NULLIF(p_cabecera->>'obra_id','')::uuid,NULLIF(p_cabecera->>'cliente_id','')::uuid,NULLIF(p_cabecera->>'observaciones',''),auth.uid(),(v_first->>'maquinaria_id')::uuid,v_first->>'unidad',(v_first->>'cantidad')::numeric,(v_first->>'precio_unitario')::numeric,NULLIF(v_first->>'operador','')) RETURNING id INTO v_id;
 ELSE
 UPDATE public.remitos_maquinas SET fecha=(p_cabecera->>'fecha')::date,numero_remito=NULLIF(p_cabecera->>'numero_remito',''),obra_id=NULLIF(p_cabecera->>'obra_id','')::uuid,cliente_id=NULLIF(p_cabecera->>'cliente_id','')::uuid,observaciones=NULLIF(p_cabecera->>'observaciones',''),maquinaria_id=(v_first->>'maquinaria_id')::uuid,unidad=v_first->>'unidad',cantidad=(v_first->>'cantidad')::numeric,precio_unitario=(v_first->>'precio_unitario')::numeric,operador=NULLIF(v_first->>'operador',''),updated_at=now() WHERE id=p_id RETURNING id INTO v_id;
 IF v_id IS NULL THEN RAISE EXCEPTION 'No se pudo editar el remito'; END IF;
 DELETE FROM public.remito_maquina_items WHERE remito_id=v_id;
 END IF;
 INSERT INTO public.remito_maquina_items(remito_id,maquinaria_id,orden,unidad,cantidad,precio_unitario,operador,observaciones)
 SELECT v_id,(item->>'maquinaria_id')::uuid,(ordinality-1)::integer,item->>'unidad',(item->>'cantidad')::numeric,(item->>'precio_unitario')::numeric,NULLIF(item->>'operador',''),NULLIF(item->>'observaciones','') FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(item,ordinality);
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.guardar_remito_maquinas(jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guardar_remito_maquinas(jsonb,jsonb,uuid) TO authenticated,service_role;