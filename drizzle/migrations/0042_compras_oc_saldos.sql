CREATE FUNCTION public.contab_oc_saldos(_oc_id uuid,_excluir uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.contab_puede('ver') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 RETURN jsonb_build_object('cerrado',EXISTS(SELECT 1 FROM public.contab_oc_decisiones WHERE orden_compra_id=_oc_id AND accion='cerrar'),'cantidades',COALESCE((SELECT jsonb_object_agg(x.oc_linea_id::text,x.cantidad) FROM (SELECT i.oc_linea_id,sum(i.cantidad) cantidad FROM public.contab_comprobante_items i JOIN public.contab_comprobantes c ON c.id=i.comprobante_id WHERE c.orden_compra_id=_oc_id AND c.estado<>'anulado' AND (_excluir IS NULL OR c.id<>_excluir) AND i.oc_linea_id IS NOT NULL GROUP BY i.oc_linea_id) x),'{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_saldos(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.contab_oc_saldos(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.contab_oc_item_guarda() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.contab_comprobantes;
BEGIN
 SELECT * INTO c FROM public.contab_comprobantes WHERE id=NEW.comprobante_id;
 IF c.orden_compra_id IS NOT NULL THEN PERFORM 1 FROM public.ordenes_compra WHERE id=c.orden_compra_id FOR UPDATE; END IF;
 IF NEW.oc_linea_id IS NOT NULL AND (c.orden_compra_id IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.oc_snapshot->'items') s WHERE s->>'id'=NEW.oc_linea_id::text)) THEN RAISE EXCEPTION 'El renglón no pertenece a la OC vinculada'; END IF;
 RETURN NEW;
END $$;