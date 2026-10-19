DROP POLICY IF EXISTS "Autenticados leen sesiones de tablero" ON public.tablero_sesiones;
DROP POLICY IF EXISTS "Autenticados actualizan sesiones de tablero" ON public.tablero_sesiones;
CREATE POLICY "Admins leen sesiones de tablero" ON public.tablero_sesiones FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins actualizan sesiones de tablero" ON public.tablero_sesiones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));