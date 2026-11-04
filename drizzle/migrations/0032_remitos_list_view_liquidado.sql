CREATE OR REPLACE VIEW public.remitos_list_view WITH (security_invoker=true) AS
 SELECT r.id, r.numero, r.viaje_id, r.fecha, r.obra_id, r.material, r.cantidad, r.unidad, r.recibido_por, r.firmado, r.evidencia_url, r.observaciones, r.created_at, r.updated_at, r.row_color, r.proveedor, r.cliente, r.cliente_destino, r.remito_tercero, r.remito_local, r.desde, r.hasta, r.cantidad_viajes, r.tipo_material, r.precio_total, r.tipo_transporte, r.maquinaria_id, r.patente_tercero, r.cantidad_uni, r.precio_unitario, r.precio_calc_mode, r.forma_pago, r.created_by, r.cliente_cantera,
    o.nombre AS obra_nombre, m.codigo AS maquinaria_codigo, m.patente AS maquinaria_patente,
    r.liquidado, r.liquidado_at
   FROM remitos r
     LEFT JOIN obras o ON o.id = r.obra_id
     LEFT JOIN maquinarias m ON m.id = r.maquinaria_id
  WHERE ( SELECT can_view_remitos(auth.uid()) AS can_view_remitos) AND (( SELECT has_role(auth.uid(), 'admin'::app_role) AS has_role) OR ( SELECT has_role(auth.uid(), 'capataz'::app_role) AS has_role) OR ( SELECT has_role(auth.uid(), 'maquinista'::app_role) AS has_role) OR ( SELECT has_role(auth.uid(), 'remitero'::app_role) AS has_role) AND r.created_by = (( SELECT auth.uid() AS uid)));