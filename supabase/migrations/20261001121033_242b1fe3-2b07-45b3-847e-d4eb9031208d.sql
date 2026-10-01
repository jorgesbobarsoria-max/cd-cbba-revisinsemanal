DROP POLICY IF EXISTS "auth read plantilla_parametros" ON public.plantilla_parametros;
CREATE POLICY "authenticated read plantilla_parametros"
ON public.plantilla_parametros
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "evidencias select" ON public.evidencias;
CREATE POLICY "authenticated read evidencias"
ON public.evidencias
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth read puntos" ON public.puntos_inspeccion;
CREATE POLICY "authenticated read puntos"
ON public.puntos_inspeccion
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);