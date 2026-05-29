import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Server, Wind, Battery, Zap, Flame, Thermometer, Activity } from "lucide-react";

export const Route = createFileRoute("/equipos")({
  component: EquiposPage,
});

const iconCat: Record<string, React.ElementType> = {
  "Aire de Precisión": Wind, UPS: Battery, ATS: Zap,
  "Grupo Generador": Zap, "Sup. Incendios": Flame, "Sensores Sala": Thermometer,
};

function EquiposPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [eq, setEq] = useState<Array<{ id: string; categoria: string; tag: string; marca: string | null; modelo: string | null; capacidad: string | null; ubicacion: string | null; criticidad: string | null; redundancia: string | null; estado: string | null }>>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);
  useEffect(() => { supabase.from("equipos").select("*").order("orden").then(({ data }) => setEq(data ?? [])); }, []);

  const groups = eq.reduce<Record<string, typeof eq>>((acc, e) => { (acc[e.categoria] ||= []).push(e); return acc; }, {});

  return (
    <AppShell title="Equipos">
      <h2 className="text-xl font-bold mb-1">Catálogo crítico</h2>
      <p className="text-sm text-muted-foreground mb-5">{eq.length} equipos inventariados</p>

      {Object.entries(groups).map(([cat, items]) => {
        const Icon = iconCat[cat] ?? Server;
        return (
          <section key={cat} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="size-4 text-primary" />
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{cat}</h3>
            </div>
            <div className="space-y-2">
              {items.map((e) => (
                <div key={e.id} className="glass rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{e.tag} <span className="text-muted-foreground font-mono text-xs">· {e.id}</span></p>
                      <p className="text-xs text-muted-foreground">{e.marca} {e.modelo} · {e.capacidad}</p>
                      <p className="text-xs text-muted-foreground mt-1">{e.ubicacion}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        e.criticidad === "Crítica" ? "bg-fail/15 text-fail" : e.criticidad === "Alta" ? "bg-warn/15 text-warn" : "bg-muted/30 text-muted-foreground"
                      }`}>{e.criticidad}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{e.redundancia} · {e.estado}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <div className="h-4" />
      <Activity className="hidden" />
    </AppShell>
  );
}
