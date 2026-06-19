import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Calendar, FileDown, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generarInformeWord } from "@/lib/reporte.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/historial")({
  component: HistorialPage,
});

function HistorialPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Array<{ id: string; fecha: string; semana: number; tecnico: string | null; estado: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const exportar = useServerFn(generarInformeWord);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("inspecciones").select("id,fecha,semana,tecnico,estado").order("fecha", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [user]);

  const descargar = async (id: string) => {
    setBusy(id);
    try {
      const res = await exportar({ data: { inspeccionId: id } });
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Informe Word descargado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell title="Historial">
      <h2 className="text-xl font-bold mb-1">Mis revisiones</h2>
      <p className="text-sm text-muted-foreground mb-4">{rows.length} registros · descarga el informe Word de las finalizadas</p>
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground glass rounded-xl">
            <Calendar className="size-8 mx-auto mb-2 opacity-50" />
            Sin revisiones registradas.
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-xl p-3 flex items-center gap-2">
            <Link to="/inspeccion/$id" params={{ id: r.id }} className="flex-1 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="font-semibold truncate">Semana {r.semana}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{r.fecha} · {r.tecnico ?? "—"}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold mr-2 ${
                r.estado === "finalizado" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
              }`}>{r.estado}</span>
            </Link>
            <button
              onClick={() => descargar(r.id)}
              disabled={busy === r.id}
              title="Descargar informe Word"
              className="shrink-0 size-10 rounded-lg bg-primary/15 border border-primary/30 text-primary grid place-items-center disabled:opacity-50"
            >
              {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            </button>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
