CREATE TABLE public.mantenimientos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  equipo_id TEXT REFERENCES public.equipos(id) ON DELETE SET NULL,
  equipo_externo JSONB,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tecnico TEXT,
  cargo TEXT,
  ciudad TEXT,
  direccion TEXT,
  empresa TEXT,
  actividad TEXT,
  proyecto TEXT,
  estado TEXT NOT NULL DEFAULT 'borrador',
  observaciones TEXT,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mantenimientos TO authenticated;
GRANT ALL ON public.mantenimientos TO service_role;

ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read mantenimientos" ON public.mantenimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert mantenimientos" ON public.mantenimientos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update mantenimientos" ON public.mantenimientos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete mantenimientos" ON public.mantenimientos FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_mantenimientos_updated_at
BEFORE UPDATE ON public.mantenimientos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mantenimientos_tipo ON public.mantenimientos(tipo);
CREATE INDEX idx_mantenimientos_fecha ON public.mantenimientos(fecha DESC);
CREATE INDEX idx_mantenimientos_equipo ON public.mantenimientos(equipo_id);