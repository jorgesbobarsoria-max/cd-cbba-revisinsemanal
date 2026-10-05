CREATE OR REPLACE FUNCTION public.es_usuario_activo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active)
     AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.es_usuario_activo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_usuario_activo() TO authenticated;

DROP POLICY IF EXISTS "mantenimientos select" ON public.mantenimientos;
CREATE POLICY "mantenimientos select" ON public.mantenimientos FOR SELECT TO authenticated USING (public.es_usuario_activo());
DROP POLICY IF EXISTS "auth read plantilla_overrides" ON public.plantilla_overrides;
CREATE POLICY "auth read plantilla_overrides" ON public.plantilla_overrides FOR SELECT TO authenticated USING (public.es_usuario_activo());
DROP POLICY IF EXISTS "auth read equipos_externos" ON public.equipos_externos;
CREATE POLICY "auth read equipos_externos" ON public.equipos_externos FOR SELECT TO authenticated USING (public.es_usuario_activo());