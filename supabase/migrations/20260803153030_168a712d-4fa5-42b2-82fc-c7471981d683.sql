-- =========================================================
-- 1. AUDIT LOG
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id text,
  datos_antes jsonb,
  datos_despues jsonb,
  detalle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read audit log" ON public.audit_log;
CREATE POLICY "admins read audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entidad_idx ON public.audit_log (entidad, entidad_id);

-- función de escritura de auditoría (usable desde triggers y desde el servidor)
CREATE OR REPLACE FUNCTION public.log_audit(
  _accion text,
  _entidad text,
  _entidad_id text,
  _datos_antes jsonb DEFAULT NULL,
  _datos_despues jsonb DEFAULT NULL,
  _detalle text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, actor_email, accion, entidad, entidad_id, datos_antes, datos_despues, detalle)
  VALUES (
    auth.uid(),
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    _accion, _entidad, _entidad_id, _datos_antes, _datos_despues, _detalle
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb, jsonb, text) TO authenticated, service_role;

-- trigger genérico de auditoría
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _id := COALESCE((to_jsonb(OLD)->>'id'), '');
    INSERT INTO public.audit_log (actor_id, actor_email, accion, entidad, entidad_id, datos_antes)
    VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
            'eliminar', TG_TABLE_NAME, _id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _id := COALESCE((to_jsonb(NEW)->>'id'), '');
    INSERT INTO public.audit_log (actor_id, actor_email, accion, entidad, entidad_id, datos_antes, datos_despues)
    VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
            'editar', TG_TABLE_NAME, _id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    _id := COALESCE((to_jsonb(NEW)->>'id'), '');
    INSERT INTO public.audit_log (actor_id, actor_email, accion, entidad, entidad_id, datos_despues)
    VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
            'crear', TG_TABLE_NAME, _id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_inspecciones ON public.inspecciones;
CREATE TRIGGER audit_inspecciones AFTER INSERT OR UPDATE OR DELETE ON public.inspecciones
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_mantenimientos ON public.mantenimientos;
CREATE TRIGGER audit_mantenimientos AFTER INSERT OR UPDATE OR DELETE ON public.mantenimientos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_equipos ON public.equipos;
CREATE TRIGGER audit_equipos AFTER INSERT OR UPDATE OR DELETE ON public.equipos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- =========================================================
-- 2. CATÁLOGOS: lectura para autenticados, escritura solo admin
-- =========================================================
DROP POLICY IF EXISTS "auth insert equipos" ON public.equipos;
DROP POLICY IF EXISTS "auth update equipos" ON public.equipos;
DROP POLICY IF EXISTS "auth delete equipos" ON public.equipos;
CREATE POLICY "admin insert equipos" ON public.equipos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update equipos" ON public.equipos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete equipos" ON public.equipos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth insert puntos" ON public.puntos_inspeccion;
DROP POLICY IF EXISTS "auth update puntos" ON public.puntos_inspeccion;
DROP POLICY IF EXISTS "auth delete puntos" ON public.puntos_inspeccion;
CREATE POLICY "admin insert puntos" ON public.puntos_inspeccion FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update puntos" ON public.puntos_inspeccion FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete puntos" ON public.puntos_inspeccion FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth insert plantilla_parametros" ON public.plantilla_parametros;
DROP POLICY IF EXISTS "auth update plantilla_parametros" ON public.plantilla_parametros;
DROP POLICY IF EXISTS "auth delete plantilla_parametros" ON public.plantilla_parametros;
CREATE POLICY "admin insert plantilla_parametros" ON public.plantilla_parametros FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update plantilla_parametros" ON public.plantilla_parametros FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete plantilla_parametros" ON public.plantilla_parametros FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- equipos externos: técnico y admin pueden crear/editar; borrar solo admin o su creador
DROP POLICY IF EXISTS "auth insert equipos_externos" ON public.equipos_externos;
DROP POLICY IF EXISTS "auth update equipos_externos" ON public.equipos_externos;
DROP POLICY IF EXISTS "auth delete equipos_externos" ON public.equipos_externos;
CREATE POLICY "tecnico insert equipos_externos" ON public.equipos_externos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico')));
CREATE POLICY "tecnico update equipos_externos" ON public.equipos_externos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')));
CREATE POLICY "tecnico delete equipos_externos" ON public.equipos_externos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')));

-- =========================================================
-- 3. INSPECCIONES
-- =========================================================
DROP POLICY IF EXISTS "own inspecciones select" ON public.inspecciones;
DROP POLICY IF EXISTS "own inspecciones insert" ON public.inspecciones;
DROP POLICY IF EXISTS "own inspecciones update" ON public.inspecciones;
DROP POLICY IF EXISTS "own inspecciones delete" ON public.inspecciones;

CREATE POLICY "inspecciones select" ON public.inspecciones FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR estado = 'finalizada');
CREATE POLICY "inspecciones insert" ON public.inspecciones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico')));
CREATE POLICY "inspecciones update" ON public.inspecciones FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = user_id AND public.has_role(auth.uid(), 'tecnico')))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (auth.uid() = user_id AND public.has_role(auth.uid(), 'tecnico')));
CREATE POLICY "inspecciones delete" ON public.inspecciones FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = user_id AND public.has_role(auth.uid(), 'tecnico') AND estado <> 'finalizada'));

-- helpers de acceso a inspección
CREATE OR REPLACE FUNCTION public.can_read_inspeccion(_inspeccion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inspecciones i
    WHERE i.id = _inspeccion_id
      AND (i.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR i.estado = 'finalizada')
  )
$$;
CREATE OR REPLACE FUNCTION public.can_write_inspeccion(_inspeccion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inspecciones i
    WHERE i.id = _inspeccion_id
      AND (public.has_role(auth.uid(), 'admin')
           OR (i.user_id = auth.uid() AND public.has_role(auth.uid(), 'tecnico')))
  )
$$;
REVOKE ALL ON FUNCTION public.can_read_inspeccion(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_inspeccion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_inspeccion(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_inspeccion(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "items via inspeccion select" ON public.inspeccion_items;
DROP POLICY IF EXISTS "items via inspeccion insert" ON public.inspeccion_items;
DROP POLICY IF EXISTS "items via inspeccion update" ON public.inspeccion_items;
DROP POLICY IF EXISTS "items via inspeccion delete" ON public.inspeccion_items;
CREATE POLICY "items select" ON public.inspeccion_items FOR SELECT TO authenticated
  USING (public.can_read_inspeccion(inspeccion_id));
CREATE POLICY "items insert" ON public.inspeccion_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_inspeccion(inspeccion_id));
CREATE POLICY "items update" ON public.inspeccion_items FOR UPDATE TO authenticated
  USING (public.can_write_inspeccion(inspeccion_id)) WITH CHECK (public.can_write_inspeccion(inspeccion_id));
CREATE POLICY "items delete" ON public.inspeccion_items FOR DELETE TO authenticated
  USING (public.can_write_inspeccion(inspeccion_id));

-- =========================================================
-- 4. MANTENIMIENTOS
-- =========================================================
DROP POLICY IF EXISTS "auth read mantenimientos" ON public.mantenimientos;
DROP POLICY IF EXISTS "auth insert mantenimientos" ON public.mantenimientos;
DROP POLICY IF EXISTS "auth update mantenimientos" ON public.mantenimientos;
DROP POLICY IF EXISTS "auth delete mantenimientos" ON public.mantenimientos;
CREATE POLICY "mantenimientos select" ON public.mantenimientos FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR estado = 'finalizado');
CREATE POLICY "mantenimientos insert" ON public.mantenimientos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tecnico')));
CREATE POLICY "mantenimientos update" ON public.mantenimientos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico')));
CREATE POLICY "mantenimientos delete" ON public.mantenimientos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
    OR (created_by = auth.uid() AND public.has_role(auth.uid(), 'tecnico') AND estado <> 'finalizado'));

-- =========================================================
-- 5. EVIDENCIAS: propietario o administrador
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_owns_evidencia_parent(_inspeccion_id uuid, _mantenimiento_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE
      WHEN public.has_role(auth.uid(), 'admin') THEN true
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

-- descripción opcional de la fotografía
ALTER TABLE public.evidencias ADD COLUMN IF NOT EXISTS descripcion text;

-- =========================================================
-- 6. PROFILES: nadie se auto-modifica estado ni rol
-- =========================================================
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- el propio usuario sólo puede desactivar su bandera de cambio de contraseña
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'No autorizado para cambiar el estado de la cuenta';
  END IF;
  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     AND NEW.must_change_password = true THEN
    RAISE EXCEPTION 'No autorizado para cambiar este campo';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'No autorizado para cambiar la identidad de la cuenta';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;