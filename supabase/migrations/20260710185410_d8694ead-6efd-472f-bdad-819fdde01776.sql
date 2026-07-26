
-- Tighten RLS on public.evidencias: scope by owner of parent inspection/maintenance
DROP POLICY IF EXISTS "auth read evidencias rows" ON public.evidencias;
DROP POLICY IF EXISTS "auth insert evidencias rows" ON public.evidencias;
DROP POLICY IF EXISTS "auth update evidencias rows" ON public.evidencias;
DROP POLICY IF EXISTS "auth delete evidencias rows" ON public.evidencias;

CREATE OR REPLACE FUNCTION public.user_owns_evidencia_parent(_inspeccion_id uuid, _mantenimiento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _inspeccion_id IS NOT NULL THEN EXISTS (
        SELECT 1 FROM public.inspecciones i
        WHERE i.id = _inspeccion_id AND i.user_id = auth.uid()
      )
      WHEN _mantenimiento_id IS NOT NULL THEN EXISTS (
        SELECT 1 FROM public.mantenimientos m
        WHERE m.id = _mantenimiento_id AND m.created_by = auth.uid()
      )
      ELSE false
    END
$$;

CREATE POLICY "owners read evidencias" ON public.evidencias
  FOR SELECT TO authenticated
  USING (public.user_owns_evidencia_parent(inspeccion_id, mantenimiento_id));

CREATE POLICY "owners insert evidencias" ON public.evidencias
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_owns_evidencia_parent(inspeccion_id, mantenimiento_id)
  );

CREATE POLICY "owners update evidencias" ON public.evidencias
  FOR UPDATE TO authenticated
  USING (public.user_owns_evidencia_parent(inspeccion_id, mantenimiento_id))
  WITH CHECK (public.user_owns_evidencia_parent(inspeccion_id, mantenimiento_id));

CREATE POLICY "owners delete evidencias" ON public.evidencias
  FOR DELETE TO authenticated
  USING (public.user_owns_evidencia_parent(inspeccion_id, mantenimiento_id));

-- Tighten storage.objects policies on the 'evidencias' bucket:
-- the file must correspond to a row in public.evidencias whose parent belongs to the caller.
DROP POLICY IF EXISTS "auth read evidencias" ON storage.objects;
DROP POLICY IF EXISTS "auth insert evidencias" ON storage.objects;
DROP POLICY IF EXISTS "auth update evidencias" ON storage.objects;
DROP POLICY IF EXISTS "auth delete evidencias" ON storage.objects;

CREATE POLICY "owners read evidencias objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidencias'
    AND EXISTS (
      SELECT 1 FROM public.evidencias e
      WHERE e.storage_path = storage.objects.name
        AND public.user_owns_evidencia_parent(e.inspeccion_id, e.mantenimiento_id)
    )
  );

-- Insert happens before the evidencias row exists; validate by path prefix (kind/parentId/...)
CREATE POLICY "owners insert evidencias objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidencias'
    AND owner = auth.uid()
    AND (
      (
        split_part(name, '/', 1) = 'insp'
        AND EXISTS (
          SELECT 1 FROM public.inspecciones i
          WHERE i.id::text = split_part(name, '/', 2)
            AND i.user_id = auth.uid()
        )
      )
      OR (
        split_part(name, '/', 1) = 'mant'
        AND EXISTS (
          SELECT 1 FROM public.mantenimientos m
          WHERE m.id::text = split_part(name, '/', 2)
            AND m.created_by = auth.uid()
        )
      )
    )
  );

CREATE POLICY "owners update evidencias objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'evidencias'
    AND EXISTS (
      SELECT 1 FROM public.evidencias e
      WHERE e.storage_path = storage.objects.name
        AND public.user_owns_evidencia_parent(e.inspeccion_id, e.mantenimiento_id)
    )
  )
  WITH CHECK (
    bucket_id = 'evidencias'
    AND EXISTS (
      SELECT 1 FROM public.evidencias e
      WHERE e.storage_path = storage.objects.name
        AND public.user_owns_evidencia_parent(e.inspeccion_id, e.mantenimiento_id)
    )
  );

CREATE POLICY "owners delete evidencias objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'evidencias'
    AND EXISTS (
      SELECT 1 FROM public.evidencias e
      WHERE e.storage_path = storage.objects.name
        AND public.user_owns_evidencia_parent(e.inspeccion_id, e.mantenimiento_id)
    )
  );
