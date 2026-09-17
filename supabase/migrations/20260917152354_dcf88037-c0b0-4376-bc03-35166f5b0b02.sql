CREATE TABLE IF NOT EXISTS public.user_sitios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ciudad text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ciudad)
);

GRANT SELECT ON public.user_sitios TO authenticated;
GRANT ALL ON public.user_sitios TO service_role;

ALTER TABLE public.user_sitios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sitios select" ON public.user_sitios;
CREATE POLICY "user_sitios select" ON public.user_sitios FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.puede_escribir_sitio(_ciudad text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN true
    WHEN NOT public.has_role(auth.uid(), 'tecnico') THEN false
    WHEN _ciudad IS NULL OR btrim(_ciudad) = '' THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_sitios s
      WHERE s.user_id = auth.uid()
        AND lower(btrim(s.ciudad)) = lower(btrim(_ciudad))
    )
  END
$$;
REVOKE ALL ON FUNCTION public.puede_escribir_sitio(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_escribir_sitio(text) TO authenticated, service_role;

-- Inspecciones: escritura restringida al sitio asignado
DROP POLICY IF EXISTS "inspecciones insert" ON public.inspecciones;
CREATE POLICY "inspecciones insert" ON public.inspecciones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico'))
    AND public.puede_escribir_sitio(ciudad));

DROP POLICY IF EXISTS "inspecciones update" ON public.inspecciones;
CREATE POLICY "inspecciones update" ON public.inspecciones FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(), 'admin') OR (auth.uid() = user_id AND public.has_role(auth.uid(), 'tecnico')))
    AND public.puede_escribir_sitio(ciudad))
  WITH CHECK ((public.has_role(auth.uid(), 'admin') OR (auth.uid() = user_id AND public.has_role(auth.uid(), 'tecnico')))
    AND public.puede_escribir_sitio(ciudad));

DROP POLICY IF EXISTS "inspecciones delete" ON public.inspecciones;
CREATE POLICY "inspecciones delete" ON public.inspecciones FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = user_id AND public.has_role(auth.uid(), 'tecnico') AND estado <> 'finalizada'))
    AND public.puede_escribir_sitio(ciudad));

CREATE OR REPLACE FUNCTION public.can_write_inspeccion(_inspeccion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inspecciones i
    WHERE i.id = _inspeccion_id
      AND (public.has_role(auth.uid(), 'admin')
           OR (i.user_id = auth.uid() AND public.has_role(auth.uid(), 'tecnico')))
      AND public.puede_escribir_sitio(i.ciudad)
  )
$$;

-- Mantenimientos: escritura restringida al sitio asignado
DROP POLICY IF EXISTS "mantenimientos insert" ON public.mantenimientos;
CREATE POLICY "mantenimientos insert" ON public.mantenimientos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico'))
    AND public.puede_escribir_sitio(ciudad));

DROP POLICY IF EXISTS "mantenimientos update" ON public.mantenimientos;
CREATE POLICY "mantenimientos update" ON public.mantenimientos FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')))
    AND public.puede_escribir_sitio(ciudad))
  WITH CHECK ((public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')))
    AND public.puede_escribir_sitio(ciudad));

DROP POLICY IF EXISTS "mantenimientos delete" ON public.mantenimientos;
CREATE POLICY "mantenimientos delete" ON public.mantenimientos FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(), 'admin')
    OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico') AND estado <> 'finalizado'))
    AND public.puede_escribir_sitio(ciudad));

-- Técnicos actuales conservan acceso a todos los sitios existentes
INSERT INTO public.user_sitios (user_id, ciudad)
SELECT ur.user_id, c.ciudad
FROM public.user_roles ur
CROSS JOIN (SELECT DISTINCT ciudad FROM public.equipos WHERE ciudad IS NOT NULL) c
WHERE ur.role = 'tecnico'
ON CONFLICT (user_id, ciudad) DO NOTHING;