
-- Lectura global de registros para todos los usuarios autenticados
DROP POLICY IF EXISTS "inspecciones select" ON public.inspecciones;
CREATE POLICY "inspecciones select" ON public.inspecciones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mantenimientos select" ON public.mantenimientos;
CREATE POLICY "mantenimientos select" ON public.mantenimientos
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.can_read_inspeccion(_inspeccion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.inspecciones i WHERE i.id = _inspeccion_id)
$function$;

-- Fotos: lectura para todos los autenticados, escritura sigue restringida al dueño/admin
DROP POLICY IF EXISTS "owners read evidencias" ON public.evidencias;
CREATE POLICY "evidencias select" ON public.evidencias
  FOR SELECT TO authenticated USING (true);
