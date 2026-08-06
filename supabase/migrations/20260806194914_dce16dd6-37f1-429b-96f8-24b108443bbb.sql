GRANT EXECUTE ON FUNCTION public.user_owns_evidencia_parent(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_inspeccion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_inspeccion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;