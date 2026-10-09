import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, History, Server, LogOut, Wrench, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const baseItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/equipos", icon: Server, label: "Equipos" },
  { to: "/mantenimiento", icon: Wrench, label: "Mantenim." },
  { to: "/diagnostico", icon: Sparkles, label: "IA" },
  { to: "/historial", icon: History, label: "Historial" },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { isAdmin, mustChangePassword, loading, user, etiquetaRol, permisos } = useProfile();

  // Forzar cambio de contraseña en el primer inicio de sesión
  useEffect(() => {
    if (loading || !user) return;
    if (mustChangePassword && loc.pathname !== "/cambiar-password") {
      nav({ to: "/cambiar-password" });
    }
  }, [mustChangePassword, loading, user, loc.pathname, nav]);

  const items = [
    ...baseItems.filter((it) => it.to !== "/diagnostico" || isAdmin),
    ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-30 glass px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="size-9 shrink-0 rounded-xl bg-primary/15 border border-primary/40 grid place-items-center">
            <Server className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Data Center · CBBA</p>
            <h1 className="truncate text-sm font-semibold leading-tight">{title ?? "Revisión Semanal"}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user && !loading && (
            <span
              title={`Sesión con permisos de ${etiquetaRol}`}
              className={cn(
                "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-semibold",
                permisos.esAdmin
                  ? "bg-primary/15 text-primary border-primary/40"
                  : permisos.esTecnico
                    ? "bg-warn/15 text-warn border-warn/40"
                    : "bg-muted/40 text-muted-foreground border-border",
              )}
            >
              {etiquetaRol}
            </span>
          )}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => supabase.auth.signOut()}
          className="size-9 rounded-xl bg-secondary hover:bg-muted grid place-items-center"
          aria-label="Salir"
        >
          <LogOut className="size-4" />
        </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">{children}</main>

      <nav aria-label="Navegación principal" className="fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-lg mx-auto grid grid-flow-col auto-cols-fr px-1">
          {items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            return (
              <Button asChild variant="ghost" key={it.to} className={cn(
                "h-16 min-w-0 rounded-none px-0.5 py-2",
                active ? "text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary" : "text-muted-foreground hover:text-foreground",
              )}>
              <Link
                key={it.to}
                to={it.to}
                aria-current={active ? "page" : undefined}
                title={it.label === "Mantenim." ? "Mantenimiento" : it.label}
                className="flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-medium transition-colors"
              >
                <it.icon className="size-5 shrink-0" />
                <span className="max-w-full truncate">{it.label}</span>
              </Link>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
