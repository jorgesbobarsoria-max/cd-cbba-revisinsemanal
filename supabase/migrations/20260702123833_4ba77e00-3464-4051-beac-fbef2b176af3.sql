
-- Policies for the private "evidencias" bucket (shared among authenticated users)
CREATE POLICY "auth read evidencias" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidencias');
CREATE POLICY "auth insert evidencias" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidencias');
CREATE POLICY "auth update evidencias" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evidencias') WITH CHECK (bucket_id = 'evidencias');
CREATE POLICY "auth delete evidencias" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidencias');

-- Table
CREATE TABLE public.evidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspeccion_id UUID REFERENCES public.inspecciones(id) ON DELETE CASCADE,
  mantenimiento_id UUID REFERENCES public.mantenimientos(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('general','equipo','parametro')),
  equipo_ref TEXT,
  param_key TEXT,
  storage_path TEXT NOT NULL,
  caption TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidencia_parent CHECK (
    (inspeccion_id IS NOT NULL AND mantenimiento_id IS NULL) OR
    (inspeccion_id IS NULL AND mantenimiento_id IS NOT NULL)
  )
);
CREATE INDEX evidencias_insp_idx ON public.evidencias(inspeccion_id);
CREATE INDEX evidencias_mant_idx ON public.evidencias(mantenimiento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidencias TO authenticated;
GRANT ALL ON public.evidencias TO service_role;

ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read evidencias rows" ON public.evidencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert evidencias rows" ON public.evidencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update evidencias rows" ON public.evidencias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete evidencias rows" ON public.evidencias FOR DELETE TO authenticated USING (true);
