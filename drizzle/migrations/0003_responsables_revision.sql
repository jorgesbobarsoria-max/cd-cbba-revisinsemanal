ALTER TABLE public.inspecciones ADD COLUMN IF NOT EXISTS supervisor_id uuid;
ALTER TABLE public.inspecciones ADD COLUMN IF NOT EXISTS cargo_supervisor text;
COMMENT ON COLUMN public.inspecciones.supervisor_id IS 'Usuario seleccionado como supervisor; no otorga permisos ni constituye aprobación.';
COMMENT ON COLUMN public.inspecciones.cargo_supervisor IS 'Cargo del supervisor al guardar la revisión, conservado para los informes históricos.';