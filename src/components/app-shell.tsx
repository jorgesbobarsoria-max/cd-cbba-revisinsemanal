import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, History, Server, LogOut, Wrench, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

const baseItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/equipos", icon: Server, label: "Equipos" },
  { to: "/mantenimiento", icon: Wrench, label: "Mant." },
  { to: "/historial", icon: History, label: "Historial" },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { isAdmin, mustChangePassword, loading, user } = useProfile();

  // Forzar cambio de contraseña en el primer inicio de sesión
  useEffect(() => {
    if (loading || !user) return;
    if (mustChangePassword && loc.pathname !== "/cambiar-password") {
      nav({ to: "/cambiar-password" });
    }
  }, [mustChangePassword, loading, user, loc.pathname, nav]);

  const items = isAdmin
    ? [...baseItems, { to: "/admin", icon: Shield, label: "Admin" }]
    : baseItems;

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-primary/15 border border-primary/40 grid place-items-center">
            <Server className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Data Center · CBBA</p>
            <h1 className="text-sm font-semibold leading-tight">{title ?? "Revisión Semanal"}</h1>
          </div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="size-9 rounded-xl bg-secondary hover:bg-muted grid place-items-center"
          aria-label="Salir"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="flex-1 px-4 py-5">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-border/60">
        <div className={cn("max-w-md mx-auto grid", items.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
          {items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <it.icon className={cn("size-5", active && "drop-shadow-[0_0_8px_oklch(0.78_0.17_175_/_0.6)]")} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
