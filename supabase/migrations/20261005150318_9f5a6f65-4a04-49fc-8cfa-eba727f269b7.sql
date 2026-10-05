DROP POLICY IF EXISTS "auth read equipos" ON public.equipos;
CREATE POLICY "auth read equipos" ON public.equipos FOR SELECT TO authenticated USING (public.es_usuario_activo());
DROP POLICY IF EXISTS "inspecciones select" ON public.inspecciones;
CREATE POLICY "inspecciones select" ON public.inspecciones FOR SELECT TO authenticated USING (public.es_usuario_activo());