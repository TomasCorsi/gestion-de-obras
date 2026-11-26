CREATE OR REPLACE FUNCTION public.contab_oc_revision(_cbte_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.contab_comprobantes; lineas jsonb; extras jsonb; v_firma jsonb; requiere boolean;
BEGIN
 IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 SELECT * INTO c FROM public.contab_comprobantes WHERE id=_cbte_id;
 IF c.orden_compra_id IS NULL THEN RETURN NULL; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s->>'id','descripcion',s->>'descripcion','unidad',s->>'unidad','cantidad_oc',(s->>'cantidad')::numeric,'precio_oc',(s->>'precio_unitario')::numeric,'otros',q.otros,'cantidad_factura',q.actual,'precio_distinto',q.precio_distinto) ORDER BY (s->>'orden')::int),'[]'::jsonb) INTO lineas
 FROM jsonb_array_elements(c.oc_snapshot->'items') s CROSS JOIN LATERAL (
  SELECT COALESCE(sum(i.cantidad) FILTER(WHERE p.id<>c.id),0) otros,COALESCE(sum(i.cantidad) FILTER(WHERE p.id=c.id),0) actual,COALESCE(bool_or(i.precio_unit<>(s->>'precio_unitario')::numeric) FILTER(WHERE p.id=c.id),false) precio_distinto
  FROM public.contab_comprobante_items i JOIN public.contab_comprobantes p ON p.id=i.comprobante_id WHERE p.orden_compra_id=c.orden_compra_id AND p.estado<>'anulado' AND i.oc_linea_id::text=s->>'id'
 ) q;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('descripcion',descripcion,'cantidad',cantidad,'precio',precio_unit) ORDER BY orden,id),'[]'::jsonb) INTO extras FROM public.contab_comprobante_items WHERE comprobante_id=c.id AND oc_linea_id IS NULL;
 requiere:=jsonb_array_length(extras)>0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(lineas) l WHERE (l->>'precio_distinto')::boolean OR (l->>'cantidad_factura')::numeric+(l->>'otros')::numeric>(l->>'cantidad_oc')::numeric);
 v_firma:=jsonb_build_object('lineas',lineas,'extras',extras,'cabecera',jsonb_build_object('tercero',c.tercero_id,'moneda',c.moneda,'cotizacion',c.cotizacion,'total',c.total),'items',(SELECT jsonb_agg(to_jsonb(i)-'created_at'-'updated_at' ORDER BY i.orden,i.id) FROM public.contab_comprobante_items i WHERE comprobante_id=c.id));
 RETURN jsonb_build_object('lineas',lineas,'extras',extras,'requiere_aprobacion',requiere,'aprobado',EXISTS(SELECT 1 FROM public.contab_oc_decisiones d WHERE d.comprobante_id=c.id AND d.accion='aprobar' AND d.firma=v_firma),'firma',v_firma,'cerrado',EXISTS(SELECT 1 FROM public.contab_oc_decisiones WHERE orden_compra_id=c.orden_compra_id AND accion='cerrar'));
END $$;