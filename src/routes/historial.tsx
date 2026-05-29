import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/historial")({
  component: HistorialPage,
});

function HistorialPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Array<{ id: string; fecha: string; semana: number; tecnico: string | null; estado: string }>>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("inspecciones").select("id,fecha,semana,tecnico,estado").order("fecha", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [user]);

  return (
    <AppShell title="Historial">
      <h2 className="text-xl font-bold mb-1">Mis revisiones</h2>
      <p className="text-sm text-muted-foreground mb-4">{rows.length} registros</p>
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground glass rounded-xl">
            <Calendar className="size-8 mx-auto mb-2 opacity-50" />
            Sin revisiones registradas.
          </div>
        )}
        {rows.map((r) => (
          <Link key={r.id} to="/inspeccion/$id" params={{ id: r.id }}
            className="glass rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition">
            <div>
              <p className="font-semibold">Semana {r.semana}</p>
              <p className="text-xs text-muted-foreground font-mono">{r.fecha} · {r.tecnico ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                r.estado === "finalizado" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
              }`}>{r.estado}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
