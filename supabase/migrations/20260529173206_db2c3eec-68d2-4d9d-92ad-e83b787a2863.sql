
-- Equipment catalog
CREATE TABLE public.equipos (
  id TEXT PRIMARY KEY,
  categoria TEXT NOT NULL,
  tag TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  capacidad TEXT,
  ubicacion TEXT,
  criticidad TEXT,
  redundancia TEXT,
  estado TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equipos TO authenticated;
GRANT ALL ON public.equipos TO service_role;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read equipos" ON public.equipos FOR SELECT TO authenticated USING (true);

-- Puntos de inspección por equipo (plantilla)
CREATE TABLE public.puntos_inspeccion (
  id BIGSERIAL PRIMARY KEY,
  equipo_id TEXT NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  descripcion TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'estado', -- 'estado' | 'numerico' | 'texto'
  unidad TEXT,
  min_ok NUMERIC,
  max_ok NUMERIC,
  min_alerta NUMERIC,
  max_alerta NUMERIC
);
GRANT SELECT ON public.puntos_inspeccion TO authenticated;
GRANT ALL ON public.puntos_inspeccion TO service_role;
ALTER TABLE public.puntos_inspeccion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read puntos" ON public.puntos_inspeccion FOR SELECT TO authenticated USING (true);

-- Inspecciones semanales (cabecera)
CREATE TABLE public.inspecciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  semana INT NOT NULL,
  turno TEXT,
  tecnico TEXT,
  cargo TEXT,
  supervisor TEXT,
  condicion_clima TEXT,
  temp_sala NUMERIC,
  hr_sala NUMERIC,
  presion_diferencial NUMERIC,
  carga_it NUMERIC,
  pue NUMERIC,
  proxima_revision DATE,
  estado TEXT NOT NULL DEFAULT 'borrador', -- borrador | finalizado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspecciones TO authenticated;
GRANT ALL ON public.inspecciones TO service_role;
ALTER TABLE public.inspecciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inspecciones select" ON public.inspecciones FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own inspecciones insert" ON public.inspecciones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inspecciones update" ON public.inspecciones FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own inspecciones delete" ON public.inspecciones FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Detalle de cada punto inspeccionado
CREATE TABLE public.inspeccion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspeccion_id UUID NOT NULL REFERENCES public.inspecciones(id) ON DELETE CASCADE,
  equipo_id TEXT NOT NULL REFERENCES public.equipos(id),
  punto_id BIGINT NOT NULL REFERENCES public.puntos_inspeccion(id),
  estado TEXT, -- OK | ALERTA | FALLA | NA
  valor TEXT,
  semaforo TEXT, -- verde | amarillo | rojo | gris
  observaciones TEXT,
  accion_correctiva TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.inspeccion_items(inspeccion_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspeccion_items TO authenticated;
GRANT ALL ON public.inspeccion_items TO service_role;
ALTER TABLE public.inspeccion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items via inspeccion select" ON public.inspeccion_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspecciones i WHERE i.id = inspeccion_id AND i.user_id = auth.uid()));
CREATE POLICY "items via inspeccion insert" ON public.inspeccion_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspecciones i WHERE i.id = inspeccion_id AND i.user_id = auth.uid()));
CREATE POLICY "items via inspeccion update" ON public.inspeccion_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspecciones i WHERE i.id = inspeccion_id AND i.user_id = auth.uid()));
CREATE POLICY "items via inspeccion delete" ON public.inspeccion_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspecciones i WHERE i.id = inspeccion_id AND i.user_id = auth.uid()));
