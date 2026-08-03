-- Reglas de evaluación en puntos de inspección
ALTER TABLE public.puntos_inspeccion
  ADD COLUMN IF NOT EXISTS respuesta_esperada text,
  ADD COLUMN IF NOT EXISTS severidad text NOT NULL DEFAULT 'alerta',
  ADD COLUMN IF NOT EXISTS obligatorio boolean NOT NULL DEFAULT true;

-- Compatibilidad: los binarios existentes se evaluaban con "No" = correcto
UPDATE public.puntos_inspeccion
   SET respuesta_esperada = 'No'
 WHERE tipo = 'binario' AND respuesta_esperada IS NULL;

UPDATE public.puntos_inspeccion SET severidad = 'falla'
 WHERE tipo = 'binario' AND severidad = 'alerta';

ALTER TABLE public.plantilla_parametros
  ADD COLUMN IF NOT EXISTS respuesta_esperada text,
  ADD COLUMN IF NOT EXISTS severidad text NOT NULL DEFAULT 'alerta',
  ADD COLUMN IF NOT EXISTS obligatorio boolean NOT NULL DEFAULT false;

-- Excepciones manuales y justificación de N/A
ALTER TABLE public.inspeccion_items
  ADD COLUMN IF NOT EXISTS semaforo_auto text,
  ADD COLUMN IF NOT EXISTS excepcion_motivo text,
  ADD COLUMN IF NOT EXISTS excepcion_por uuid,
  ADD COLUMN IF NOT EXISTS excepcion_en timestamptz,
  ADD COLUMN IF NOT EXISTS na_motivo text;

-- Control de concurrencia y campos de contexto
ALTER TABLE public.inspecciones
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS standby_observaciones jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.mantenimientos
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.bump_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inspecciones_version ON public.inspecciones;
CREATE TRIGGER trg_inspecciones_version BEFORE UPDATE ON public.inspecciones
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();

DROP TRIGGER IF EXISTS trg_mantenimientos_version ON public.mantenimientos;
CREATE TRIGGER trg_mantenimientos_version BEFORE UPDATE ON public.mantenimientos
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();