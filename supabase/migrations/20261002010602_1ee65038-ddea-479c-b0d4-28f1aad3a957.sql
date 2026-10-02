DROP POLICY IF EXISTS "authenticated read plantilla_parametros" ON public.plantilla_parametros;
CREATE POLICY "role members read plantilla_parametros"
ON public.plantilla_parametros
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR public.has_role(auth.uid(), 'viewer'::public.app_role)
);

DROP POLICY IF EXISTS "authenticated read puntos" ON public.puntos_inspeccion;
CREATE POLICY "role members read puntos"
ON public.puntos_inspeccion
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR public.has_role(auth.uid(), 'viewer'::public.app_role)
);

DROP POLICY IF EXISTS "authenticated read evidencias" ON public.evidencias;
CREATE POLICY "role members read linked evidencias"
ON public.evidencias
FOR SELECT
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'tecnico'::public.app_role)
    OR public.has_role(auth.uid(), 'viewer'::public.app_role)
  )
  AND (
    (inspeccion_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.inspecciones i WHERE i.id = evidencias.inspeccion_id
    ))
    OR
    (mantenimiento_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.mantenimientos m WHERE m.id = evidencias.mantenimiento_id
    ))
  )
);