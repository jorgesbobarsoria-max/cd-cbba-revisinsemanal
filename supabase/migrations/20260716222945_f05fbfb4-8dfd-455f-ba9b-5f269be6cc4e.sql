
ALTER TABLE public.puntos_inspeccion
  ADD COLUMN IF NOT EXISTS valores_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS etiquetas_valores text[] NULL;

ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS datos_adicionales jsonb NOT NULL DEFAULT '{}'::jsonb;
