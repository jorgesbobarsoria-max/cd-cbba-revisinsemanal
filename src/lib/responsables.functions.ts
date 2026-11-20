import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarResponsables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: activo, error: activeError } = await context.supabase.rpc("es_usuario_activo");
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (activeError || roleError || !activo || !roles?.length) throw new Error("No tienes permiso para consultar responsables");
    // Directorio acotado para selección, nunca expone email ni atributos privados.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("profiles").select("id, full_name, cargo").eq("is_active", true).order("full_name");
    if (error) throw new Error("No se pudieron cargar los responsables");
    return (data ?? []).filter(p => p.full_name?.trim()).map(p => ({ id: p.id, nombre: p.full_name?.trim() ?? "", cargo: p.cargo ?? "" }));
  });