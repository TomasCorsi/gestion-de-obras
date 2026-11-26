ALTER TABLE public.contab_comprobantes ADD COLUMN orden_compra_id uuid REFERENCES public.ordenes_compra(id), ADD COLUMN oc_snapshot jsonb;
ALTER TABLE public.contab_comprobante_items ADD COLUMN oc_linea_id uuid;
CREATE INDEX contab_cbte_oc_idx ON public.contab_comprobantes(orden_compra_id);
CREATE INDEX contab_item_oc_idx ON public.contab_comprobante_items(oc_linea_id);
CREATE TABLE public.contab_oc_decisiones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), orden_compra_id uuid NOT NULL REFERENCES public.ordenes_compra(id), comprobante_id uuid REFERENCES public.contab_comprobantes(id) ON DELETE CASCADE, accion text NOT NULL CHECK(accion IN ('aprobar','cerrar')), motivo text NOT NULL CHECK(length(trim(motivo))>0), firma jsonb, usuario_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.contab_oc_decisiones TO authenticated;
GRANT ALL ON public.contab_oc_decisiones TO service_role;
ALTER TABLE public.contab_oc_decisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY oc_decisiones_ver ON public.contab_oc_decisiones FOR SELECT TO authenticated USING(public.contab_puede('ver'));
CREATE UNIQUE INDEX oc_cierre_unico ON public.contab_oc_decisiones(orden_compra_id) WHERE accion='cerrar';

CREATE FUNCTION public.contab_oc_cabecera_guarda() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.ordenes_compra; proveedor uuid;
BEGIN
 IF NEW.orden_compra_id IS NULL THEN NEW.oc_snapshot:=NULL; RETURN NEW; END IF;
 SELECT * INTO o FROM public.ordenes_compra WHERE id=NEW.orden_compra_id FOR UPDATE;
 SELECT proveedor_id INTO proveedor FROM public.contab_terceros WHERE id=NEW.tercero_id;
 IF NEW.es_venta OR NEW.tipo::text NOT IN ('FA_CPA_A','FA_CPA_B','FA_CPA_C') OR proveedor IS DISTINCT FROM o.proveedor_id OR proveedor IS NULL THEN RAISE EXCEPTION 'La OC debe corresponder al mismo proveedor de una factura de compra'; END IF;
 IF NEW.moneda IS DISTINCT FROM o.moneda THEN RAISE EXCEPTION 'La moneda de la factura debe coincidir con la OC'; END IF;
 IF TG_OP='UPDATE' AND NEW.orden_compra_id IS NOT DISTINCT FROM OLD.orden_compra_id THEN NEW.oc_snapshot:=OLD.oc_snapshot;
 ELSE
  IF o.estado NOT IN ('emitida','recibida') THEN RAISE EXCEPTION 'Elegí una OC emitida o recibida'; END IF;
  IF EXISTS(SELECT 1 FROM public.contab_oc_decisiones WHERE orden_compra_id=o.id AND accion='cerrar') THEN RAISE EXCEPTION 'La OC tiene el saldo cerrado'; END IF;
  NEW.oc_snapshot:=jsonb_build_object('numero',o.numero,'moneda',o.moneda,'items',COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.orden,i.id) FROM public.orden_compra_items i WHERE i.orden_id=o.id),'[]'::jsonb));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_cabecera_guarda() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oc_cabecera_guarda BEFORE INSERT OR UPDATE ON public.contab_comprobantes FOR EACH ROW EXECUTE FUNCTION public.contab_oc_cabecera_guarda();

CREATE FUNCTION public.contab_oc_item_guarda() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.contab_comprobantes;
BEGIN
 SELECT * INTO c FROM public.contab_comprobantes WHERE id=NEW.comprobante_id;
 IF NEW.oc_linea_id IS NOT NULL AND (c.orden_compra_id IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.oc_snapshot->'items') s WHERE s->>'id'=NEW.oc_linea_id::text)) THEN RAISE EXCEPTION 'El renglón no pertenece a la OC vinculada'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_item_guarda() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oc_item_guarda BEFORE INSERT OR UPDATE ON public.contab_comprobante_items FOR EACH ROW EXECUTE FUNCTION public.contab_oc_item_guarda();

CREATE FUNCTION public.contab_oc_preservar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE oid uuid;
BEGIN
 IF TG_TABLE_NAME='ordenes_compra' THEN oid:=OLD.id; ELSE oid:=CASE WHEN TG_OP='INSERT' THEN NEW.orden_id ELSE OLD.orden_id END; END IF;
 IF EXISTS(SELECT 1 FROM public.contab_comprobantes WHERE orden_compra_id=oid) THEN
  IF TG_TABLE_NAME='ordenes_compra' AND TG_OP='UPDATE' AND (to_jsonb(NEW)-'estado'-'updated_at')=(to_jsonb(OLD)-'estado'-'updated_at') AND NEW.estado<>'cancelada' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'La OC está vinculada a una factura: sus datos autorizados no pueden modificarse';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_preservar() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oc_preservar BEFORE UPDATE OR DELETE ON public.ordenes_compra FOR EACH ROW EXECUTE FUNCTION public.contab_oc_preservar();
CREATE TRIGGER oc_items_preservar BEFORE INSERT OR UPDATE OR DELETE ON public.orden_compra_items FOR EACH ROW EXECUTE FUNCTION public.contab_oc_preservar();

CREATE FUNCTION public.contab_oc_revision(_cbte_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.contab_comprobantes; lineas jsonb; extras jsonb; firma jsonb; requiere boolean;
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
 firma:=jsonb_build_object('lineas',lineas,'extras',extras,'cabecera',jsonb_build_object('tercero',c.tercero_id,'moneda',c.moneda,'cotizacion',c.cotizacion,'total',c.total),'items',(SELECT jsonb_agg(to_jsonb(i)-'created_at'-'updated_at' ORDER BY i.orden,i.id) FROM public.contab_comprobante_items i WHERE comprobante_id=c.id));
 RETURN jsonb_build_object('lineas',lineas,'extras',extras,'requiere_aprobacion',requiere,'aprobado',EXISTS(SELECT 1 FROM public.contab_oc_decisiones d WHERE d.comprobante_id=c.id AND d.accion='aprobar' AND d.firma=firma),'firma',firma,'cerrado',EXISTS(SELECT 1 FROM public.contab_oc_decisiones WHERE orden_compra_id=c.orden_compra_id AND accion='cerrar'));
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_revision(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.contab_oc_revision(uuid) TO authenticated;

CREATE FUNCTION public.contab_oc_decidir(_cbte_id uuid,_accion text,_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.contab_comprobantes; revision jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Solo un administrador puede aprobar diferencias o cerrar saldos'; END IF;
 IF _accion NOT IN ('aprobar','cerrar') OR NULLIF(trim(_motivo),'') IS NULL THEN RAISE EXCEPTION 'Indicá un motivo'; END IF;
 SELECT * INTO c FROM public.contab_comprobantes WHERE id=_cbte_id;
 IF c.orden_compra_id IS NULL OR c.estado='anulado' THEN RAISE EXCEPTION 'Factura sin OC activa'; END IF;
 PERFORM 1 FROM public.ordenes_compra WHERE id=c.orden_compra_id FOR UPDATE;
 revision:=public.contab_oc_revision(c.id);
 IF _accion='cerrar' AND EXISTS(SELECT 1 FROM public.contab_comprobantes p WHERE p.orden_compra_id=c.orden_compra_id AND p.estado='borrador') THEN RAISE EXCEPTION 'Confirmá o anulá las facturas pendientes antes de cerrar el saldo'; END IF;
 INSERT INTO public.contab_oc_decisiones(orden_compra_id,comprobante_id,accion,motivo,firma,usuario_id) VALUES(c.orden_compra_id,c.id,_accion,trim(_motivo),revision->'firma',auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_decidir(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.contab_oc_decidir(uuid,text,text) TO authenticated;

CREATE FUNCTION public.contab_oc_confirmacion_guarda() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE oid uuid; revision jsonb;
BEGIN
 IF NEW.estado='confirmado' AND OLD.estado IS DISTINCT FROM NEW.estado AND NEW.comprobante_id IS NOT NULL AND NEW.reversa_de IS NULL THEN
  SELECT orden_compra_id INTO oid FROM public.contab_comprobantes WHERE id=NEW.comprobante_id;
  IF oid IS NOT NULL THEN
   PERFORM 1 FROM public.ordenes_compra WHERE id=oid FOR UPDATE;
   revision:=public.contab_oc_revision(NEW.comprobante_id);
   IF (revision->>'requiere_aprobacion')::boolean AND NOT (revision->>'aprobado')::boolean THEN RAISE EXCEPTION 'La factura difiere de la OC: un administrador debe aprobar las diferencias antes de confirmar'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.contab_oc_confirmacion_guarda() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oc_confirmacion_guarda BEFORE UPDATE OF estado ON public.contab_asientos FOR EACH ROW EXECUTE FUNCTION public.contab_oc_confirmacion_guarda();

CREATE FUNCTION public.contab_guardar_compra_oc(p_cabecera jsonb,p_items jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE cid uuid; k text; cols text; it jsonb; iid uuid; ids uuid[]:='{}'; oid uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
 cid:=NULLIF(p_cabecera->>'id','')::uuid; oid:=NULLIF(p_cabecera->>'orden_compra_id','')::uuid;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'La factura debe tener renglones'; END IF;
 IF oid IS NOT NULL THEN PERFORM 1 FROM public.ordenes_compra WHERE id=oid FOR UPDATE; END IF;
 IF cid IS NULL THEN
  INSERT INTO public.contab_comprobantes(tipo,fecha,numero,punto_venta,tercero_id,es_venta,created_by) VALUES((p_cabecera->>'tipo')::public.contab_cbte_tipo,(p_cabecera->>'fecha')::date,(p_cabecera->>'numero')::bigint,(p_cabecera->>'punto_venta')::int,NULLIF(p_cabecera->>'tercero_id','')::uuid,false,auth.uid()) RETURNING id INTO cid;
 ELSE
  PERFORM 1 FROM public.contab_comprobantes WHERE id=cid AND NOT es_venta FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Factura no encontrada'; END IF;
 END IF;
 FOR k IN SELECT jsonb_object_keys(p_cabecera) LOOP
  IF k=ANY(ARRAY['tipo','punto_venta','numero','fecha','fecha_vto','tercero_id','neto_21','iva_21','neto_105','iva_105','neto_27','iva_27','neto_0','exento','no_gravado','perc_iva','perc_iibb','perc_otras','total','moneda','cotizacion','obra_id','maquinaria_id','observaciones','orden_compra_id']) THEN cols:=concat_ws(',',cols,format('%I',k)); END IF;
 END LOOP;
 IF cols IS NOT NULL THEN EXECUTE format('UPDATE public.contab_comprobantes SET (%s)=(SELECT %s FROM jsonb_populate_record(NULL::public.contab_comprobantes,$1)) WHERE id=$2',cols,cols) USING p_cabecera,cid; END IF;
 FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  iid:=NULLIF(it->>'id','')::uuid;
  IF iid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contab_comprobante_items WHERE id=iid AND comprobante_id=cid) THEN RAISE EXCEPTION 'Renglón ajeno al comprobante'; END IF;
  IF iid IS NULL THEN INSERT INTO public.contab_comprobante_items(comprobante_id,orden,descripcion) VALUES(cid,cardinality(ids)+1,COALESCE(it->>'descripcion','')) RETURNING id INTO iid; END IF;
  UPDATE public.contab_comprobante_items SET orden=cardinality(ids)+1,descripcion=it->>'descripcion',cuenta_id=NULLIF(it->>'cuenta_id','')::uuid,cantidad=(it->>'cantidad')::numeric,precio_unit=(it->>'precio_unit')::numeric,neto=round((it->>'cantidad')::numeric*(it->>'precio_unit')::numeric,2),alicuota_iva=(it->>'alicuota_iva')::numeric,iva=round(round((it->>'cantidad')::numeric*(it->>'precio_unit')::numeric,2)*(it->>'alicuota_iva')::numeric/100,2),obra_id=NULLIF(it->>'obra_id','')::uuid,maquinaria_id=NULLIF(it->>'maquinaria_id','')::uuid,oc_linea_id=NULLIF(it->>'oc_linea_id','')::uuid WHERE id=iid;
  ids:=array_append(ids,iid);
 END LOOP;
 DELETE FROM public.contab_comprobante_items WHERE comprobante_id=cid AND NOT(id=ANY(ids));
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.contab_guardar_compra_oc(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.contab_guardar_compra_oc(jsonb,jsonb) TO authenticated;