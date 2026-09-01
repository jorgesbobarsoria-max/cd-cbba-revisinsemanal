CREATE TABLE public.plantilla_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  clave text NOT NULL,
  seccion text,
  label text,
  unidad text,
  opciones text[],
  orden integer,
  oculto boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, clave)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantilla_overrides TO authenticated;
GRANT ALL ON public.plantilla_overrides TO service_role;

ALTER TABLE public.plantilla_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read plantilla_overrides" ON public.plantilla_overrides
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert plantilla_overrides" ON public.plantilla_overrides
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update plantilla_overrides" ON public.plantilla_overrides
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete plantilla_overrides" ON public.plantilla_overrides
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_plantilla_overrides_updated
  BEFORE UPDATE ON public.plantilla_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();