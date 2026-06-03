
GRANT INSERT, UPDATE, DELETE ON public.equipos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.puntos_inspeccion TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.puntos_inspeccion_id_seq TO authenticated;

CREATE POLICY "auth insert equipos" ON public.equipos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update equipos" ON public.equipos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete equipos" ON public.equipos FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth insert puntos" ON public.puntos_inspeccion FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update puntos" ON public.puntos_inspeccion FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete puntos" ON public.puntos_inspeccion FOR DELETE TO authenticated USING (true);
