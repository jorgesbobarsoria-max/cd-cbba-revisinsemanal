import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trash2, FileText, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getPlantilla } from "@/lib/mantenimiento-plantillas";
import { generarInformeMantenimientoWord, type PlantillaInforme } from "@/lib/reporte-mantenimiento.functions";
import { PlantillaInformeSelector } from "@/components/plantilla-informe-selector";

export const Route = createFileRoute("/mantenimiento/$id")({
  component: DetallePage,
});

function DetallePage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [dl, setDl] = useState(false);
  const generar = useServerFn(generarInformeMantenimientoWord);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("mantenimientos").select("*").eq("id", id).single();
      if (error) toast.error(error.message);
      setRow(data); setBusy(false);
    })();
  }, [id]);

  async function descargar() {
    setDl(true);
    try {
      const { base64, filename } = await generar({ data: { ids: [id] } });
      const bin = atob(base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("Informe descargado");
    } catch (e: any) { toast.error(e.message ?? "Error al generar"); }
    setDl(false);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este mantenimiento?")) return;
    const { error } = await supabase.from("mantenimientos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminado");
    nav({ to: "/mantenimiento" });
  }

  if (busy) return <AppShell title="Mantenimiento"><p className="text-sm text-muted-foreground">Cargando…</p></AppShell>;
  if (!row) return <AppShell title="Mantenimiento"><p className="text-sm text-muted-foreground">No encontrado.</p></AppShell>;

  const plantilla = getPlantilla(row.tipo);
  const target = row.equipo_id ?? row.equipo_externo?.tag ?? row.equipo_externo?.modelo ?? "—";
  const datos: Record<string, any> = row.datos ?? {};

  return (
    <AppShell title="Mantenimiento">
      <div className="flex items-center justify-between mb-4">
        <Link to="/mantenimiento" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Volver
        </Link>
        <Button size="sm" variant="outline" onClick={eliminar} className="text-fail hover:text-fail">
          <Trash2 className="size-3.5" /> Eliminar
        </Button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{plantilla?.icon ?? "🛠️"}</span>
          <h2 className="text-lg font-bold">{plantilla?.nombre ?? row.tipo}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{target} · {row.fecha} · {row.tecnico ?? "—"}</p>
        <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${row.estado === "finalizado" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>{row.estado}</span>
      </div>

      <section className="glass rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1.5"><FileDown className="size-4 text-primary" /> Informe técnico Word</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Incluye ficha del equipo, parámetros, tendencias históricas, conclusiones y recomendaciones.</p>
        </div>
        <Button size="sm" onClick={descargar} disabled={dl}>
          {dl ? <><Loader2 className="size-4 animate-spin" /> Generando…</> : <><FileDown className="size-4" /> Descargar</>}
        </Button>
      </section>



      <section className="glass rounded-xl p-3.5 mb-4 text-xs space-y-1">
        <Linea l="Empresa" v={row.empresa} />
        <Linea l="Ciudad" v={row.ciudad} />
        <Linea l="Dirección" v={row.direccion} />
        <Linea l="Actividad" v={row.actividad} />
        <Linea l="Proyecto" v={row.proyecto} />
        <Linea l="Cargo" v={row.cargo} />
      </section>

      {plantilla?.secciones.map(sec => (
        <section key={sec.titulo} className="glass rounded-xl p-3.5 mb-3">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">{sec.titulo}</h3>
          <div className="space-y-1.5">
            {sec.items.map(it => {
              const v = datos[it.k];
              const shown = Array.isArray(v) ? v.filter(Boolean).join(" / ") : (v ?? "");
              const empty = shown === "" || shown == null;
              return (
                <div key={it.k} className="flex items-start justify-between gap-3 text-xs border-b border-border/40 pb-1.5 last:border-0">
                  <span className="text-muted-foreground flex-1">{it.l}</span>
                  <span className={empty ? "text-muted-foreground/50" : "font-medium"}>{empty ? "—" : `${shown}${it.u ? ` ${it.u}` : ""}`}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {row.observaciones && (
        <section className="glass rounded-xl p-3.5 mb-3">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1 flex items-center gap-1"><FileText className="size-3.5" /> Observaciones</h3>
          <p className="text-sm whitespace-pre-wrap">{row.observaciones}</p>
        </section>
      )}
    </AppShell>
  );
}

function Linea({ l, v }: { l: string; v: any }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{l}</span>
      <span className={v ? "font-medium" : "text-muted-foreground/50"}>{v || "—"}</span>
    </div>
  );
}
