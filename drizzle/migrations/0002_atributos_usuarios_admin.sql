ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS atributos jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_atributos_object CHECK (jsonb_typeof(atributos) = 'object');
CREATE OR REPLACE FUNCTION public.protect_profile_attributes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.cargo IS DISTINCT FROM OLD.cargo OR NEW.atributos IS DISTINCT FROM OLD.atributos)
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Solo administradores pueden editar cargo y atributos';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_profile_attributes_before_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_attributes();