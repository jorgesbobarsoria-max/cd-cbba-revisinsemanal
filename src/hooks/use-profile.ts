import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { permisosDe, ETIQUETA_ROL, type AppRole } from "@/lib/permisos";

export type { AppRole };


export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sitios, setSitios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setSitios([]);
      setMustChangePassword(false);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [{ data: rolesData }, { data: profileData }, { data: sitiosData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("must_change_password, is_active")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_sitios").select("ciudad").eq("user_id", user.id),
      ]);
      if (cancel) return;
      setRoles((rolesData ?? []).map((r) => r.role as AppRole));
      setSitios((sitiosData ?? []).map((s) => s.ciudad as string));
      setMustChangePassword(profileData?.must_change_password ?? false);
      setIsActive(profileData?.is_active ?? true);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user, authLoading]);

  const permisos = permisosDe(roles);

  return {
    user,
    roles,
    sitios,
    permisos,
    rol: permisos.rol,
    etiquetaRol: ETIQUETA_ROL[permisos.rol],
    isAdmin: permisos.esAdmin,
    isTecnico: permisos.esTecnico,
    isViewer: roles.length > 0,
    mustChangePassword,
    isActive,
    loading: authLoading || loading,
  };

}
