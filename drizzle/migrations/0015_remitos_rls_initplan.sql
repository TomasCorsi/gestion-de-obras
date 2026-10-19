CREATE OR REPLACE VIEW public.remitos_list_view WITH (security_invoker=true) AS
SELECT r.id, r.numero, r.viaje_id, r.fecha, r.obra_id, r.material, r.cantidad, r.unidad, r.recibido_por,
  r.firmado, r.evidencia_url, r.observaciones, r.created_at, r.updated_at, r.row_color, r.proveedor,
  r.cliente, r.cliente_destino, r.remito_tercero, r.remito_local, r.desde, r.hasta, r.cantidad_viajes,
  r.tipo_material, r.precio_total, r.tipo_transporte, r.maquinaria_id, r.patente_tercero, r.cantidad_uni,
  r.precio_unitario, r.precio_calc_mode, r.forma_pago, r.created_by, r.cliente_cantera,
  o.nombre AS obra_nombre, m.codigo AS maquinaria_codigo, m.patente AS maquinaria_patente
FROM remitos r
LEFT JOIN obras o ON o.id = r.obra_id
LEFT JOIN maquinarias m ON m.id = r.maquinaria_id
WHERE (SELECT public.can_view_remitos(auth.uid()))
  AND ((SELECT public.has_role(auth.uid(), 'admin'::app_role))
    OR (SELECT public.has_role(auth.uid(), 'capataz'::app_role))
    OR (SELECT public.has_role(auth.uid(), 'maquinista'::app_role))
    OR ((SELECT public.has_role(auth.uid(), 'remitero'::app_role)) AND r.created_by = (SELECT auth.uid())));

ALTER POLICY "Admins and capataces can manage remitos" ON public.remitos
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.has_role(auth.uid(), 'capataz'::app_role)));
ALTER POLICY "Maquinistas can view remitos" ON public.remitos
  USING ((SELECT public.has_role(auth.uid(), 'maquinista'::app_role)));
ALTER POLICY "Remiteros can manage own remitos" ON public.remitos
  USING ((SELECT public.has_role(auth.uid(), 'remitero'::app_role)) AND created_by = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'remitero'::app_role)) AND created_by = (SELECT auth.uid()));
ALTER POLICY "Admins and capataces can manage obras" ON public.obras
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.has_role(auth.uid(), 'capataz'::app_role)));
ALTER POLICY "Admins and capataces can manage maquinarias" ON public.maquinarias
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)) OR (SELECT public.has_role(auth.uid(), 'capataz'::app_role)));