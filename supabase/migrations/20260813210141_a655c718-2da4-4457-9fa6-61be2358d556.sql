ALTER TABLE public.inspecciones
  ALTER COLUMN standby_equipos DROP DEFAULT,
  ALTER COLUMN standby_equipos TYPE text[] USING (
    COALESCE(standby_equipos, '{}'::uuid[])::text[]
  );

ALTER TABLE public.inspecciones
  ALTER COLUMN standby_equipos SET DEFAULT '{}'::text[];

ALTER TABLE public.inspecciones
  ALTER COLUMN standby_equipos SET NOT NULL;