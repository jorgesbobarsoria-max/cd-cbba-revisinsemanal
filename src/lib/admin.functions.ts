import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: ReturnType<typeof requireSupabaseAuth extends never ? never : any>["_type"] extends never ? any : any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("No se pudo verificar permisos");
  if (!data) throw new Error("Forbidden: solo administradores");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, must_change_password, is_active, created_at")
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    const { data: rolesRows, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const rolesByUser: Record<string, string[]> = {};
    (rolesRows ?? []).forEach((r) => {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    });

    // Enriquecer con last_sign_in_at desde auth.admin
    const { data: authList, error: aErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (aErr) throw new Error(aErr.message);
    const authByUser: Record<string, { last_sign_in_at: string | null; banned_until: string | null }> = {};
    authList.users.forEach((u) => {
      authByUser[u.id] = {
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
      };
    });

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      must_change_password: p.must_change_password,
      is_active: p.is_active,
      created_at: p.created_at,
      roles: rolesByUser[p.id] ?? [],
      last_sign_in_at: authByUser[p.id]?.last_sign_in_at ?? null,
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(128),
        full_name: z.string().trim().max(120).optional(),
        role: z.enum(["admin", "tecnico", "viewer"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name ?? null,
        must_change_password: true,
        role: data.role,
      },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("No se pudo crear el usuario");

    // El trigger handle_new_user crea el profile y asigna el rol desde user_metadata.
    // Aseguramos consistencia:
    await supabaseAdmin
      .from("profiles")
      .update({
        email: data.email,
        full_name: data.full_name ?? null,
        must_change_password: true,
        is_active: true,
      })
      .eq("id", created.user.id);

    // Rehacer roles a exactamente el rol elegido
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    return { id: created.user.id };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "tecnico", "viewer"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Prevenir que un admin se auto-degrade y deje al sistema sin admins
    if (data.user_id === context.userId && data.role !== "admin") {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("No puedes quitarte el rol admin: eres el único administrador");
      }
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ user_id: z.string().uuid(), is_active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.user_id === context.userId && !data.is_active) {
      throw new Error("No puedes desactivarte a ti mismo");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ban / unban via auth admin
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.is_active ? "none" : "876000h", // ~100 años
    });
    if (banErr) throw new Error(banErr.message);

    await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.user_id);

    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("No puedes eliminarte a ti mismo");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        user_id: z.string().uuid(),
        new_password: z.string().min(6).max(128),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", data.user_id);
    return { ok: true };
  });

export const markPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Cualquier usuario autenticado marca SU propio flag como falso.
    const { error } = await context.supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
