
-- Tabla para equipos no registrados (manuales) usados en mantenimientos
CREATE TABLE public.equipos_externos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT NOT NULL,
  tipo TEXT NOT NULL, -- id de plantilla: clima, ups, ats, gen, supresor, mdc
  marca TEXT,
  modelo TEXT,
  serie TEXT,
  capacidad TEXT,
  ubicacion TEXT,
  notas TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipos_externos TO authenticated;
GRANT ALL ON public.equipos_externos TO service_role;
ALTER TABLE public.equipos_externos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read equipos_externos" ON public.equipos_externos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert equipos_externos" ON public.equipos_externos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update equipos_externos" ON public.equipos_externos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete equipos_externos" ON public.equipos_externos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_equipos_externos_updated BEFORE UPDATE ON public.equipos_externos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla para parámetros personalizados (extras) por tipo de plantilla
CREATE TABLE public.plantilla_parametros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- id de plantilla
  seccion TEXT NOT NULL,
  clave TEXT NOT NULL,
  label TEXT NOT NULL,
  tipo_dato TEXT NOT NULL DEFAULT 'texto', -- binario|numerico|texto|opcion|trio
  unidad TEXT,
  opciones TEXT[],
  orden INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, clave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantilla_parametros TO authenticated;
GRANT ALL ON public.plantilla_parametros TO service_role;
ALTER TABLE public.plantilla_parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read plantilla_parametros" ON public.plantilla_parametros FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert plantilla_parametros" ON public.plantilla_parametros FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update plantilla_parametros" ON public.plantilla_parametros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete plantilla_parametros" ON public.plantilla_parametros FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_plantilla_parametros_updated BEFORE UPDATE ON public.plantilla_parametros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
